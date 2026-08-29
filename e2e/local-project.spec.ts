import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  chooseLocalMode,
  createProject,
  openApp,
  openProject,
  projectRow,
} from "./helpers";

test("keeps the desktop sidebar collapsed across navigation with a fixed toggle position", async ({
  page,
}) => {
  await chooseLocalMode(page);
  await openApp(page, "/projects");

  const collapse = page.getByRole("button", { name: "Collapse navigation" });
  const expandedBox = await collapse.boundingBox();
  await collapse.click();

  const expand = page.getByRole("button", { name: "Expand navigation" });
  const collapsedBox = await expand.boundingBox();
  if (!expandedBox || !collapsedBox)
    throw new Error("Sidebar toggle was not measurable");
  expect(
    Math.abs(
      expandedBox.y +
        expandedBox.height -
        (collapsedBox.y + collapsedBox.height)
    )
  ).toBeLessThanOrEqual(1);

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("button", { name: "Expand navigation" })
  ).toBeVisible();
});

test("moves the active sidebar indicator between routes", async ({ page }) => {
  await chooseLocalMode(page);
  await openApp(page, "/projects");

  const sidebar = page.locator("aside").first();
  const activeIndicator = '[data-slot="sidebar-active-indicator"]';
  await expect(
    sidebar
      .getByRole("link", { name: "Projects", exact: true })
      .locator(activeIndicator)
  ).toBeVisible();

  await sidebar.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(
    sidebar
      .getByRole("link", { name: "Dashboard", exact: true })
      .locator(activeIndicator)
  ).toBeVisible();
  await expect(sidebar.locator(activeIndicator)).toHaveCount(1);
});

test("uses balanced workspace density without a Density setting", async ({
  page,
}) => {
  await chooseLocalMode(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "video-editing-work-tracker:settings:v1",
      JSON.stringify({ density: "Compact" })
    );
  });
  await openApp(page, "/settings");

  await page.getByRole("button", { name: "Appearance", exact: true }).click();

  await expect(page.getByText("Density", { exact: true })).toHaveCount(0);
  await expect(page.locator("html")).toHaveClass(/relay-density-balanced/);
  await expect(page.locator("html")).not.toHaveClass(/relay-density-compact/);
});

test("switches Calendar views through accessible tabs", async ({ page }) => {
  await chooseLocalMode(page);
  await openApp(page, "/calendar");

  const views = page.getByRole("tablist", { name: "Calendar view" });
  await expect(views.getByRole("tab", { name: "Month" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await views.getByRole("tab", { name: "Week" }).click();
  await expect(page.getByRole("heading", { name: /Week of/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Previous month" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Next month" })).toBeVisible();
});

test("keeps the authenticated workspace UI contract across routes", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await chooseLocalMode(page);
  await page.emulateMedia({ reducedMotion: "reduce" });

  const workspaceRoutes = [
    "/",
    "/projects",
    "/clients",
    "/calendar",
    "/timeline",
    "/files",
    "/media",
    "/feedback",
    "/templates",
    "/resources",
    "/integrations",
    "/reports",
    "/team",
    "/team-chat",
    "/settings",
    "/account",
    "/subscription",
    "/profile/edit",
    "/organization",
  ] as const;

  for (const route of workspaceRoutes) {
    await openApp(page, route);
    await expect(
      page.getByRole("navigation", { name: "Primary navigation" })
    ).toBeVisible();
    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/relay-density-balanced/);
  }

  const profileMenu = page.getByRole("button", { name: "Open profile menu" });
  await profileMenu.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(profileMenu).toBeFocused();

  const transitionDuration = await page
    .getByRole("link", { name: "Projects", exact: true })
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(parseFloat(transitionDuration)).toBeLessThanOrEqual(0.001);

  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, "/projects");
  const more = page.getByRole("button", { name: "Open more workspace pages" });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Workspace" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();

  await openApp(page, "/privacy");
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" })
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Privacy Policy" })
  ).toBeVisible();
});

test("chooses a workspace mode on first entry and remembers Local Mode", async ({
  page,
}) => {
  await openApp(page, "/");

  const welcome = page.getByRole("dialog", { name: "Choose how to use Relay" });
  await expect(
    welcome.getByRole("button", { name: "Use Local Mode" })
  ).toBeVisible();
  await expect(
    welcome.getByRole("button", { name: "Create account" })
  ).toBeVisible();
  await expect(
    welcome.getByRole("link", { name: "Open Sample Workspace" })
  ).toHaveAttribute("href", "/sample-studio");
  await expect(
    welcome.getByText(/clearing site data can remove your work/i)
  ).toBeVisible();

  await welcome.getByRole("button", { name: "Use Local Mode" }).click();
  await expect(welcome).toBeHidden();
  await page.reload();
  await expect(welcome).toBeHidden();
});

test("creates and persists a project in local mode", async ({ page }) => {
  const title = `Local E2E Project ${Date.now()}`;
  await chooseLocalMode(page);
  await openApp(page, "/projects");

  await createProject(page, title);
  await page.reload();
  await expect(projectRow(page, title)).toBeVisible();

  const detail = await openProject(page, title);
  await expect(
    detail.getByText("Created by the Playwright core workflow.")
  ).toBeVisible();
  await expect(
    detail.getByText("E2E Client", { exact: true }).first()
  ).toBeVisible();
});

test("exports and restores a Local Mode backup", async ({ page }) => {
  const title = `Backup Project ${Date.now()}`;
  await chooseLocalMode(page);
  await openApp(page, "/projects");
  await createProject(page, title);
  await page.goto("/settings");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  const backup = await readFile(await download.path());

  await page.evaluate(() => {
    localStorage.removeItem("video-editing-work-tracker:v1");
    localStorage.removeItem("video-editing-work-tracker:settings:v1");
    localStorage.removeItem("video-editing-work-tracker:resources:v1");
    localStorage.removeItem("video-editing-work-tracker:salary-batches:v1");
  });
  await page.reload();
  await page.getByLabel("Choose Relay backup").setInputFiles({
    name: "relay-backup.json",
    mimeType: "application/json",
    buffer: backup,
  });
  await expect(page.getByRole("status")).toContainText("Imported 1 projects");
  await page.goto("/projects");
  await expect(projectRow(page, title)).toBeVisible();
});

test("dismisses the project launcher with Escape and restores focus", async ({
  page,
}) => {
  await chooseLocalMode(page);
  await openApp(page, "/projects");

  const trigger = page
    .getByRole("button", {
      name: /(?:Quick create|New)(?: Personal| Team)? project/i,
    })
    .first();
  await trigger.focus();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "New Project" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("opens the Privacy Policy and Terms of Service from the sidebar", async ({
  page,
}) => {
  await chooseLocalMode(page);
  await openApp(page, "/projects");

  const privacyLink = page.getByRole("link", { name: "Privacy" });
  const termsLink = page.getByRole("link", { name: "Terms" });
  await expect(privacyLink).toHaveAttribute("href", "/privacy");
  await expect(termsLink).toHaveAttribute("href", "/terms");

  await privacyLink.click();
  await expect(
    page.getByRole("heading", { name: "Privacy Policy", level: 1 })
  ).toBeVisible();

  await page.goto("/projects");
  await termsLink.click();
  await expect(
    page.getByRole("heading", { name: "Terms of Service", level: 1 })
  ).toBeVisible();
});

test("uses the Studio Split desktop shell", async ({ page }) => {
  await chooseLocalMode(page);
  await openApp(page, "/projects");

  const sidebar = page.locator("aside").first();
  const topbar = page.locator("header").first();
  const contentSurface = page.getByTestId("workspace-content-surface");
  await expect(sidebar).toBeVisible();
  await expect(topbar).toBeVisible();
  await expect(contentSurface).toBeVisible();

  const sidebarBox = await sidebar.boundingBox();
  const topbarBox = await topbar.boundingBox();
  const contentSurfaceBox = await contentSurface.boundingBox();
  expect(sidebarBox?.width).toBe(240);
  expect(topbarBox?.height).toBe(48);
  expect(topbarBox?.x).toBe(240);
  expect(contentSurfaceBox?.x).toBe(246);
  expect(contentSurfaceBox?.y).toBe(54);
  await expect(
    topbar.getByRole("button", { name: "Quick Search (Ctrl K)" })
  ).toBeVisible();
  await expect(
    topbar.getByRole("link", { name: "Plans & billing" })
  ).toHaveCount(0);
  await expect(
    topbar.getByRole("button", { name: "Quick create project" })
  ).toBeVisible();
  await expect(
    topbar.getByRole("button", { name: "Open profile menu" })
  ).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Team" })).toHaveCount(0);

  const surfaces = await page.evaluate(() => {
    const sidebarElement = document.querySelector("aside");
    const topbarElement = document.querySelector("header");
    const contentSurfaceElement = document.querySelector(
      '[data-testid="workspace-content-surface"]'
    );
    return {
      sidebar: sidebarElement
        ? getComputedStyle(sidebarElement).backgroundColor
        : null,
      sidebarBorder: sidebarElement
        ? getComputedStyle(sidebarElement).borderRightWidth
        : null,
      topbar: topbarElement
        ? getComputedStyle(topbarElement).backgroundColor
        : null,
      topbarBorder: topbarElement
        ? getComputedStyle(topbarElement).borderBottomWidth
        : null,
      contentRadius: contentSurfaceElement
        ? getComputedStyle(contentSurfaceElement).borderTopLeftRadius
        : null,
      contentOverflow: contentSurfaceElement
        ? getComputedStyle(contentSurfaceElement).overflow
        : null,
    };
  });
  expect(surfaces.topbar).toBe(surfaces.sidebar);
  expect(surfaces.sidebarBorder).toBe("0px");
  expect(surfaces.topbarBorder).toBe("0px");
  expect(parseFloat(surfaces.contentRadius ?? "0")).toBe(6);
  expect(surfaces.contentOverflow).toBe("auto");

  await contentSurface.evaluate((element) => {
    const spacer = document.createElement("div");
    spacer.dataset.testid = "shell-scroll-spacer";
    spacer.style.height = "200vh";
    element.appendChild(spacer);
    element.scrollTop = 320;
  });
  await expect
    .poll(() => contentSurface.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  const scrolledSurfaceBox = await contentSurface.boundingBox();
  expect(scrolledSurfaceBox?.x).toBe(246);
  expect(scrolledSurfaceBox?.y).toBe(54);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("shows the compact dashboard overview and links to all projects", async ({
  page,
}) => {
  await chooseLocalMode(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "video-editing-work-tracker:settings:v1",
      JSON.stringify({
        profileName: "Screen",
        currencyCode: "USD",
        salaryWorkType: "Job / Salary",
        salaryBatchSize: 5,
        salaryBatchAmount: 10000,
        projectTags: ["Job / Salary", "Freelance"],
        theme: "Dark",
        accentColor: "#14B8A6",
      })
    );
    window.localStorage.setItem(
      "video-editing-work-tracker:v1",
      JSON.stringify(
        Array.from({ length: 7 }, (_, index) => ({
          id: `dashboard-project-${index + 1}`,
          profileId: "video-editor",
          createdAt: `2026-07-${String(28 - index).padStart(2, "0")}T09:00:00.000Z`,
          title: `Dashboard project ${index + 1}`,
          client: index % 2 ? "Orbit Labs" : "Aperture Coffee",
          status:
            index < 5 ? "Delivered" : index === 5 ? "Revision" : "In Progress",
          workType: "Job / Salary",
          startDate: "2026-07-01",
          dueDate: `2026-07-${String(22 + index).padStart(2, "0")}`,
          earnings: 0,
          notes:
            index === 5
              ? "Client feedback needs attention."
              : "Production checklist is current.",
        }))
      )
    );
    window.localStorage.setItem(
      "video-editing-work-tracker:salary-batches:v1",
      JSON.stringify({
        batches: [
          {
            id: "batch-1",
            number: 1,
            completedDate: "2026-07-28",
            archived: false,
            archivedDate: "",
            amount: 10000,
            paid: false,
            paidDate: "",
          },
        ],
      })
    );
  });
  await openApp(page, "/");

  const search = page.getByRole("textbox", {
    name: "Search dashboard projects",
  });
  const filters = page.getByRole("button", { name: /^Filters/ });
  const searchBox = await search.boundingBox();
  const filterBox = await filters.boundingBox();
  expect(
    Math.abs((searchBox?.y ?? 0) - (filterBox?.y ?? 0))
  ).toBeLessThanOrEqual(5);

  const pulse = page.getByRole("region", { name: "Operational pulse" });
  await expect(pulse).toContainText("Earned");
  await expect(pulse).toContainText("Salary batch");
  await expect(pulse.getByTestId("salary-batch-progress")).toContainText(
    /5\s*\/\s*5 edits/
  );
  const markPayment = pulse.getByRole("button", { name: /Mark payment/ });
  await expect(markPayment).toBeEnabled();

  const ledger = page.getByRole("region", { name: "Project ledger" });
  await expect(ledger.getByTestId("project-row")).toHaveCount(5);
  const viewAll = ledger.getByRole("link", { name: "View all projects" });
  await expect(viewAll).toHaveAttribute("href", "/projects");

  const followUp = page.getByRole("region", { name: "Workspace follow-up" });
  const attentionBox = await followUp
    .getByRole("region", { name: "Attention queue" })
    .boundingBox();
  const activityBox = await followUp
    .getByRole("region", { name: "Activity" })
    .boundingBox();
  expect(attentionBox?.width ?? 0).toBeGreaterThan(500);
  expect(activityBox?.width ?? 0).toBeGreaterThan(500);
  expect(
    Math.abs((attentionBox?.y ?? 0) - (activityBox?.y ?? 0))
  ).toBeLessThanOrEqual(2);

  const contentViewport = page.getByTestId("workspace-content-surface");
  await contentViewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const scrollBeforeActivitySwitch = await contentViewport.evaluate(
    (element) => element.scrollTop
  );
  expect(scrollBeforeActivitySwitch).toBeGreaterThan(0);
  await followUp.getByRole("button", { name: "Team" }).click();
  await expect
    .poll(async () =>
      Math.abs(
        (await contentViewport.evaluate((element) => element.scrollTop)) -
          scrollBeforeActivitySwitch
      )
    )
    .toBeLessThanOrEqual(2);

  await markPayment.click();
  await expect(pulse.getByTestId("salary-batch-progress")).toContainText(
    /0\s*\/\s*5 edits/
  );
  await expect(markPayment).toBeDisabled();
  const storedSalaryBatch = await page.evaluate(() => {
    const stored = JSON.parse(
      window.localStorage.getItem(
        "video-editing-work-tracker:salary-batches:v1"
      ) ?? "{}"
    );
    return stored.batches?.[0] ?? null;
  });
  expect(storedSalaryBatch).toMatchObject({ id: "batch-1", paid: true });
  expect(storedSalaryBatch.paidDate).not.toBe("");

  await viewAll.click();
  await expect(page).toHaveURL(/\/projects$/);
});

test("operates the Projects table by keyboard", async ({ page }) => {
  await chooseLocalMode(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "video-editing-work-tracker:v1",
      JSON.stringify([
        {
          id: "keyboard-a",
          profileId: "video-editor",
          title: "Keyboard Alpha",
          client: "E2E Client",
          clientId: "client-e2e",
          status: "Planned",
          workType: "Freelance",
          startDate: "2026-08-01",
          dueDate: "2026-08-20",
          earnings: 100,
          notes: "",
        },
        {
          id: "keyboard-b",
          profileId: "video-editor",
          title: "Keyboard Beta",
          client: "E2E Client",
          clientId: "client-e2e",
          status: "In Progress",
          workType: "Freelance",
          startDate: "2026-08-01",
          dueDate: "2026-08-21",
          earnings: 200,
          notes: "",
        },
      ])
    );
    window.localStorage.setItem(
      "video-editing-work-tracker:settings:v1",
      JSON.stringify({
        clients: [
          {
            id: "client-e2e",
            name: "E2E Client",
            company: "",
            contactName: "",
            email: "",
            phone: "",
            notes: "",
            archived: false,
          },
        ],
      })
    );
  });
  await openApp(page, "/projects?view=table");

  const table = page.getByRole("table", { name: "Personal project library" });
  await expect(table.getByRole("columnheader", { name: "Name" })).toBeVisible();
  await expect(
    table.getByRole("columnheader", { name: "Client" })
  ).toBeVisible();

  await page.getByRole("tab", { name: "Board", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Editing projects" })
  ).toBeVisible();
  await page.getByRole("tab", { name: "Table", exact: true }).click();
  await expect(table).toBeVisible();

  const rows = table.getByTestId("project-row");
  await expect(rows).toHaveCount(2);

  await rows.first().focus();
  await page.keyboard.press("End");
  await expect(rows.last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(rows.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(rows.last()).toBeFocused();
  await page.keyboard.press("Space");
  await expect(rows.last()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/projects\/keyboard-b(?:\?|$)/);
});

test("moves a Project on the board with the stage menu and pointer drag", async ({
  page,
}) => {
  await chooseLocalMode(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "video-editing-work-tracker:v1",
      JSON.stringify([
        {
          id: "workflow-project",
          profileId: "video-editor",
          title: "Workflow Project",
          client: "E2E Client",
          clientId: "client-e2e",
          status: "Planned",
          workflowStageId: "planned",
          workflowStages: [
            { id: "planned", label: "Planned", purpose: "planned" },
            { id: "editing", label: "Editing", purpose: "editing" },
            {
              id: "client-review",
              label: "Client Review",
              purpose: "client_review",
            },
            { id: "delivered", label: "Delivered", purpose: "delivered" },
          ],
          workType: "Freelance",
          startDate: "2026-08-01",
          dueDate: "2026-08-20",
          earnings: 500,
          notes: "",
        },
      ])
    );
    window.localStorage.setItem(
      "video-editing-work-tracker:settings:v1",
      JSON.stringify({
        currencyCode: "USD",
        salaryWorkType: "Job / Salary",
        clients: [
          {
            id: "client-e2e",
            name: "E2E Client",
            company: "",
            contactName: "",
            email: "",
            phone: "",
            notes: "",
            archived: false,
          },
        ],
      })
    );
  });
  await openApp(page, "/projects?view=board");

  await expect(
    page.getByRole("region", { name: "Editing projects" })
  ).toBeVisible();
  const stageMenu = page.getByRole("button", {
    name: "Change stage for Workflow Project",
  });
  await stageMenu.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: /Editing/ }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("video-editing-work-tracker:v1") ?? "[]"
          )[0]?.workflowStageId
      )
    )
    .toBe("editing");

  const card = page.getByRole("button", { name: /Workflow Project/ }).first();
  const target = page.getByRole("region", { name: "Client Review projects" });
  const cardBox = await card.boundingBox();
  const targetBox = await target.boundingBox();
  if (!cardBox || !targetBox)
    throw new Error("Board drag targets are not visible");
  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 80, {
    steps: 12,
  });
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("video-editing-work-tracker:v1") ?? "[]"
          )[0]?.workflowStageId
      )
    )
    .toBe("client-review");

  await card.focus();
  await page.keyboard.press("Space");
  for (let step = 0; step < 10; step += 1)
    await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Space");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("video-editing-work-tracker:v1") ?? "[]"
          )[0]?.workflowStageId
      )
    )
    .toBe("editing");

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("records $500 as earned");
    await dialog.accept();
  });
  await stageMenu.click();
  await page.getByRole("menuitem", { name: /Delivered/ }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("video-editing-work-tracker:v1") ?? "[]"
          )[0]
      )
    )
    .toMatchObject({
      status: "Delivered",
      workflowStageId: "delivered",
    });
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("video-editing-work-tracker:v1") ?? "[]"
        )[0]?.completedAt
    )
  ).toBeTruthy();

  await stageMenu.click();
  await page.getByRole("menuitem", { name: /Editing/ }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("video-editing-work-tracker:v1") ?? "[]"
        )[0]?.completedAt
    )
  ).toBeUndefined();
});

test("keeps Project Outputs and linked Media Version history separate from Project counts", async ({
  page,
}) => {
  await chooseLocalMode(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "video-editing-work-tracker:v1",
      JSON.stringify([
        {
          id: "outputs-project",
          profileId: "video-editor",
          title: "Outputs Project",
          client: "E2E Client",
          clientId: "client-e2e",
          status: "Planned",
          workflowStageId: "planned",
          workflowStages: [
            { id: "planned", label: "Planned", purpose: "planned" },
            { id: "delivered", label: "Delivered", purpose: "delivered" },
          ],
          workType: "Job / Salary",
          startDate: "2026-08-01",
          dueDate: "2026-08-20",
          earnings: 0,
          notes: "",
          templateDeliverables: [
            {
              title: "Main film",
              category: "Deliverable",
              initialStatus: "draft",
            },
            { title: "Thumbnail", category: "Asset", initialStatus: "draft" },
          ],
        },
      ])
    );
    window.localStorage.setItem(
      "video-editing-work-tracker:settings:v1",
      JSON.stringify({
        salaryWorkType: "Job / Salary",
        clients: [
          {
            id: "client-e2e",
            name: "E2E Client",
            company: "",
            contactName: "",
            email: "",
            phone: "",
            notes: "",
            archived: false,
          },
        ],
      })
    );
  });
  await openApp(page, "/projects/outputs-project?view=outputs");

  const outputs = page.getByRole("region", { name: "Project Outputs" });
  await expect(
    outputs.getByRole("heading", { name: "Main film" })
  ).toBeVisible();
  await expect(
    outputs.getByRole("heading", { name: "Thumbnail" })
  ).toBeVisible();
  const film = outputs.getByRole("article").filter({ hasText: "Main film" });
  await film.getByRole("button", { name: "Media Version" }).click();
  await page
    .getByLabel("YouTube, Vimeo, or link")
    .fill("https://youtu.be/dQw4w9WgXcQ");
  await page.getByLabel("Version label").fill("Client cut");
  await page.getByRole("button", { name: "Add Media Version" }).click();
  await expect(film.getByText("Current: Client cut")).toBeVisible();

  await film.getByRole("button", { name: "Media Version" }).click();
  await page
    .getByLabel("YouTube, Vimeo, or link")
    .fill("https://vimeo.com/123456789");
  await page.getByLabel("Version label").fill("Final review");
  await page.getByRole("button", { name: "Add Media Version" }).click();
  await expect(film.getByText("Current: Final review")).toBeVisible();
  await expect(film.getByText("Version history (2)")).toBeVisible();

  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Project Outputs" })
      .getByText("Current: Final review")
  ).toBeVisible();
  expect(
    await page.evaluate(() => {
      const projects = JSON.parse(
        localStorage.getItem("video-editing-work-tracker:v1") ?? "[]"
      );
      const batches = JSON.parse(
        localStorage.getItem("video-editing-work-tracker:salary-batches:v1") ??
          '{"batches":[]}'
      );
      return {
        projectCount: projects.length,
        status: projects[0]?.status,
        batchCount: batches.batches?.length ?? 0,
      };
    })
  ).toEqual({ projectCount: 1, status: "Planned", batchCount: 0 });
});
