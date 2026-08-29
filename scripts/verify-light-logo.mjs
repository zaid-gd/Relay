import { chromium } from "@playwright/test";

const baseUrl = process.env.FRAME_DESK_UI_URL || "http://localhost:3000";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  localStorage.setItem("cutlab-studio:auth-mode:v1", "local");
  localStorage.setItem("video-editing-work-tracker:settings:v1", JSON.stringify({
    studioName: "Frame Desk",
    profileName: "Jordan Lee",
    profileTitle: "Editor",
    profileImageUrl: "",
    theme: "Light",
    accentColor: "#14B8A6",
  }));
});

const page = await context.newPage();
await page.goto(baseUrl + "/projects", { waitUntil: "networkidle" });
const logo = page.locator('img[alt="Frame Desk"]').first();
await logo.waitFor({ state: "visible" });

const result = await logo.evaluate((element) => ({
  source: element.getAttribute("src"),
  width: element.naturalWidth,
  height: element.naturalHeight,
}));

const suppliedLightAssets = ["/brand/logo-mark.png", "/brand/favicon.png"];
if (!suppliedLightAssets.some((asset) => result.source?.endsWith(asset))) {
  throw new Error("Expected light mode to use a supplied logo asset, received " + result.source + ".");
}
if (!result.width || !result.height) {
  throw new Error("Light-mode logo asset did not load.");
}

console.log("Light-mode logo verified with " + result.source + ".");
await browser.close();
