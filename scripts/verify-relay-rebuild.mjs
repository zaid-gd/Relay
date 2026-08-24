import { existsSync, readFileSync } from "node:fs";

const failures = [];

function requireText(path, values) {
  if (!existsSync(path)) {
    failures.push(`${path} does not exist.`);
    return;
  }
  const content = readFileSync(path, "utf8").toLowerCase();
  for (const value of values) {
    if (!content.includes(value.toLowerCase())) failures.push(`${path} is missing: ${value}`);
  }
}

requireText("CONTEXT.md", [
  "# Relay",
  "**Workspace**",
  "**Client**",
  "**Project Group**",
  "**Project**",
  "**Project Output**",
  "**Media Version**",
  "**Workflow Template**",
  "**Salary Plan**",
  "**Salary Batch**",
]);

requireText("docs/adr/0001-rebuild-relay-at-capability-seams.md", [
  "route-facing controllers",
  "display-ready models",
  "semantic actions",
  "capability-specific ports",
  "local, sample, Convex, and in-memory adapters",
]);

requireText("docs/adr/0002-start-relay-cloud-data-clean.md", [
  "new cloud records",
  "unread, unmigrated, and undeleted",
]);

requireText("docs/adr/0003-use-relay-name-pending-clearance.md", [
  "formal name clearance",
]);

for (const path of [
  "src/middleware.ts",
  "src/lib/access-wall.ts",
  "src/app/access/page.tsx",
  "src/app/api/access/route.ts",
]) {
  if (existsSync(path)) failures.push(`${path} restores the removed global password gate.`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Relay rebuild contract verified.");
