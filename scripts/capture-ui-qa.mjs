import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.env.CUTLAB_UI_URL || "http://localhost:3000";
const onlyCapture = process.env.QA_ONLY || process.argv[2] || "";
const outputDir = resolve("docs/design/qa-artifacts");
const referencePath =
  process.env.CUTLAB_REFERENCE_IMAGE || process.argv[3] || "";
mkdirSync(outputDir, { recursive: true });

const projects = [
  {
    id: "qa-wedding",
    profileId: "video-editor",
    title: "Wedding highlight pass",
    client: "Ethan & Priya",
    status: "In Progress",
    workType: "Job / Salary",
    startDate: "2026-05-28",
    dueDate: "2026-06-16",
    earnings: 0,
    notes: "First assembly and music approval.",
    createdAt: "2026-06-10T08:00:00.000Z",
  },
  {
    id: "qa-retainer",
    profileId: "video-editor",
    title: "Monthly retainer shorts",
    client: "Apex Solutions",
    status: "Review",
    workType: "Job / Salary",
    startDate: "2026-06-03",
    dueDate: "2026-06-15",
    earnings: 0,
    notes: "Client review round 1. Ten clips, captions required.",
    createdAt: "2026-06-09T09:30:00.000Z",
  },
  {
    id: "qa-product",
    profileId: "video-editor",
    title: "Internal product demo",
    client: "CutLab Studio",
    status: "Delivered",
    workType: "Job / Salary",
    startDate: "2026-05-12",
    dueDate: "2026-05-19",
    earnings: 0,
    notes: "Delivered with export presets archived.",
    createdAt: "2026-05-12T07:00:00.000Z",
  },
  {
    id: "qa-cafe",
    profileId: "video-editor",
    title: "Cafe launch cutdown",
    client: "Brew House",
    status: "Revision",
    workType: "Freelance",
    startDate: "2026-06-02",
    dueDate: "2026-06-13",
    earnings: 1400,
    notes: "Awaiting final logo animation and music approval.",
    createdAt: "2026-06-02T11:00:00.000Z",
  },
  {
    id: "qa-brand",
    profileId: "video-editor",
    title: "Brand film masters",
    client: "Momentum Co.",
    status: "Planned",
    workType: "Freelance",
    startDate: "2026-06-14",
    dueDate: "2026-06-23",
    earnings: 3200,
    notes: "Multi-format delivery package.",
    createdAt: "2026-06-13T12:00:00.000Z",
  },
  {
    id: "qa-social",
    profileId: "video-editor",
    title: "Social promos Q2",
    client: "Apex Solutions",
    status: "Planned",
    workType: "Personal Channel",
    startDate: "2026-06-15",
    dueDate: "2026-06-28",
    earnings: 0,
    notes: "Twelve short-form exports.",
    createdAt: "2026-06-14T10:00:00.000Z",
  },
];

const settings = {
  studioName: "CutLab Studio",
  profileName: "Jordan Lee",
  profileUsername: "jordanlee",
  profileTitle: "Video Editor & Storyteller",
  profileBio:
    "Clean, cinematic edits for creators, campaigns, and client stories.",
  profileLocation: "Dubai, UAE",
  profileImageUrl: "",
  publicActiveProjects: 3,
  publicDeliveredEdits: 15,
  publicTurnaroundDays: 5,
  timeZone: "Asia/Dubai",
  dateFormat: "Month Day, Year",
  weekStart: "Mon",
  currencyCode: "INR",
  customClients: [
    "Ethan & Priya",
    "Apex Solutions",
    "Brew House",
    "Momentum Co.",
  ],
  projectTags: ["Job / Salary", "Freelance", "Personal Channel"],
  salaryWorkType: "Job / Salary",
  salaryBatchSize: 20,
  salaryBatchAmount: 10000,
  projectStages: ["Planned", "In Progress", "Review", "Delivered"],
  notifications: {
    "Project updates": true,
    "Feedback received": true,
    "Upcoming deadlines": true,
    Mentions: true,
    "Weekly summary": false,
  },
  integrations: {
    "Google Drive": false,
    Dropbox: false,
    Slack: false,
    "Frame.io": false,
  },
  integrationAccounts: {},
  integrationConfigs: {},
  integrationLinks: {},
  teamRole: "Owner",
  teamMembers: [],
  editorPermissions: {},
  rolePermissions: {},
  theme: "Light",
  accentColor: "#3478F6",
};

const browser = await chromium.launch({ headless: true });

async function capture({
  name,
  path,
  viewport,
  theme = "Light",
  fullPage = true,
}) {
  const context = await browser.newContext({
    viewport,
    colorScheme: theme === "Dark" ? "dark" : "light",
    deviceScaleFactor: 1,
  });
  await context.addInitScript(
    ({ seededProjects, seededSettings, selectedTheme }) => {
      localStorage.setItem("cutlab-studio:auth-mode:v1", "local");
      localStorage.setItem(
        "video-editing-work-tracker:v1",
        JSON.stringify(seededProjects)
      );
      localStorage.setItem(
        "video-editing-work-tracker:settings:v1",
        JSON.stringify({ ...seededSettings, theme: selectedTheme })
      );
    },
    { seededProjects: projects, seededSettings: settings, selectedTheme: theme }
  );
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    errors.push(
      `requestfailed: ${request.url()} (${failure?.errorText ?? "unknown"})`
    );
  });
  await page.goto(`${baseUrl}${path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  const localModeButton = page
    .getByRole("button", { name: /continue locally|use local|local mode/i })
    .first();
  if (await localModeButton.isVisible().catch(() => false)) {
    await localModeButton.click();
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(2_000);
  if (path === "/calendar") {
    await page
      .getByRole("heading", { name: "Calendar" })
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => undefined);
    await page
      .getByRole("button", { name: /previous month/i })
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => undefined);
  }
  await page.screenshot({ path: resolve(outputDir, `${name}.png`), fullPage });
  const state = await page.evaluate(() => ({
    projectStorageCount: JSON.parse(
      localStorage.getItem("video-editing-work-tracker:v1") ?? "[]"
    ).length,
    renderedProjectRows: document.querySelectorAll("tbody tr").length,
    calendarDayCells:
      location.pathname === "/calendar"
        ? document.querySelectorAll("main section button[aria-label^='Select']")
            .length
        : 0,
    calendarText:
      location.pathname === "/calendar"
        ? (document
            .querySelector("main section")
            ?.textContent?.trim()
            .slice(0, 160) ?? "")
        : "",
    calendarSectionHtml:
      location.pathname === "/calendar"
        ? (document.querySelector("main section")?.innerHTML.slice(0, 500) ??
          "")
        : "",
  }));
  console.log(
    `${name}: ${viewport.width}x${viewport.height}, errors=${errors.length}, state=${JSON.stringify(state)}`
  );
  if (errors.length) console.log(errors.join("\n"));
  await context.close();
}

const captures = [
  {
    name: "dashboard-light-desktop",
    path: "/",
    viewport: { width: 1440, height: 1024 },
    theme: "Light",
  },
  {
    name: "dashboard-dark-desktop",
    path: "/",
    viewport: { width: 1440, height: 1024 },
    theme: "Dark",
  },
  {
    name: "dashboard-light-mobile",
    path: "/",
    viewport: { width: 390, height: 844 },
    theme: "Light",
  },
  {
    name: "projects-light-desktop",
    path: "/projects",
    viewport: { width: 1440, height: 1024 },
    theme: "Light",
  },
  {
    name: "calendar-light-desktop",
    path: "/calendar",
    viewport: { width: 1440, height: 1024 },
    theme: "Light",
  },
  {
    name: "timeline-light-desktop",
    path: "/timeline",
    viewport: { width: 1440, height: 1024 },
    theme: "Light",
  },
  {
    name: "media-light-desktop",
    path: "/media",
    viewport: { width: 1440, height: 1024 },
    theme: "Light",
  },
  {
    name: "resources-dark-desktop",
    path: "/resources",
    viewport: { width: 1440, height: 1024 },
    theme: "Dark",
  },
  {
    name: "reports-light-desktop",
    path: "/reports",
    viewport: { width: 1440, height: 1024 },
    theme: "Light",
  },
  {
    name: "settings-dark-desktop",
    path: "/settings",
    viewport: { width: 1440, height: 1024 },
    theme: "Dark",
  },
];

for (const entry of captures) {
  if (!onlyCapture || onlyCapture === entry.name) await capture(entry);
}

const implementationPath = resolve(outputDir, "dashboard-light-desktop.png");

if (
  (!onlyCapture || onlyCapture === "dashboard-light-desktop") &&
  existsSync(referencePath) &&
  existsSync(implementationPath)
) {
  const context = await browser.newContext({
    viewport: { width: 1500, height: 640 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const reference = readFileSync(referencePath).toString("base64");
  const implementation = readFileSync(implementationPath).toString("base64");
  await page.setContent(`
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 20px; background: #e8ebef; color: #171a21; font: 13px Arial, sans-serif; }
      main { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      figure { margin: 0; overflow: hidden; border: 1px solid #cbd1da; border-radius: 8px; background: white; }
      figcaption { padding: 10px 12px; border-bottom: 1px solid #e1e5eb; font-weight: 700; }
      img { display: block; width: 100%; height: auto; }
    </style>
    <main>
      <figure><figcaption>Selected Precision Workspace reference</figcaption><img src="data:image/png;base64,${reference}" /></figure>
      <figure><figcaption>Current implementation</figcaption><img src="data:image/png;base64,${implementation}" /></figure>
    </main>
  `);
  await page.screenshot({
    path: resolve(outputDir, "dashboard-reference-comparison.png"),
    fullPage: true,
  });
  await context.close();
}

await browser.close();
console.log(outputDir);
