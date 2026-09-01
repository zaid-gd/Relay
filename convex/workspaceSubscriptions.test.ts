/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({
    tokenIdentifier: `test|${userId}`,
    subject: userId,
    name: userId,
  });
}

async function createWorkspace(
  t: ReturnType<typeof convexTest>,
  userId: string,
  name: string
): Promise<Id<"teamWorkspaces">> {
  const workspaceId = await asUser(t, userId).mutation(
    api.team.createWorkspace,
    { name }
  );
  const normalized = await t.run(async (ctx) =>
    ctx.db.normalizeId("teamWorkspaces", workspaceId)
  );
  if (!normalized) throw new Error("Workspace creation returned an invalid ID");
  return normalized;
}

describe("Workspace subscription authority", () => {
  test("new Workspaces provision their Clerk Organization", async () => {
    vi.useFakeTimers();
    vi.stubEnv("CLERK_SECRET_KEY", "test_secret");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 404 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: "org_created" }), { status: 200 })
        )
    );
    const t = convexTest(schema, modules);
    const owner = asUser(t, "owner");

    await owner.mutation(api.team.createWorkspace, { name: "Owner Workspace" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    await expect(
      owner.query(api.workspaceSubscriptions.getCurrent, {})
    ).resolves.toMatchObject({
      clerkOrganizationId: "org_created",
      reconciliationState: "synced",
    });
  });

  test("new Workspaces receive pending Free access", async () => {
    const t = convexTest(schema, modules);
    const owner = asUser(t, "owner");

    await owner.mutation(api.team.createWorkspace, { name: "Owner Workspace" });

    await expect(
      owner.query(api.workspaceSubscriptions.getCurrent, {})
    ).resolves.toMatchObject({
      plan: "free",
      billingPeriod: null,
      subscriptionStatus: "free",
      reconciliationState: "pending",
      editorSeatAllowance: 1,
      storageQuotaBytes: 0,
      billingHealthy: true,
      capabilities: { fileUploads: false },
      canManageBilling: true,
    });
  });

  test("Free blocks Team invitations and Team allows them", async () => {
    const t = convexTest(schema, modules);
    const owner = asUser(t, "owner");
    const workspaceId = await createWorkspace(t, "owner", "Invite Workspace");

    await expect(
      owner.mutation(api.team.inviteMember, {
        teamId: workspaceId,
        email: "editor@example.com",
        role: "Editor",
      })
    ).rejects.toThrow("Team plan");

    await t.mutation(internal.workspaceSubscriptions.confirm, {
      workspaceId,
      clerkOrganizationId: "org_team",
      clerkPlanId: "team",
      billingPeriod: "monthly",
      subscriptionStatus: "active",
      confirmedEditorQuantity: 1,
      includedEditorSeatQuantity: 3,
      purchasedExtraEditorSeatQuantity: 0,
      storageAddonQuantity: 0,
      clerkEventAt: "2026-09-01T00:00:00.000Z",
    });

    await expect(
      owner.mutation(api.team.inviteMember, {
        teamId: workspaceId,
        email: "editor@example.com",
        role: "Editor",
      })
    ).resolves.toBeNull();
  });

  test("subscription state is isolated to the authenticated Workspace", async () => {
    const t = convexTest(schema, modules);
    const firstWorkspaceId = await createWorkspace(t, "first", "First");
    await createWorkspace(t, "second", "Second");

    await t.mutation(internal.workspaceSubscriptions.confirm, {
      workspaceId: firstWorkspaceId,
      clerkOrganizationId: "org_first",
      clerkSubscriptionId: "sub_first",
      clerkPlanId: "creator",
      billingPeriod: "monthly",
      subscriptionStatus: "active",
      confirmedEditorQuantity: 1,
      includedEditorSeatQuantity: 1,
      purchasedExtraEditorSeatQuantity: 0,
      storageAddonQuantity: 0,
      clerkEventAt: "2026-09-01T00:00:00.000Z",
    });

    await expect(
      asUser(t, "second").query(api.workspaceSubscriptions.getCurrent, {})
    ).resolves.toMatchObject({
      plan: "free",
      clerkOrganizationId: null,
    });
  });

  test("Clerk's Organization Free slug resolves to Relay Free", async () => {
    const t = convexTest(schema, modules);
    const workspaceId = await createWorkspace(t, "owner", "Free Workspace");

    await t.mutation(internal.workspaceSubscriptions.confirm, {
      workspaceId,
      clerkOrganizationId: "org_free",
      clerkPlanId: "free_org",
      billingPeriod: null,
      subscriptionStatus: "free",
      confirmedEditorQuantity: 1,
      includedEditorSeatQuantity: 1,
      purchasedExtraEditorSeatQuantity: 0,
      storageAddonQuantity: 0,
      clerkEventAt: "2026-09-01T00:00:00.000Z",
    });

    await expect(
      asUser(t, "owner").query(api.workspaceSubscriptions.getCurrent, {})
    ).resolves.toMatchObject({ plan: "free" });
  });

  test("users in several Workspaces must select an active Clerk Organization", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (const suffix of ["one", "two"]) {
        const workspaceId = await ctx.db.insert("teamWorkspaces", {
          ownerUserId: `test|owner-${suffix}`,
          name: `Workspace ${suffix}`,
          inviteCode: `CODE${suffix}`,
          createdAt: "2026-09-01T00:00:00.000Z",
        });
        await ctx.db.insert("teamMembers", {
          teamId: workspaceId,
          userId: "test|viewer",
          email: "viewer@example.com",
          name: "Viewer",
          role: "Reviewer",
          status: "active",
          permissions: { viewProjects: true },
          createdAt: "2026-09-01T00:00:00.000Z",
        });
      }
    });

    await expect(
      asUser(t, "viewer").query(api.workspaceSubscriptions.getCurrent, {})
    ).rejects.toThrow("Select an active Workspace");
  });

  test("legacy Workspaces expose repairable Free access", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const workspaceId = await ctx.db.insert("teamWorkspaces", {
        ownerUserId: "test|legacy-owner",
        name: "Legacy",
        inviteCode: "LEGACY",
        createdAt: "2026-08-01T00:00:00.000Z",
      });
      await ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId: "test|legacy-owner",
        email: "owner@example.com",
        name: "Legacy Owner",
        role: "Owner",
        status: "active",
        permissions: { manageTeam: true },
        createdAt: "2026-08-01T00:00:00.000Z",
      });
    });
    const owner = asUser(t, "legacy-owner");

    await expect(
      owner.query(api.workspaceSubscriptions.getCurrent, {})
    ).resolves.toMatchObject({
      plan: "free",
      reconciliationState: "repair",
      billingHealthy: true,
    });

    await owner.mutation(api.workspaceSubscriptions.repairCurrent, {});

    await expect(
      owner.query(api.workspaceSubscriptions.getCurrent, {})
    ).resolves.toMatchObject({
      plan: "free",
      reconciliationState: "pending",
    });
  });

  test("ownership transfer preserves the Clerk Organization mapping", async () => {
    const t = convexTest(schema, modules);
    const owner = asUser(t, "owner");
    const workspaceId = await createWorkspace(t, "owner", "Transfer Test");
    const nextOwnerId = await t.run((ctx) =>
      ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId: "test|editor",
        email: "editor@example.com",
        name: "Editor",
        role: "Editor",
        status: "active",
        permissions: { manageTeam: false },
        createdAt: "2026-09-01T00:00:00.000Z",
        joinedAt: "2026-09-01T00:00:00.000Z",
      })
    );
    await t.mutation(internal.workspaceSubscriptions.linkClerkOrganization, {
      workspaceId,
      clerkOrganizationId: "org_transfer",
    });

    await owner.mutation(api.team.transferOwnership, {
      teamId: workspaceId,
      memberId: nextOwnerId,
    });

    await expect(
      asUser(t, "editor").query(api.workspaceSubscriptions.getCurrent, {})
    ).resolves.toMatchObject({
      clerkOrganizationId: "org_transfer",
      canManageBilling: true,
    });
  });
});
