/// <reference types="vite/client" />

import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const commentsApi = {
  listForPortal: makeFunctionReference<"query", { token: string; pin?: string }, {
    access: string;
    comments: Array<{ id: string; authorName: string; body: string; resolved: boolean }>;
  }>("mediaVersionComments:listForPortal"),
  addPublic: makeFunctionReference<"mutation", {
    token: string;
    pin?: string;
    outputId: string;
    mediaVersionId: string;
    authorName: string;
    body: string;
  }, { id: string }>("mediaVersionComments:addPublicComment"),
  reopenPublic: makeFunctionReference<"mutation", { token: string; commentId: string }, { id: string; resolved: boolean }>("mediaVersionComments:reopenPublicComment"),
  listForProject: makeFunctionReference<"query", { projectId: string }, Array<{ id: string; resolved: boolean; mediaVersionId: string }>>("mediaVersionComments:listForProject"),
  setResolved: makeFunctionReference<"mutation", { commentId: string; resolved: boolean }, { id: string; resolved: boolean }>("mediaVersionComments:setResolved"),
};

const portalApi = {
  publish: makeFunctionReference<"mutation", {
    projectId: string;
    config: { publicNotes: string; showStartDate: boolean; showDueDate: boolean; selectedOutputIds: string[]; expiresAt: string | null };
  }, { portalId: string; token: string }>("projectPortals:publish"),
  setStatus: makeFunctionReference<"mutation", { portalId: string; status: "draft" | "open" | "closed" }, null>("projectPortals:setStatus"),
  setPin: makeFunctionReference<"mutation", { portalId: string; pin: string | null }, null>("projectPortals:setPin"),
};

async function seed(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "comments-project",
      assigneeUserIds: [],
      profileId: "video-editing",
      title: "Comments Project",
      clientId: "client-a",
      archived: false,
      status: "Planned",
      workflowStageId: "planned",
      workflowStages: [
        { id: "planned", label: "Planned", purpose: "planned" },
        { id: "delivered", label: "Delivered", purpose: "delivered" },
      ],
      workType: "Freelance",
      startDate: "2026-08-24",
      dueDate: "2026-09-01",
      earnings: 500,
      paid: false,
      notes: "Internal notes must stay private",
      createdAt: "2026-08-24T00:00:00.000Z",
      updatedAt: "2026-08-24T00:00:00.000Z",
    });
    const outputId = await ctx.db.insert("projectOutputs", {
      ownerUserId: "owner",
      projectId: "comments-project",
      id: "main-output",
      title: "Main cut",
      description: "",
      category: "Deliverable",
      reviewState: "sent_to_client",
      archived: false,
      createdAt: "2026-08-24T00:00:00.000Z",
      updatedAt: "2026-08-24T00:00:00.000Z",
    });
    const versionId = await ctx.db.insert("projectMediaVersions", {
      ownerUserId: "owner",
      projectId: "comments-project",
      outputId,
      id: "current-v1",
      versionNumber: 1,
      source: { kind: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ" },
      title: "Current cut",
      notes: "Private editor notes",
      createdByUserId: "owner",
      createdAt: "2026-08-24T00:00:00.000Z",
    });
    await ctx.db.patch(outputId, { currentMediaVersionId: versionId });
  });
}

async function publishOpen(t: ReturnType<typeof convexTest>) {
  const owner = t.withIdentity({ tokenIdentifier: "owner", name: "Owner" });
  const published = await owner.mutation(portalApi.publish, {
    projectId: "comments-project",
    config: { publicNotes: "Review the current cut", showStartDate: false, showDueDate: true, selectedOutputIds: ["main-output"], expiresAt: null },
  });
  await owner.mutation(portalApi.setStatus, { portalId: published.portalId, status: "open" });
  return { owner, token: published.token };
}

test("public comments require active portal access and attach to the current version", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const { owner, token } = await publishOpen(t);

  const comment = await t.mutation(commentsApi.addPublic, {
    token,
    outputId: "main-output",
    mediaVersionId: "current-v1",
    authorName: " Client reviewer ",
    body: " Please lift the music under the title. ",
  });
  expect(comment.id).toBeTruthy();
  expect(await t.query(commentsApi.listForPortal, { token })).toMatchObject({
    access: "active",
    comments: [{ authorName: "Client reviewer", body: "Please lift the music under the title.", resolved: false }],
  });
  expect(await owner.query(commentsApi.listForProject, { projectId: "comments-project" })).toMatchObject([
    { outputId: "main-output", mediaVersionId: "current-v1", body: "Please lift the music under the title." },
  ]);
  await expect(t.mutation(commentsApi.addPublic, {
    token,
    outputId: "main-output",
    mediaVersionId: "not-current",
    authorName: "Client",
    body: "Old version",
  })).rejects.toThrow("current shared Media Version");
});

test("team-side resolution and public reopening preserve the comment record", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const { owner, token } = await publishOpen(t);
  const comment = await t.mutation(commentsApi.addPublic, {
    token,
    outputId: "main-output",
    mediaVersionId: "current-v1",
    authorName: "Client",
    body: "Please check the opening frame.",
  });

  const resolved = await owner.mutation(commentsApi.setResolved, { commentId: comment.id, resolved: true });
  expect(resolved.resolved).toBe(true);
  expect((await t.query(commentsApi.listForPortal, { token })).comments).toMatchObject([
    { id: comment.id, resolved: true },
  ]);
  const reopened = await t.mutation(commentsApi.reopenPublic, { token, commentId: comment.id });
  expect(reopened.resolved).toBe(false);
  expect((await owner.query(commentsApi.listForProject, { projectId: "comments-project" }))[0]?.resolved).toBe(false);
});

test("PIN, closure, expiry, and invalid tokens block public comments without deleting history", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const { owner, token } = await publishOpen(t);
  const portal = await t.run(async (ctx) => ctx.db.query("projectPortals").withIndex("by_projectId", (q) => q.eq("projectId", "comments-project")).unique());
  if (!portal) throw new Error("Portal fixture failed");
  await owner.mutation(portalApi.setPin, { portalId: portal._id, pin: "1234" });
  expect((await t.query(commentsApi.listForPortal, { token })).access).toBe("pin_required");
  expect((await t.query(commentsApi.listForPortal, { token, pin: "wrong" })).access).toBe("invalid_pin");
  expect((await t.query(commentsApi.listForPortal, { token, pin: "1234" })).access).toBe("active");

  await t.mutation(commentsApi.addPublic, {
    token,
    pin: "1234",
    outputId: "main-output",
    mediaVersionId: "current-v1",
    authorName: "Client",
    body: "Keep this history after closing.",
  });

  await owner.mutation(portalApi.setStatus, { portalId: portal._id, status: "closed" });
  expect((await t.query(commentsApi.listForPortal, { token, pin: "1234" })).access).toBe("closed");
  expect((await owner.query(commentsApi.listForProject, { projectId: "comments-project" }))).toMatchObject([
    { body: "Keep this history after closing." },
  ]);
  await owner.mutation(portalApi.setStatus, { portalId: portal._id, status: "open" });
  await t.run(async (ctx) => ctx.db.patch(portal._id, { expiresAt: "2000-01-01T00:00:00.000Z" }));
  expect((await t.query(commentsApi.listForPortal, { token, pin: "1234" })).access).toBe("expired");
  expect((await t.query(commentsApi.listForPortal, { token: "not-a-token" })).access).toBe("invalid_token");
});
