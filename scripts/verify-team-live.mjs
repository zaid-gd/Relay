import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(".env.local");
const envValues = {};

if (existsSync(envPath)) {
  const envSource = readFileSync(envPath, "utf8");
  for (const line of envSource.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts
      .join("=")
      .trim()
      .replace(/^['"]|['"]$/g, "");
    envValues[key.trim()] = value;
  }
}

const requiredEnv = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CONVEX_URL",
];

const missing = requiredEnv.filter(
  (key) => !process.env[key] && !envValues[key]
);
const hasClerkIssuer = Boolean(
  process.env.CLERK_FRONTEND_API_URL ||
  process.env.CLERK_JWT_ISSUER_DOMAIN ||
  envValues.CLERK_FRONTEND_API_URL ||
  envValues.CLERK_JWT_ISSUER_DOMAIN
);

if (!hasClerkIssuer) {
  missing.push("CLERK_FRONTEND_API_URL or CLERK_JWT_ISSUER_DOMAIN");
}

if (missing.length) {
  console.error("Team live smoke test prerequisites are missing:");
  for (const key of missing) console.error(`- ${key}`);
  console.error(
    "\nAdd these values to .env.local before running the two-account Clerk/Convex smoke test."
  );
  process.exit(1);
}

const authConfigPath = resolve("convex/auth.config.ts");
if (!existsSync(authConfigPath)) {
  console.error("Team live smoke test prerequisites are missing:");
  console.error("- convex/auth.config.ts");
  console.error(
    "\nConvex auth must be configured before Clerk users can access Team mutations and queries."
  );
  process.exit(1);
}

const authConfigSource = readFileSync(authConfigPath, "utf8");
const authConfigChecks = [
  ["providers", "Convex auth providers array"],
  ["clerkIssuerDomain", "Clerk issuer domain wiring"],
  ['applicationID: "convex"', "Convex JWT audience"],
];
const missingAuthConfig = authConfigChecks.filter(
  ([text]) => !authConfigSource.includes(text)
);

if (missingAuthConfig.length) {
  console.error(
    "Convex auth config is present but does not contain the expected Clerk/Convex wiring:"
  );
  for (const [, label] of missingAuthConfig) console.error(`- ${label}`);
  process.exit(1);
}

const checklist = [
  "Start the app with Convex enabled: pnpm dev",
  "In browser session A, sign in as the owner and create a Team workspace.",
  "Invite a second Clerk user by email and copy the six-character invite code.",
  "In browser session B, sign in with the invited email and join using the invite code.",
  "As the owner/editor, create a team project, assign the invited member, and update notes and status.",
  "Confirm session B receives the shared project, assignment notification, status update, activity entry, and project comment without refreshing.",
  "Post a project comment mentioning the other member and confirm the mention notification appears.",
  "Send a Team Chat message mentioning the other member and confirm chat sync plus mention notification.",
  "Change the invited member between Editor and Reviewer. Confirm reviewers can comment and chat but cannot create, edit, assign, or change project stages.",
  "Remove the invited member and confirm the removed account immediately loses projects, chat, notifications, and workspace access.",
];

console.log("Team live smoke prerequisites look configured.");
console.log(
  "\nRun this manual two-account smoke test before marking Team complete:\n"
);
for (const [index, step] of checklist.entries()) {
  console.log(`${index + 1}. ${step}`);
}
