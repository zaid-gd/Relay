/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("Client Contacts see only published Projects for their Clients", async () => {
  const t = convexTest(schema, modules);
  const now = "2026-09-02T00:00:00.000Z";
  await t.run(async (ctx) => {
    const workspaceId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Studio",
      inviteCode: "HUB123",
      createdAt: now,
    });
    await ctx.db.insert("workspaceSubscriptions", {
      workspaceId,
      plan: "creator",
      billingPeriod: "monthly",
      subscriptionStatus: "active",
      confirmedEditorQuantity: 1,
      includedEditorSeatQuantity: 1,
      purchasedExtraEditorSeatQuantity: 0,
      storageAddonQuantity: 0,
      reconciliationState: "synced",
      updatedAt: now,
    });
    for (const [clientId, email, name] of [
      ["client-a", "a@example.com", "Alex"],
      ["client-a", "second@example.com", "Sam"],
      ["client-b", "b@example.com", "Blair"],
    ] as const) {
      await ctx.db.insert("clientContacts", {
        workspaceId,
        clientId,
        email,
        name,
        active: true,
        createdAt: now,
      });
    }
    const project = (id: string, clientId: string, title: string) => ({
      ownerUserId: "owner",
      id,
      teamId: workspaceId,
      assigneeUserIds: [],
      profileId: "default",
      title,
      clientId,
      archived: false,
      status: "In Progress" as const,
      workflowStageId: "work",
      workflowStages: [
        { id: "work", label: "Work", purpose: "editing" as const },
      ],
      workType: "Project",
      startDate: "2026-09-01",
      dueDate: "2026-09-30",
      earnings: 0,
      paid: false,
      notes: "internal",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert(
      "projects",
      project("a-public", "client-a", "A public")
    );
    await ctx.db.insert(
      "projects",
      project("a-hidden", "client-a", "A hidden")
    );
    await ctx.db.insert(
      "projects",
      project("b-public", "client-b", "B public")
    );
    await ctx.db.insert("clientHubProjects", {
      workspaceId,
      clientId: "client-a",
      projectId: "a-public",
      publishedAt: now,
    });
    await ctx.db.insert("clientHubProjects", {
      workspaceId,
      clientId: "client-b",
      projectId: "b-public",
      publishedAt: now,
    });
  });

  const asContact = (email: string) =>
    t.withIdentity({ tokenIdentifier: email, subject: email, email });
  await expect(
    asContact("a@example.com").query(api.clientHub.getMine, {})
  ).resolves.toMatchObject({ projects: [{ id: "a-public" }] });
  await expect(
    asContact("second@example.com").query(api.clientHub.getMine, {})
  ).resolves.toMatchObject({ projects: [{ id: "a-public" }] });
  await expect(
    asContact("b@example.com").query(api.clientHub.getMine, {})
  ).resolves.toMatchObject({ projects: [{ id: "b-public" }] });
  await expect(
    asContact("stranger@example.com").query(api.clientHub.getMine, {})
  ).resolves.toMatchObject({ projects: [] });
});
