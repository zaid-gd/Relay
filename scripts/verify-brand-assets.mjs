import { chromium } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  appIconSizes,
  brandSource,
  brandTargets,
  faviconSizes,
  vectorViewBoxes,
} from "./brand-asset-contract.mjs";

const root = resolve(import.meta.dirname, "..");
const source = await readFile(resolve(root, brandSource), "utf8");
const sourceBody = source.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1];
const targets = brandTargets.map((target) => resolve(root, target));

async function verifyPublicReferences(sourcePath, publicDirectory) {
  const code = await readFile(resolve(root, sourcePath), "utf8");
  const references = [
    ...code.matchAll(/["`]\/(?!\/)([^"`]+\.(?:png|svg))["`]/g),
  ].map((match) => match[1]);
  for (const reference of references)
    await readFile(resolve(root, publicDirectory, reference));
}

if (
  !sourceBody ||
  !source.includes('viewBox="0 0 100 100"') ||
  !source.includes('id="relay-circular-cutouts"')
) {
  throw new Error("Approved Relay mark contract failed.");
}

function pngDimensions(buffer) {
  if (buffer.toString("ascii", 1, 4) !== "PNG")
    throw new Error("Output is not a PNG.");
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

for (const target of targets) {
  for (const [name, viewBox] of Object.entries(vectorViewBoxes)) {
    const output = await readFile(resolve(target, name), "utf8");
    if (!output.includes(sourceBody))
      throw new Error(`${name} does not contain the approved mark geometry.`);
    if (!output.includes(`viewBox="${viewBox}"`))
      throw new Error(`${name} does not use the expected ${viewBox} view box.`);
  }
  for (const size of faviconSizes) {
    for (const prefix of ["favicon"]) {
      const dimensions = pngDimensions(
        await readFile(resolve(target, `${prefix}-${size}.png`))
      );
      if (dimensions[0] !== size || dimensions[1] !== size)
        throw new Error(`${prefix}-${size}.png has invalid dimensions.`);
    }
  }
  for (const size of appIconSizes) {
    for (const prefix of ["app-icon-dark", "app-icon-light"]) {
      const dimensions = pngDimensions(
        await readFile(resolve(target, `${prefix}-${size}.png`))
      );
      if (dimensions[0] !== size || dimensions[1] !== size)
        throw new Error(`${prefix}-${size}.png has invalid dimensions.`);
    }
  }
  const socialDimensions = pngDimensions(
    await readFile(resolve(target, "social-preview.png"))
  );
  if (socialDimensions[0] !== 1600 || socialDimensions[1] !== 900)
    throw new Error("Social preview must be 1600x900.");
}

const appFiles = (await readdir(targets[0])).sort();
const marketingFiles = (await readdir(targets[1])).sort();
if (appFiles.join("\n") !== marketingFiles.join("\n"))
  throw new Error("App and marketing brand asset file lists differ.");
for (const name of appFiles) {
  const appAsset = await readFile(resolve(targets[0], name));
  const marketingAsset = await readFile(resolve(targets[1], name));
  if (!appAsset.equals(marketingAsset))
    throw new Error(`${name} differs between app and marketing outputs.`);
}

await verifyPublicReferences("src/app/layout.tsx", "public");
await verifyPublicReferences("src/app/manifest.ts", "public");
await verifyPublicReferences("website/app/layout.tsx", "website/public");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 310 } });
const blackMark = await readFile(resolve(targets[0], "mark-black.svg"), "utf8");
const whiteMark = await readFile(resolve(targets[0], "mark-white.svg"), "utf8");
const blackLockup = await readFile(
  resolve(targets[0], "lockup-black.svg"),
  "utf8"
);
const whiteLockup = await readFile(
  resolve(targets[0], "lockup-white.svg"),
  "utf8"
);
const dataUrl = (value) =>
  `data:image/svg+xml;base64,${Buffer.from(value).toString("base64")}`;
const rasterMarkup = await Promise.all(
  appFiles
    .filter((name) => name.endsWith(".png"))
    .map(
      async (name) =>
        `<img class="raster-check" alt="" src="data:image/png;base64,${(await readFile(resolve(targets[0], name))).toString("base64")}">`
    )
);
await page.setContent(
  `<style>body{margin:0;background:#71717a;font-family:Arial,sans-serif}.grid{display:grid;grid-template-columns:1fr 1fr}.sample{height:310px;display:grid;place-items:center;align-content:center;gap:34px}.light{background:#fff}.dark{background:#000}.mark-large{width:120px;height:120px}.mark-small{width:16px;height:16px}.lockup{width:320px;height:100px}.raster-check{display:none}</style><div class="grid"><div class="sample light"><img class="mark-large" alt="Black Relay mark at 120 pixels" src="${dataUrl(blackMark)}"><img class="lockup" alt="Black Relay lockup" src="${dataUrl(blackLockup)}"><img class="mark-small" alt="Black Relay mark at 16 pixels" src="${dataUrl(blackMark)}"></div><div class="sample dark"><img class="mark-large" alt="White Relay mark at 120 pixels" src="${dataUrl(whiteMark)}"><img class="lockup" alt="White Relay lockup" src="${dataUrl(whiteLockup)}"><img class="mark-small" alt="White Relay mark at 16 pixels" src="${dataUrl(whiteMark)}"></div></div>${rasterMarkup.join("")}`
);
await page.locator("img").first().waitFor();
const loadState = await page
  .locator("img")
  .evaluateAll((images) =>
    images.map((image) => [
      image.complete,
      image.naturalWidth,
      image.naturalHeight,
    ])
  );
if (
  loadState.some(
    ([complete, width, height]) => !complete || width < 1 || height < 1
  )
)
  throw new Error("A production SVG failed to load.");
const cutoutIsVisible = await page
  .locator(".mark-small")
  .evaluateAll((images) =>
    images.every((image) => {
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const context = canvas.getContext("2d");
      if (!context) return false;
      context.drawImage(image, 0, 0, 16, 16);
      const centerBand = context.getImageData(3, 6, 10, 4).data;
      const hasCutout = Array.from(
        { length: centerBand.length / 4 },
        (_, index) => centerBand[index * 4 + 3]
      ).some((alpha) => alpha < 64);
      const body = context.getImageData(8, 3, 1, 1).data;
      return hasCutout && body[3] > 200;
    })
  );
if (!cutoutIsVisible)
  throw new Error("The Relay negative-space cut collapsed at 16 pixels.");
const evidenceDirectory = resolve(
  root,
  ".scratch/relay-brand-rollout/evidence"
);
await import("node:fs/promises").then(({ mkdir }) =>
  mkdir(evidenceDirectory, { recursive: true })
);
await page.screenshot({
  path: resolve(evidenceDirectory, "01-relay-mark-16px-light-dark.png"),
});
await browser.close();

console.log(
  "Relay brand asset contract verified in app and marketing public directories."
);
