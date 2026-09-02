import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

const routes = [
  { path: "/", label: "dashboard", expectedText: ["Dashboard"] },
  {
    path: "/projects",
    label: "projects",
    expectedText: ["Projects", "My Projects", "Team Projects"],
  },
  { path: "/calendar", label: "calendar", expectedText: ["Calendar"] },
  { path: "/timeline", label: "timeline", expectedText: ["Delivery timeline"] },
  { path: "/clients", label: "clients", expectedText: ["Clients"] },
  { path: "/feedback", label: "feedback", expectedText: ["Feedback"] },
  { path: "/media", label: "media", expectedText: ["Media"] },
  {
    path: "/resources",
    label: "resources",
    expectedText: ["Resources", "Resource Library", "New Resource"],
  },
  { path: "/templates", label: "templates", expectedText: ["Templates"] },
  {
    path: "/integrations",
    label: "integrations",
    expectedText: ["Integrations"],
  },
  {
    path: "/team",
    label: "team",
    expectedText: ["Team", "Active members"],
  },
  {
    path: "/team-chat",
    label: "team-chat",
    expectedText: ["Team Chat", "Manage Team"],
  },
  {
    path: "/reports",
    label: "reports",
    expectedText: [
      "Reports",
      "Advanced reports",
      "Creator or Team plan required.",
      "View plans",
    ],
  },
  { path: "/settings", label: "settings", expectedText: ["Settings"] },
  { path: "/account", label: "account", expectedText: ["Account Settings"] },
  {
    path: "/organization",
    label: "organization",
    expectedText: ["Organization Profile"],
  },
  {
    path: "/profile/edit",
    label: "profile-edit",
    expectedText: ["Edit Profile"],
  },
  {
    path: "/sample-studio",
    label: "sample-studio",
    expectedText: ["Good to see you"],
  },
  {
    path: "/profile",
    label: "profile",
    expectedText: ["Relay", "Share Profile"],
  },
  {
    path: "/client-portal",
    label: "client-portal",
    expectedText: ["A project link is required"],
  },
  {
    path: "/u/relay-smoke-profile",
    label: "public-profile",
    expectedText: ["Loading public profile"],
  },
  {
    path: "/privacy",
    label: "privacy",
    expectedText: ["Privacy Policy", "Relay"],
  },
  { path: "/terms", label: "terms", expectedText: ["Terms", "Relay"] },
  { path: "/contact", label: "contact", expectedText: ["Contact", "Relay"] },
  {
    path: "/accessibility",
    label: "accessibility",
    expectedText: ["Accessibility", "Relay"],
  },
  {
    path: "/route-that-does-not-exist",
    label: "not-found",
    expectedStatus: 404,
    expectedText: ["Page not found", "Back to Dashboard"],
  },
];
const startupTimeoutMs = 30_000;
const outputDirectory = mkdtempSync(join(tmpdir(), "relay-browser-smoke-"));
class BrowserSmokeSkipped extends Error {}

let server;

try {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    [
      join("node_modules", "next", "dist", "bin", "next"),
      "start",
      "-p",
      String(port),
    ],
    {
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }
  );

  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  await waitForServer(baseUrl, () => output);

  for (const route of routes) {
    const pageResponse = await fetch(`${baseUrl}${route.path}`, {
      signal: AbortSignal.timeout(5_000),
    });
    const expectedStatus = route.expectedStatus ?? 200;
    if (pageResponse.status !== expectedStatus) {
      throw new Error(
        `Browser smoke route ${route.path} returned ${pageResponse.status}; expected ${expectedStatus}.`
      );
    }
    const pageHtml = await pageResponse.text();
    for (const text of route.expectedText) {
      if (!pageHtml.includes(text)) {
        throw new Error(
          `Browser smoke route ${route.path} is missing expected text: ${text}`
        );
      }
    }
  }
  console.log(
    `Browser smoke verified route HTML for ${routes.length} routes against ${baseUrl}.`
  );

  const publicRoutes = [
    "/client-portal",
    "/u/relay-smoke-profile",
    "/privacy",
    "/terms",
    "/contact",
    "/accessibility",
    "/route-that-does-not-exist",
  ];
  const chromiumBrowser = await chromium.launch({ headless: true });
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await chromiumBrowser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    for (const path of publicRoutes) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
      const pageState = await page.evaluate(() => ({
        hasMain: Boolean(document.querySelector("main")),
        horizontalOverflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      }));
      if (!pageState.hasMain || pageState.horizontalOverflow) {
        throw new Error(`Responsive public-page check failed for ${path}.`);
      }
      await page.keyboard.press("Tab");
      if (await page.evaluate(() => document.activeElement === document.body)) {
        throw new Error(`Keyboard focus did not enter ${path}.`);
      }
      const resizedOverflow = await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
        );
      });
      if (resizedOverflow) {
        throw new Error(
          `Two-hundred-percent text resizing overflowed ${path}.`
        );
      }
    }
    await context.close();
  }
  await chromiumBrowser.close();
  console.log(
    "Public Relay pages verified at 1440x1000 and 390x844 with reduced motion and keyboard focus."
  );

  const firefoxPath = findFirefox();
  if (!firefoxPath) {
    skipUnavailableScreenshots("Firefox was not found.");
  }

  if (!canCaptureScreenshot(firefoxPath)) {
    skipUnavailableScreenshots(
      "Firefox headless screenshots are unavailable in this environment."
    );
  }

  for (const route of routes) {
    const screenshotPath = join(outputDirectory, `${route.label}.png`);
    const result = spawnSync(
      firefoxPath,
      [
        "--headless",
        "--window-size=1440,1000",
        "--screenshot",
        screenshotPath,
        `${baseUrl}${route.path}`,
      ],
      { encoding: "utf8", timeout: 30_000, windowsHide: true }
    );

    const dimensions = await waitForPng(screenshotPath);
    if (!dimensions) {
      skipUnavailableScreenshots(
        `Firefox did not create a valid PNG for ${route.path}.\n${result.stderr || result.stdout}`
      );
    }
    if (dimensions.width < 1200 || dimensions.height < 800) {
      throw new Error(
        `Browser screenshot for ${route.path} is unexpectedly small: ${dimensions.width}x${dimensions.height}.`
      );
    }
  }

  console.log(
    `Browser smoke verified ${routes.length} routes with Firefox headless against ${baseUrl}.`
  );
} catch (error) {
  if (error instanceof BrowserSmokeSkipped) {
    console.log(`${error.message.trim()} Skipping browser smoke verification.`);
  } else {
    throw error;
  }
} finally {
  if (server && !server.killed) await stopServer(server);
  rmSync(outputDirectory, { recursive: true, force: true });
}

function findFirefox() {
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
          "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe",
        ]
      : ["firefox"];

  for (const candidate of candidates) {
    if (candidate.includes("\\") && existsSync(candidate)) return candidate;
    if (!candidate.includes("\\")) {
      const result = spawnSync(candidate, ["--version"], {
        encoding: "utf8",
        timeout: 5_000,
      });
      if (result.status === 0) return candidate;
    }
  }

  return "";
}

function canCaptureScreenshot(browserPath) {
  const directory = mkdtempSync(join(tmpdir(), "relay-firefox-preflight-"));
  const screenshotPath = join(directory, "preflight.png");
  try {
    spawnSync(
      browserPath,
      [
        "--headless",
        "--window-size=400,300",
        "--screenshot",
        screenshotPath,
        "about:blank",
      ],
      { encoding: "utf8", timeout: 15_000, windowsHide: true }
    );
    return Boolean(readPngDimensions(screenshotPath));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function skipUnavailableScreenshots(reason) {
  throw new BrowserSmokeSkipped(reason);
}

async function getOpenPort() {
  return new Promise((resolve, reject) => {
    const socket = createServer();
    socket.on("error", reject);
    socket.listen(0, () => {
      const address = socket.address();
      if (!address || typeof address === "string") {
        socket.close(() =>
          reject(new Error("Could not allocate a local port."))
        );
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
      // Keep waiting until the server starts or the timeout expires.
    }
    if (server?.exitCode !== null) {
      throw new Error(
        `Production server exited before browser verification.\n${getOutput()}`
      );
    }
    await delay(300);
  }
  throw new Error(
    `Production server did not start within ${startupTimeoutMs / 1000}s.\n${getOutput()}`
  );
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.kill("SIGTERM");
  await Promise.race([exited, delay(2_000)]);
  if (child.exitCode === null && process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      timeout: 5_000,
    });
  }
}

function readPngDimensions(path) {
  if (!existsSync(path)) return null;
  const bytes = readFileSync(path);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (
    bytes.length < 24 ||
    !signature.every((byte, index) => bytes[index] === byte)
  )
    return null;
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

async function waitForPng(path) {
  const started = Date.now();
  while (Date.now() - started < 2_000) {
    const dimensions = readPngDimensions(path);
    if (dimensions) return dimensions;
    await delay(100);
  }
  return null;
}
