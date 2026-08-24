import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadE2EEnvironment() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      let value = match[2].trim();
      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  }

  if (process.env.CLERK_SECRET_KEY) {
    process.env.E2E_CLERK_USER_EMAIL ??= "cutlab-e2e+clerk_test@example.com";
  }
}

export function cloudE2EAvailable() {
  if (process.env.E2E_LOCAL_ONLY === "1") return false;
  return Boolean(
    process.env.CLERK_SECRET_KEY &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_CONVEX_URL &&
    process.env.E2E_CLERK_USER_EMAIL
  );
}
