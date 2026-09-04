/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import migrationsComponent from "@convex-dev/migrations/test";
import { runToCompletion } from "@convex-dev/migrations";
import { describe, expect, test } from "vitest";
import { api, components, internal } from "./_generated/api";
import { CANONICAL_TOKEN_PREFIX, rewriteLegacyIdentity } from "./migrations";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function settings(profileName: string) {
  return {
    studioName: "Studio",
    profileName,
    profileUsername: "owner",
    profileTitle: "",
    profileBio: "",
    profileLocation: "",
    profileImageUrl: "",
    timeZone: "UTC",
    dateFormat: "Month Day, Year",
    weekStart: "Mon",
    currencyCode: "USD",
    clients: [],
    projectTags: [],
    salaryWorkType: "Salary",
    salaryBatchSize: 2,
    salaryBatchAmount: 1000,
    projectStages: [],
    notifications: {},
    teamRole: "" as const,
    teamMembers: [],
    rolePermissions: {},
    integrationConfigs: {},
    theme: "dark",
    accentColor: "#fff",
    density: "compact",
  };
}

describe("rewriteLegacyIdentity", () => {
  test.each([
    ["user_stable", `${CANONICAL_TOKEN_PREFIX}user_stable`],
    [
      "https://relay-dev.cc.cd|user_stable",
      `${CANONICAL_TOKEN_PREFIX}user_stable`,
    ],
    [
      "https://relay-app.cc.cd|user_stable",
      `${CANONICAL_TOKEN_PREFIX}user_stable`,
    ],
    [
      `${CANONICAL_TOKEN_PREFIX}user_stable`,
      `${CANONICAL_TOKEN_PREFIX}user_stable`,
    ],
  ])("normalizes %s to the canonical token identifier", (input, expected) => {
    expect(rewriteLegacyIdentity(input)).toBe(expected);
  });

  test("leaves non-Clerk identifiers unchanged", () => {
    expect(rewriteLegacyIdentity("service-account")).toBe("service-account");
  });
});

test("workspace discovery remains available while duplicate settings are repaired", async () => {
  const t = convexTest(schema, modules);
  const userId = `${CANONICAL_TOKEN_PREFIX}user_stable`;
  await t.run(async (ctx) => {
    await ctx.db.insert("settings", { ...settings("Older"), userId });
    await ctx.db.insert("settings", { ...settings("Newer"), userId });
  });

  const result = await t
    .withIdentity({ tokenIdentifier: userId, subject: "user_stable" })
    .query(api.workspaceDiscovery.list, {});

  expect(result.clients).toEqual([]);
  expect(result.projects).toEqual([]);
});

test("the settings migration leaves one canonical account row", async () => {
  const t = convexTest(schema, modules);
  migrationsComponent.register(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("settings", {
      ...settings("Bare subject"),
      userId: "user_stable",
    });
    await ctx.db.insert("settings", {
      ...settings("Old issuer"),
      userId: "https://relay-app.cc.cd|user_stable",
    });
    await ctx.db.insert("settings", {
      ...settings("Canonical"),
      userId: `${CANONICAL_TOKEN_PREFIX}user_stable`,
    });

    await runToCompletion(
      ctx,
      components.migrations,
      internal.migrations.migrateSettingsIdentityV2
    );

    const rows = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) =>
        q.eq("userId", `${CANONICAL_TOKEN_PREFIX}user_stable`)
      )
      .take(10);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.profileName).toBe("Canonical");
  });
});
