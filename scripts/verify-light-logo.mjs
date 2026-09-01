import { chromium } from "@playwright/test";

const baseUrl = process.env.RELAY_UI_URL || "http://localhost:3000";

const browser = await chromium.launch({ headless: true });
for (const theme of ["Light", "Dark"]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript((selectedTheme) => {
    localStorage.setItem("cutlab-studio:auth-mode:v1", "local");
    localStorage.setItem(
      "video-editing-work-tracker:settings:v1",
      JSON.stringify({
        studioName: "Relay",
        profileName: "Jordan Lee",
        profileTitle: "Editor",
        profileImageUrl: "",
        theme: selectedTheme,
        accentColor: "#C6FF00",
      })
    );
  }, theme);

  const page = await context.newPage();
  await page.goto(baseUrl + "/projects", { waitUntil: "networkidle" });
  const logo = page
    .locator(theme === "Light" ? ".brand-logo-light" : ".brand-logo-dark")
    .first();
  await logo.waitFor({ state: "visible" });

  const result = await logo.evaluate((element) => ({
    source: element.getAttribute("src"),
    width: element.naturalWidth,
    height: element.naturalHeight,
  }));
  const expectedAsset =
    theme === "Light"
      ? "/brand/relay/lockup-black.svg"
      : "/brand/relay/lockup-white.svg";
  if (!result.source?.endsWith(expectedAsset)) {
    throw new Error(
      `Expected ${theme.toLowerCase()} mode to use ${expectedAsset}, received ${result.source}.`
    );
  }
  if (!result.width || !result.height) {
    throw new Error(`${theme}-mode logo asset did not load.`);
  }

  const brandLink = page
    .locator('a[aria-label="Go to Relay dashboard"]:visible')
    .first();
  await brandLink.focus();
  const accessibility = await brandLink.evaluate((element) => {
    document.documentElement.style.fontSize = "200%";
    const style = getComputedStyle(element);
    return {
      boxShadow: style.boxShadow,
      outlineStyle: style.outlineStyle,
      hasOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    };
  });
  if (
    accessibility.outlineStyle === "none" &&
    accessibility.boxShadow === "none"
  ) {
    throw new Error(
      `${theme}-mode Relay brand link has no visible focus style.`
    );
  }
  if (accessibility.hasOverflow) {
    throw new Error(`${theme}-mode Relay shell overflows at 200% text size.`);
  }

  console.log(`${theme}-mode logo verified with ${result.source}.`);
  await context.close();
}
await browser.close();
