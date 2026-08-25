/// <reference types="vite/client" />

import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const portalApi = {
  publish: makeFunctionReference<"mutation", {
    projectId: string;
    config: {
      publicNotes: string;
      showStartDate: boolean;
      showDueDate: boolean;
      selectedOutputIds: string[];
      expiresAt: string | null;
    };
  }, { portalId: string; token: string }>("projectPortals:publish"),
  getForProject: makeFunctionReference<"query", { projectId: string }, { portal: { hasPin: boolean }; preview: unknown } | null>("projectPortals:getForProject"),
  updateSettings: makeFunctionReference<"mutation", { portalId: string; changes: { selectedOutputIds?: string[]; publicNotes?: string; showStartDate?: boolean; showDueDate?: boolean; expiresAt?: string | null } }, null>("projectPortals:updateSettings"),
  setStatus: makeFunctionReference<"mutation", { portalId: string; status: "draft" | "open" | "closed" }, null>("projectPortals:setStatus"),
  setPin: makeFunctionReference<"mutation", { portalId: string; pin: string | null }, null>("projectPortals:setPin"),
  regenerateToken: makeFunctionReference<"mutation", { portalId: string }, { token: string }>("projectPortals:regenerateToken"),
  getByToken: makeFunctionReference<"query", { token: string; pin?: string }, unknown>("projectPortals:getByToken"),
};

async function seedProject(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "project-portal",
      profileId: "video-editor",
      title: "Private Project",
      clientId: "client-1",
      assigneeUserIds: [],
      workflowStages: [
        { id: "planned", label: "Planned", purpose: "planned" },
        { id: "review", label: "Client Review", purpose: "client_review" },
        { id: "delivered", label: "Delivered", purpose: "delivered" },
      ],
      workflowStageId: "review",
      status: "Review",
      workType: "Client",
      startDate: "2026-08-01",
      dueDate: "2026-08-30",
      earnings: 400,
      paid: false,
      notes: "Internal notes must stay private.",
      archived: false,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });
    const output = await ctx.db.insert("projectOutputs", {
      ownerUserId: "owner",
      projectId: "project-portal",
      id: "main-output",
      title: "Main Film",
      description: "Internal output description",
      category: "Deliverable",
      reviewState: "approved",
      archived: false,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });
    const hidden = await ctx.db.insert("projectOutputs", {
      ownerUserId: "owner",
      projectId: "project-portal",
      id: "hidden-output",
      title: "Internal Cut",
      description: "Do not publish",
      category: "Reference",
      reviewState: "draft",
      archived: false,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });
    const version = await ctx.db.insert("projectMediaVersions", {
      ownerUserId: "owner",
      projectId: "project-portal",
      outputId: output,
      id: "main-v1",
      versionNumber: 1,
      source: { kind: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ" },
      title: "Client cut",
      notes: "Internal mix note",
      createdByUserId: "owner",
      createdAt: "2026-08-02T00:00:00.000Z",
    });
    await ctx.db.patch(output, { currentMediaVersionId: version });
    await ctx.db.patch(hidden, { archived: true });
  });
}

test("publishes a PIN-gated portal with an allowlisted current-version projection", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  const created = await owner.mutation(portalApi.publish, {
    projectId: "project-portal",
    config: { publicNotes: "Client-facing note", showStartDate: false, showDueDate: true, selectedOutputIds: ["main-output"], expiresAt: null },
  });
  expect(created.token).toHaveLength(64);
  await owner.mutation(portalApi.setPin, { portalId: created.portalId, pin: "1234" });
  await owner.mutation(portalApi.setStatus, { portalId: created.portalId, status: "open" });

  expect(await t.query(portalApi.getByToken, { token: created.token })).toEqual({ access: "pin_required" });
  expect(await t.query(portalApi.getByToken, { token: created.token, pin: "bad-pin" })).toEqual({ access: "invalid_pin" });
  const publicView = await t.query(portalApi.getByToken, { token: created.token, pin: "1234" });
  expect(publicView).toMatchObject({
    access: "active",
    project: { title: "Private Project", stage: "Review", progress: 75, publicNotes: "Client-facing note", startDate: null, dueDate: "2026-08-30" },
    outputs: [{ id: "main-output", title: "Main Film", currentVersion: { id: "main-v1", title: "Client cut" } }],
  });
  expect(publicView).not.toHaveProperty("project.notes", "Internal notes must stay private.");
  expect(JSON.stringify(publicView)).not.toContain("Internal mix note");
  expect(JSON.stringify(publicView)).not.toContain("Internal Cut");
  expect(JSON.stringify(publicView)).not.toContain(created.token);
  expect(await owner.query(portalApi.getForProject, { projectId: "project-portal" })).toMatchObject({
    portal: { hasPin: true },
  });
  expect(await owner.query(portalApi.getForProject, { projectId: "project-portal" })).not.toHaveProperty("portal.token");
});

test("returns clear closed, expired, invalid-token states and invalidates regenerated tokens", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  const created = await owner.mutation(portalApi.publish, {
    projectId: "project-portal",
    config: { publicNotes: "", showStartDate: true, showDueDate: true, selectedOutputIds: [], expiresAt: null },
  });
  await owner.mutation(portalApi.setStatus, { portalId: created.portalId, status: "open" });
  await owner.mutation(portalApi.setStatus, { portalId: created.portalId, status: "closed" });
  expect(await t.query(portalApi.getByToken, { token: created.token })).toEqual({ access: "closed" });
  await owner.mutation(portalApi.setStatus, { portalId: created.portalId, status: "open" });
  await owner.mutation(portalApi.updateSettings, { portalId: created.portalId, changes: { expiresAt: "2020-01-01T00:00:00.000Z" } });
  expect(await t.query(portalApi.getByToken, { token: created.token })).toEqual({ access: "expired" });
  const regenerated = await owner.mutation(portalApi.regenerateToken, { portalId: created.portalId });
  expect(await t.query(portalApi.getByToken, { token: created.token })).toEqual({ access: "invalid_token" });
  expect(regenerated.token).not.toBe(created.token);
});

test("requires project edit access for portal management", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  await expect(t.withIdentity({ tokenIdentifier: "stranger" }).mutation(portalApi.publish, {
    projectId: "project-portal",
    config: { publicNotes: "", showStartDate: false, showDueDate: false, selectedOutputIds: [], expiresAt: null },
  })).rejects.toThrow("Project access required");
});
