import { chromium } from "@playwright/test";

const baseUrl = process.env.FRAME_DESK_UI_URL || "http://localhost:3000";

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(foreground, background) {
  const parse = (value) => {
    if (value.startsWith("#")) {
      const hex = value.slice(1);
      return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
    }
    return value.match(/\d+/g).slice(0, 3).map(Number);
  };
  const foregroundRgb = parse(foreground);
  const backgroundRgb = parse(background);
  const foregroundLuminance = 0.2126 * channel(foregroundRgb[0]) + 0.7152 * channel(foregroundRgb[1]) + 0.0722 * channel(foregroundRgb[2]);
  const backgroundLuminance = 0.2126 * channel(backgroundRgb[0]) + 0.7152 * channel(backgroundRgb[1]) + 0.0722 * channel(backgroundRgb[2]);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

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
const result = await page.evaluate(() => {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  return {
    theme: root.dataset.theme,
    highlight: styles.getPropertyValue("--app-highlight").trim(),
    panel: styles.getPropertyValue("--app-panel").trim(),
  };
});

if (result.theme !== "light") throw new Error("Expected light theme, received " + result.theme + ".");
const ratio = contrastRatio(result.highlight, result.panel);
if (ratio < 4.5) {
  throw new Error("Light-mode highlight contrast is " + ratio.toFixed(2) + ":1 (" + result.highlight + " on " + result.panel + ").");
}

console.log("Light-mode highlight contrast verified at " + ratio.toFixed(2) + ":1.");
await browser.close();
