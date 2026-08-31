import { chromium } from "@playwright/test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  appIconSizes,
  brandAccent,
  brandSource,
  brandTargets,
  faviconSizes,
} from "./brand-asset-contract.mjs";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, brandSource);
const fontPath = resolve(
  root,
  "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.woff2"
);
const targets = brandTargets.map((target) => resolve(root, target));

const source = await readFile(sourcePath, "utf8");
const font = (await readFile(fontPath)).toString("base64");
const body = source.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1];
if (!body || !source.includes('viewBox="0 0 100 100"')) {
  throw new Error(
    "The approved Relay mark is missing or has an unexpected view box."
  );
}

const svg = (viewBox, content, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${label}">${content}</svg>\n`;
const mark = (color) =>
  svg("0 0 100 100", `<g color="${color}">${body}</g>`, "Relay mark");
const lockup = (color) =>
  svg(
    "0 0 320 100",
    `<style>@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font})}text{font-family:Geist,sans-serif;font-size:64px;font-weight:600;letter-spacing:-2.6px}</style><g color="${color}">${body}</g><text x="120" y="72" fill="${color}">Relay</text>`,
    "Relay"
  );
const social = svg(
  "0 0 1600 900",
  `<rect width="1600" height="900" fill="#000"/><style>@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font})}.name{font-family:Geist,sans-serif;font-size:126px;font-weight:600;letter-spacing:-5px}.line{font-family:Geist,sans-serif;font-size:42px;font-weight:400;letter-spacing:-1px}</style><g transform="translate(170 260) scale(2.2)" color="${brandAccent}">${body}</g><text class="name" x="430" y="426" fill="#fff">Relay</text><path d="M170 550H1430" stroke="${brandAccent}"/><text class="line" x="170" y="650" fill="#fff">From first cut to final handoff.</text>`,
  "Relay. From first cut to final handoff."
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

async function renderPng(svgSource, width, height, path) {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}img{display:block;width:100%;height:100%}</style><img alt="" src="data:image/svg+xml;base64,${Buffer.from(svgSource).toString("base64")}">`
  );
  await page.locator("img").screenshot({ path, omitBackground: true });
}

for (const target of targets) {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  const files = {
    "mark-black.svg": mark("#000"),
    "mark-white.svg": mark("#fff"),
    "mark-accent.svg": mark(brandAccent),
    "lockup-black.svg": lockup("#000"),
    "lockup-white.svg": lockup("#fff"),
    "lockup-accent.svg": lockup(brandAccent),
    "social-preview.svg": social,
  };
  for (const [name, content] of Object.entries(files)) {
    await writeFile(resolve(target, name), content);
  }
  for (const size of faviconSizes) {
    await renderPng(
      mark(brandAccent),
      size,
      size,
      resolve(target, `favicon-${size}.png`)
    );
  }
  for (const size of appIconSizes) {
    const darkIcon = svg(
      "0 0 100 100",
      `<rect width="100" height="100" fill="#000"/><g transform="translate(14 14) scale(.72)" color="${brandAccent}">${body}</g>`,
      "Relay app icon"
    );
    const lightIcon = svg(
      "0 0 100 100",
      `<rect width="100" height="100" fill="${brandAccent}"/><g transform="translate(14 14) scale(.72)" color="#000">${body}</g>`,
      "Relay app icon"
    );
    await renderPng(
      darkIcon,
      size,
      size,
      resolve(target, `app-icon-dark-${size}.png`)
    );
    await renderPng(
      lightIcon,
      size,
      size,
      resolve(target, `app-icon-light-${size}.png`)
    );
  }
  await renderPng(social, 1600, 900, resolve(target, "social-preview.png"));
}

await browser.close();
console.log(
  `Built Relay brand assets in ${targets.length} public directories.`
);
