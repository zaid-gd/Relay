import { spawn, spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const startupTimeoutMs = 30_000;
const configuredBaseUrl = process.env.CUTLAB_UI_URL;
const workspaceRoutes = [
  ["/", "Good to see you, Jordan.", "data-index"],
  ["/projects", "Projects", "data-index"],
  ["/calendar", "Calendar", "canvas"],
  ["/timeline", "Delivery timeline", "data-index"],
  ["/clients", "Clients", "master-detail"],
  ["/feedback", "Feedback", "master-detail"],
  ["/media", "Media", "master-detail"],
  ["/resources", "Resources", "library"],
  ["/templates", "Templates", "library"],
  ["/integrations", "Integrations", "library"],
  ["/reports", "Reports", "data-index"],
  ["/team", "Team", "administration"],
  ["/team-chat", "Team Chat", "conversation"],
  ["/settings", "Settings", "administration"],
  ["/account", "Account Settings", "administration"],
  ["/organization", "Organization Profile", "administration"],
  ["/profile/edit", "Edit Profile", "administration"],
];
let server;
let baseUrl = configuredBaseUrl;

if (!baseUrl) {
  const port = await getOpenPort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [join("node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  await waitForServer(baseUrl, () => output);
}

const browser = await chromium.launch({ headless: true });

async function withPage(
  viewport,
  run,
  { seedWorkspace = true, projectCount = 1, clientCount = Math.min(projectCount, 12) } = {},
) {
  const context = await browser.newContext({ viewport, reducedMotion: "no-preference" });
  if (seedWorkspace) await context.addInitScript(({ clientCount, projectCount }) => {
    const clientNames = Array.from(
      { length: clientCount },
      (_, index) => `Client ${index + 1}`,
    );
    localStorage.setItem("cutlab-studio:auth-mode:v1", "local");
    localStorage.setItem("video-editing-work-tracker:settings:v1", JSON.stringify({
      studioName: "Relay",
      profileName: "Jordan Lee",
      profileTitle: "Editor",
      profileImageUrl: "",
      theme: "Dark",
      accentColor: "#14B8A6",
      density: "Comfortable",
      timeZone: "Asia/Dubai",
      weekStart: "Mon",
      currencyCode: "USD",
      salaryBatchSize: 20,
      salaryBatchAmount: 10000,
      salaryWorkType: "Job / Salary",
      customClients: clientNames,
      projectTags: ["Job / Salary", "Freelance"],
      projectStages: ["Planned", "In Progress", "Review", "Delivered"],
      notifications: {},
      integrations: {},
      integrationAccounts: {},
      integrationConfigs: {},
      integrationLinks: {},
      teamRole: "",
      teamMembers: [],
      editorPermissions: {},
      rolePermissions: {},
    }));
    localStorage.setItem("video-editing-work-tracker:v1", JSON.stringify(
      Array.from({ length: projectCount }, (_, index) => ({
        id: `interaction-project-${index + 1}`,
        profileId: "video-editor",
        title: `Interaction test edit ${index + 1}`,
        client: clientNames[index % clientNames.length],
        status: index % 3 === 0 ? "In Progress" : "Delivered",
        workType: "Job / Salary",
        startDate: "2026-06-10",
        dueDate: `2026-06-${String((index % 27) + 1).padStart(2, "0")}`,
        earnings: 0,
        notes: `Review motion pass ${index + 1}.`,
        createdAt: "2026-06-10T09:00:00.000Z",
      })),
    ));
  }, { clientCount, projectCount });

  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  page.setDefaultNavigationTimeout(20_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !text.includes("webpack-hmr")) errors.push(text);
  });

  try {
    await run(page);
    if (errors.length) throw new Error(errors.join("\n"));
  } finally {
    await context.close();
  }
}

async function assertWorkspaceGeometry(page, route, expectedFamily) {
  const geometry = await page.evaluate(() => {
    const main = document.getElementById("main-content");
    const pageRoot = document.querySelector('[data-slot="workspace-page"]');
    const header = document.querySelector('[data-slot="page-header"]');
    const pageContent = document.querySelector('[data-slot="page-content"]');
    const fillBody = document.querySelector(
      '[data-slot="fill-viewport-body"][aria-label], [data-slot="data-table-frame-body"][aria-label]',
    );
    const rect = (element) => element ? {
      left: Math.round(element.getBoundingClientRect().left),
      right: Math.round(element.getBoundingClientRect().right),
      width: Math.round(element.getBoundingClientRect().width),
    } : null;
    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      main: rect(main),
      mainClientLeft: main ? Math.round(main.getBoundingClientRect().left + main.clientLeft) : 0,
      mainClientWidth: main?.clientWidth ?? 0,
      pageRoot: rect(pageRoot),
      header: rect(header),
      family: pageRoot?.getAttribute("data-family") ?? "",
      mode: pageRoot?.getAttribute("data-mode") ?? "",
      hasPageContent: Boolean(pageContent),
      hasFillBody: Boolean(fillBody),
      rootOverflowY: pageRoot ? getComputedStyle(pageRoot).overflowY : "",
      mainOverflowY: main ? getComputedStyle(main).overflowY : "",
    };
  });

  if (!geometry.main || !geometry.pageRoot || !geometry.header || !geometry.hasPageContent) {
    throw new Error(`${route} is missing shared workspace geometry.`);
  }
  if (geometry.family !== expectedFamily) {
    throw new Error(`${route} declares ${geometry.family || "no family"} instead of ${expectedFamily}.`);
  }
  if (geometry.documentWidth > geometry.viewportWidth + 1) {
    throw new Error(`${route} has document-level horizontal overflow.`);
  }
  const expectedWidth = geometry.mainClientWidth;
  const expectedLeft = geometry.mainClientLeft;
  if (Math.abs(geometry.pageRoot.width - expectedWidth) > 1 || Math.abs(geometry.pageRoot.left - expectedLeft) > 1) {
    throw new Error(`${route} does not use the full workspace width.`);
  }
  const leftGutter = geometry.header.left - geometry.pageRoot.left;
  const rightGutter = geometry.pageRoot.right - geometry.header.right;
  if (leftGutter < 12 || leftGutter > 32 || rightGutter < 12 || rightGutter > 32) {
    throw new Error(`${route} has inconsistent workspace gutters: ${leftGutter}px / ${rightGutter}px.`);
  }
  if (!["auto", "scroll"].includes(geometry.mainOverflowY)) {
    throw new Error(`${route} is not using the shell-owned primary scroll viewport.`);
  }
  if (geometry.mode === "fill" && !geometry.hasFillBody) {
    throw new Error(`${route} declares fill mode without a named fill viewport body.`);
  }
  if (geometry.mode === "document" && ["auto", "scroll"].includes(geometry.rootOverflowY)) {
    throw new Error(`${route} introduces a page-owned primary scroll container.`);
  }
}

async function assertApprovedFamilyDesigns(page) {
  const captureDirectory = join(tmpdir(), `frame-desk-workspace-family-designs-${process.pid}`);
  if (process.env.CUTLAB_CAPTURE_FAMILIES === "1") {
    await mkdir(captureDirectory, { recursive: true });
  }

  await page.goto(`${baseUrl}/projects`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: "Projects" }).waitFor();
  const projectThumbnail = page
    .locator('[data-slot="project-thumbnail"][data-thumbnail-kind="video"]:visible')
    .first();
  try {
    await projectThumbnail.waitFor({ state: "visible" });
  } catch {
    const projectRows = await page.locator('[data-testid="project-row"], [data-testid="mobile-project-row"]').count();
    throw new Error(`/projects is missing the approved video-thumbnail project rows (${projectRows} project rows rendered).`);
  }
  if (process.env.CUTLAB_CAPTURE_FAMILIES === "1") {
    await page.getByRole("heading", { level: 2, name: "Project library" }).waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(captureDirectory, "projects-restored.png"), fullPage: true });
  }

  await page.goto(`${baseUrl}/calendar`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: "Calendar" }).waitFor();
  const calendarToolbar = page.locator('[data-slot="page-toolbar"][data-family-toolbar="calendar"]');
  if (await calendarToolbar.count() === 0) {
    throw new Error("/calendar is missing the approved month controls and view toolbar.");
  }
  if (process.env.CUTLAB_CAPTURE_FAMILIES === "1") {
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(captureDirectory, "calendar-restored.png"), fullPage: true });
  }

  await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: "Settings" }).waitFor();
  const settingsNavigation = page.locator('[data-slot="settings-navigation"][data-navigation-kind="icon-index"]');
  if (await settingsNavigation.count() === 0) {
    throw new Error("/settings is missing the approved icon-based settings index.");
  }
  await page.getByRole("heading", { level: 2, name: "Workspace profile" }).waitFor();
  await page.getByRole("heading", { level: 2, name: "Production defaults" }).waitFor();
  await settingsNavigation.getByRole("button", { name: "Workflow" }).click();
  await page.getByRole("heading", { level: 2, name: "Project Stages" }).waitFor();
  if (await page.getByRole("heading", { level: 2, name: "Workspace profile" }).count()) {
    throw new Error("/settings keeps every settings panel mounted instead of using the approved section workspace.");
  }
  await settingsNavigation.getByRole("button", { name: "Workspace" }).click();
  await page.getByRole("heading", { level: 2, name: "Workspace profile" }).waitFor();
  if (process.env.CUTLAB_CAPTURE_FAMILIES === "1") {
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(captureDirectory, "settings-restored.png"), fullPage: true });
  }

  for (const [route, selector, message] of [
    ["/feedback", '[data-slot="review-detail"]', "Feedback is missing its functional selected-review detail rail."],
    ["/resources", '[data-slot="page-toolbar"][data-family-toolbar="resources"]', "Resources is missing its library toolbar."],
    ["/templates", '[data-slot="template-card"]', "Templates is missing its visual template-card library."],
    ["/integrations", '[data-slot="page-toolbar"][data-family-toolbar="integrations"]', "Integrations is missing its grouped library toolbar."],
    ["/account", '[data-family-region="account-administration"]', "Account is missing its administration-family composition."],
  ]) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    if (await page.locator(selector).count() === 0) throw new Error(message);
  }
}

async function assertInnerWorkspaceScroll(page, route, heading, scrollLabel) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: heading }).waitFor();
  await page.locator(`[aria-label="${scrollLabel}"]`).first().waitFor();
  await page.waitForTimeout(350);

  const result = await page.evaluate((label) => {
    const main = document.getElementById("main-content");
    const candidates = Array.from(document.querySelectorAll(`[aria-label="${CSS.escape(label)}"]`));
    const target = candidates.find((element) => {
      const style = getComputedStyle(element);
      return ["auto", "scroll"].includes(style.overflowY)
        && element.scrollHeight > element.clientHeight + 8;
    });
    if (!target) {
      return {
        found: false,
        mainScrollTop: main?.scrollTop ?? -1,
        candidates: candidates.map((element) => ({
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
          overflowY: getComputedStyle(element).overflowY,
        })),
      };
    }

    const mainScrollTop = main?.scrollTop ?? 0;
    target.scrollTop = 0;
    target.scrollTop = Math.min(240, target.scrollHeight - target.clientHeight);
    return {
      found: true,
      scrollTop: target.scrollTop,
      mainScrollTop,
      mainScrollTopAfter: main?.scrollTop ?? 0,
      clientHeight: target.clientHeight,
      scrollHeight: target.scrollHeight,
    };
  }, scrollLabel);

  if (!result.found || !("scrollTop" in result) || result.scrollTop <= 0) {
    throw new Error(`${route} does not provide a working inner scroll region named "${scrollLabel}": ${JSON.stringify(result)}`);
  }
  if (result.mainScrollTopAfter !== result.mainScrollTop) {
    throw new Error(`${route} moved the shell viewport while scrolling "${scrollLabel}".`);
  }
}

async function assertDashboardAndProjectInspectorRefinements(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: "Good to see you, Jordan." }).waitFor();
  await page.getByRole("heading", { level: 2, name: "Interaction test edit 1" }).waitFor();
  await page.waitForTimeout(600);

  const dashboardLayout = await page.evaluate(() => {
    const main = document.getElementById("main-content");
    const metricStrip = document.querySelector('[aria-label="Operational pulse"]');
    const ledger = document.querySelector('section[aria-label="Project ledger"]');
    const inspectorHeading = Array.from(document.querySelectorAll("h2"))
      .find((heading) => heading.textContent?.trim() === "Interaction test edit 1");
    const inspector = inspectorHeading?.closest("aside");
    const rect = (element) => {
      const bounds = element?.getBoundingClientRect();
      return bounds ? { top: bounds.top, bottom: bounds.bottom } : null;
    };
    return {
      mainScrollbarWidth: main ? getComputedStyle(main).scrollbarWidth : "",
      metricColumnGap: metricStrip ? getComputedStyle(metricStrip).columnGap : "",
      ledger: rect(ledger),
      inspector: rect(inspector),
    };
  });

  if (dashboardLayout.mainScrollbarWidth !== "none") {
    throw new Error(`Workspace viewport still exposes a native scrollbar: ${dashboardLayout.mainScrollbarWidth || "unknown"}.`);
  }
  if (dashboardLayout.metricColumnGap !== "0px") {
    throw new Error(`Dashboard KPI strip still has separator gaps: ${dashboardLayout.metricColumnGap || "unknown"}.`);
  }
  if (!dashboardLayout.ledger || !dashboardLayout.inspector) {
    throw new Error("Dashboard project ledger or detail inspector could not be measured.");
  }
  if (
    Math.abs(dashboardLayout.ledger.top - dashboardLayout.inspector.top) > 1
    || Math.abs(dashboardLayout.ledger.bottom - dashboardLayout.inspector.bottom) > 1
  ) {
    throw new Error(`Dashboard ledger and inspector are not level: ${JSON.stringify(dashboardLayout)}.`);
  }

  await page.goto(`${baseUrl}/projects`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: "Projects" }).waitFor();
  await page.getByRole("heading", { level: 2, name: "Interaction test edit 1" }).waitFor();
  const projectInspector = await page.evaluate(() => {
    const main = document.getElementById("main-content");
    const inspectorHeading = Array.from(document.querySelectorAll("h2"))
      .find((heading) => heading.textContent?.trim() === "Interaction test edit 1");
    const inspector = inspectorHeading?.closest("aside");
    if (!main || !inspector) return null;
    const mainBounds = main.getBoundingClientRect();
    const inspectorBounds = inspector.getBoundingClientRect();
    inspector.scrollTop = inspector.scrollHeight;
    return {
      mainBottom: mainBounds.bottom,
      inspectorBottom: inspectorBounds.bottom,
      clientHeight: inspector.clientHeight,
      scrollHeight: inspector.scrollHeight,
      scrollTop: inspector.scrollTop,
      overflowY: getComputedStyle(inspector).overflowY,
    };
  });

  if (!projectInspector) throw new Error("Projects detail inspector could not be measured.");
  if (projectInspector.inspectorBottom > projectInspector.mainBottom + 1) {
    throw new Error(`Projects detail inspector is clipped by the workspace viewport: ${JSON.stringify(projectInspector)}.`);
  }
  if (
    !["auto", "scroll"].includes(projectInspector.overflowY)
    || projectInspector.scrollHeight <= projectInspector.clientHeight + 8
    || projectInspector.scrollTop <= 0
  ) {
    throw new Error(`Projects detail inspector does not own working vertical scroll: ${JSON.stringify(projectInspector)}.`);
  }
}

try {
  await withPage({ width: 1440, height: 1000 }, async (page) => {
    console.log("Verifying first-value onboarding and sample isolation...");
    await page.goto(`${baseUrl}/?onboarding=v2`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Choose how to use Relay" }).waitFor();
    const initialProjectData = await page.evaluate(() => localStorage.getItem("video-editing-work-tracker:v1"));
    if (initialProjectData !== null) throw new Error("Fresh onboarding unexpectedly created project storage.");
    await page.getByRole("link", { name: "Open Sample Workspace" }).click();
    await page.waitForURL(/\/sample-studio$/);
    await page.getByRole("complementary", { name: "Sample studio mode" }).waitFor();
    await page.getByRole("heading", { name: "Good to see you, Maya." }).waitFor();
    await page.getByTestId("project-row").first().click();
    await page.getByRole("button", { name: /^Open project / }).click();
    await page.getByTestId("project-detail-dialog").waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    const sampleProjectData = await page.evaluate(() => localStorage.getItem("video-editing-work-tracker:v1"));
    if (sampleProjectData !== null) throw new Error("The sample studio wrote project records to local storage.");
    await page.getByRole("link", { name: "Exit sample" }).click();
    await page.getByRole("heading", { name: "Choose how to use Relay" }).waitFor();
    await page.getByRole("button", { name: "Use Local Mode" }).click();
    await page.getByRole("heading", { name: "Turn one active edit into a clear production plan" }).waitFor();
    await page.getByRole("button", { name: "Show all tools" }).click();
    await page.getByRole("link", { name: "Clients" }).waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Create first project" }).click();
    await page.getByRole("heading", { name: "Create Project" }).waitFor({ state: "visible" });
  }, { seedWorkspace: false });

  await withPage({ width: 390, height: 844 }, async (page) => {
    console.log("Verifying mobile first-value onboarding...");
    await page.goto(`${baseUrl}/?onboarding=v2`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Choose how to use Relay" }).waitFor();
    await page.getByRole("link", { name: "Open Sample Workspace" }).click({ force: true });
    await page.getByRole("complementary", { name: "Sample studio mode" }).waitFor();
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (hasOverflow) throw new Error("Mobile sample studio has document-level horizontal overflow.");
  }, { seedWorkspace: false });

  await withPage({ width: 1440, height: 1000 }, async (page) => {
    console.log("Verifying dashboard and command palette...");
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Good to see you, Jordan." }).waitFor();
    await page.getByRole("button", { name: /filters/i }).click();
    await page.getByPlaceholder("Search the project ledger").fill("Interaction");
    await page.getByTestId("project-row").first().click();

    await page.keyboard.press("Control+K");
    await page.getByPlaceholder("Search pages and actions...").waitFor({ state: "visible" });
    await page.keyboard.press("Escape");

    console.log("Verifying calendar navigation...");
    await page.goto(`${baseUrl}/calendar`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Calendar" }).waitFor();
    await page.getByRole("button", { name: /previous month/i }).click();
    await page.getByRole("button", { name: /next month/i }).click();
    await page.getByRole("button", { name: /today/i }).click();
    await page.getByText(/scheduled deliveries/i).first().waitFor({ state: "visible" });

    console.log("Verifying media view and selection...");
    await page.goto(`${baseUrl}/media`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Grid view" }).click();
    await page.getByText("Interaction test edit").first().click();
  });

  await withPage({ width: 390, height: 844 }, async (page) => {
    console.log("Verifying mobile navigation and project inspector...");
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Good to see you, Jordan." }).waitFor();
    await page.getByRole("button", { name: "New project" }).click();
    await page.getByRole("heading", { name: "Create Project" }).waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await page.getByTestId("mobile-project-row").first().click();
    await page.getByRole("dialog", { name: "Project details" }).waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /more workspace pages/i }).click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "Projects", exact: true }).click();
    await page.waitForURL("**/projects");
  });

  await withPage({ width: 1280, height: 900 }, async (page) => {
    console.log("Verifying theme and reduced-motion preference...");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded" });
    const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!reduced) throw new Error("Reduced-motion media preference was not applied.");
    await page.locator('[data-slot="settings-navigation"]').getByRole("button", { name: "Appearance" }).click();
    await page.getByRole("button", { name: "Dark" }).click();
    await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
  });

  await withPage({ width: 1280, height: 900 }, async (page) => {
    console.log("Verifying every authenticated workspace route uses shared geometry...");
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    for (const [route, heading, family] of workspaceRoutes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { level: 1, name: heading }).waitFor();
      await assertWorkspaceGeometry(page, route, family);
    }

    console.log("Verifying approved representative page-family designs...");
    await assertApprovedFamilyDesigns(page);
  });

  await withPage({ width: 1440, height: 900 }, async (page) => {
    console.log("Verifying dense workspace panes own their scrolling...");
    await assertInnerWorkspaceScroll(page, "/projects", "Projects", "Scrollable project library");
    await assertInnerWorkspaceScroll(page, "/media", "Media", "Scrollable media packages");
    await assertInnerWorkspaceScroll(page, "/clients", "Clients", "Scrollable client project history");
    console.log("Verifying shell, Dashboard alignment, KPI strip, and Projects inspector refinements...");
    await assertDashboardAndProjectInspectorRefinements(page);
  }, { projectCount: 48, clientCount: 1 });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ]) {
    await withPage(viewport, async (page) => {
      console.log(`Verifying representative layout families at ${viewport.width}px...`);
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      for (const [route, heading, family] of [
        ["/projects", "Projects", "data-index"],
        ["/calendar", "Calendar", "canvas"],
        ["/settings", "Settings", "administration"],
      ]) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
        await page.getByRole("heading", { level: 1, name: heading }).waitFor();
        await assertWorkspaceGeometry(page, route, family);
      }
    });
  }
  console.log("UI interactions and shared workspace geometry verified across all authenticated routes and responsive acceptance widths.");
} finally {
  await browser.close();
  if (server && !server.killed) await stopServer(server);
}

async function getOpenPort() {
  return new Promise((resolve, reject) => {
    const socket = createServer();
    socket.on("error", reject);
    socket.listen(0, () => {
      const address = socket.address();
      if (!address || typeof address === "string") {
        socket.close(() => reject(new Error("Could not allocate a local port.")));
        return;
      }
      const selectedPort = address.port;
      socket.close(() => resolve(selectedPort));
    });
  });
}

async function waitForServer(url, getOutput) {
  const started = Date.now();
  while (Date.now() - started < startupTimeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      // Retry until the server is ready or the startup timeout expires.
    }
    if (server?.exitCode !== null) {
      throw new Error(`Production server exited before UI verification.\n${getOutput()}`);
    }
    await delay(300);
  }
  throw new Error(`Production server did not start within ${startupTimeoutMs / 1000}s.\n${getOutput()}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.kill("SIGTERM");
  await Promise.race([exited, delay(2_000)]);
  if (child.exitCode === null && process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", timeout: 5_000 });
  }
}
