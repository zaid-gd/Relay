/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("Team reserves Editor seats while Viewers stay free", async () => {
  const t = convexTest(schema, modules);
  const now = "2026-09-02T00:00:00.000Z";
  const teamId = await t.run(async (ctx) => {
    const workspaceId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Team",
      inviteCode: "TEAM06",
      createdAt: now,
    });
    await ctx.db.insert("teamMembers", {
      teamId: workspaceId,
      userId: "owner",
      email: "owner@example.com",
      name: "Owner",
      role: "Owner",
      status: "active",
      permissions: { manageTeam: true },
      createdAt: now,
      joinedAt: now,
    });
    await ctx.db.insert("workspaceSubscriptions", {
      workspaceId,
      plan: "team",
      billingPeriod: "monthly",
      subscriptionStatus: "active",
      confirmedEditorQuantity: 3,
      includedEditorSeatQuantity: 3,
      purchasedExtraEditorSeatQuantity: 0,
      storageAddonQuantity: 0,
      reconciliationState: "synced",
      updatedAt: now,
    });
    return workspaceId;
  });
  const owner = t.withIdentity({ tokenIdentifier: "owner", subject: "owner", email: "owner@example.com" });

  await owner.mutation(api.team.inviteMember, { teamId, email: "editor-1@example.com", role: "Editor" });
  await owner.mutation(api.team.inviteMember, { teamId, email: "editor-2@example.com", role: "Editor" });
  await owner.mutation(api.team.inviteMember, { teamId, email: "viewer-1@example.com", role: "Reviewer" });
  await owner.mutation(api.team.inviteMember, { teamId, email: "viewer-2@example.com", role: "Reviewer" });
  await expect(owner.mutation(api.team.inviteMember, { teamId, email: "editor-3@example.com", role: "Editor" })).rejects.toThrow("confirmed Editor seats");

  const pendingEditor = await t.run((ctx) =>
    ctx.db.query("teamMembers").withIndex("by_teamId_and_email", (q) => q.eq("teamId", teamId).eq("email", "editor-2@example.com")).unique()
  );
  if (!pendingEditor) throw new Error("Pending Editor missing");
  await owner.mutation(api.team.removeMember, { teamId, memberId: pendingEditor._id });
  await expect(owner.mutation(api.team.inviteMember, { teamId, email: "editor-3@example.com", role: "Editor" })).resolves.toBeNull();
});
