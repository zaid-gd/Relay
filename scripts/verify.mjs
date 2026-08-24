import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const required = [
  ["package.json", '"name": "relay"'],
  ["src/app/globals.css", "--surface-canvas: #000000"],
  ["src/components/workspace-shell.tsx", "Quick Search"],
  ["src/components/workspace-shell.tsx", "Quick create"],
  ["src/app/tracker-app.tsx", "Choose how to use Relay"],
  ["src/app/tracker-app.tsx", "Export backup"],
  ["src/lib/types.ts", "clientId?: string"],
  ["src/lib/workspace-backup.ts", "version: 1"],
];

const forbiddenFiles = ["src/middleware.ts", "src/app/access/page.tsx", "src/app/api/access/route.ts"];
const failures = [];

for (const [file, expected] of required) {
  if (!existsSync(file) || !readFileSync(file, "utf8").includes(expected)) failures.push(`${file} is missing ${expected}`);
}
for (const file of forbiddenFiles) {
  if (existsSync(file)) failures.push(`${file} must stay removed`);
}

const relay = spawnSync(process.execPath, ["scripts/verify-relay-rebuild.mjs"], { encoding: "utf8" });
if (relay.status !== 0) failures.push((relay.stderr || relay.stdout).trim());

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Relay source contract verified.");
