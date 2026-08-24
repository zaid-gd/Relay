/// <reference types="vite/client" />

import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const outputsApi = {
  initialize: makeFunctionReference<"mutation", {
    projectId: string;
    outputs: Array<{ id: string; title: string; category: "Deliverable" | "Reference" | "Asset" }>;
  }, unknown>("projectOutputs:initializeFromTemplate"),
  create: makeFunctionReference<"mutation", {
    projectId: string;
    output: { id: string; title: string; category: "Deliverable" | "Reference" | "Asset" };
  }, unknown>("projectOutputs:create"),
  update: makeFunctionReference<"mutation", {
    outputId: string;
    changes: { title?: string; reviewState?: "approved" | "changes_requested" };
  }, null>("projectOutputs:update"),
  archive: makeFunctionReference<"mutation", { outputId: string; archived: boolean }, null>("projectOutputs:setArchived"),
  addVersion: makeFunctionReference<"mutation", {
    outputId: string;
    version: { id: string; url: string; title: string; notes?: string };
  }, string>("projectOutputs:addLinkedMediaVersion"),
  list: makeFunctionReference<"query", { projectId: string; includeArchived?: boolean }, Array<{
    id: string;
    title: string;
    archived: boolean;
    reviewState: string;
    currentVersion: null | { id: string; versionNumber: number; source: { kind: string; url: string; videoId?: string } };
    versions: Array<{ id: string; versionNumber: number; source: { kind: string; url: string; videoId?: string } }>;
    unresolvedOldVersionCommentCount: number;
  }>>("projectOutputs:listForProject"),
};

async function seedProject(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "project-a",
      assigneeUserIds: [],
      profileId: "video-editing",
      title: "Project A",
      clientId: "client-a",
      archived: false,
      status: "Planned",
      workflowStageId: "planned",
      workflowStages: [
        { id: "planned", label: "Planned", purpose: "planned" },
        { id: "done", label: "Delivered", purpose: "delivered" },
      ],
      workType: "Salary",
      startDate: "2026-08-24",
      dueDate: "2026-09-01",
      earnings: 0,
      paid: false,
      notes: "",
      createdAt: "2026-08-24T00:00:00.000Z",
      updatedAt: "2026-08-24T00:00:00.000Z",
    });
  });
}

test("template Outputs initialize once and remain separate from Project workflow and salary", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  const starter = [{ id: "main", title: "Main video", category: "Deliverable" as const }];

  await owner.mutation(outputsApi.initialize, { projectId: "project-a", outputs: starter });
  await owner.mutation(outputsApi.initialize, { projectId: "project-a", outputs: starter });
  await owner.mutation(outputsApi.create, {
    projectId: "project-a",
    output: { id: "short", title: "Short cut", category: "Deliverable" },
  });
  await owner.mutation(outputsApi.update, {
    outputId: "main",
    changes: { title: "Main film", reviewState: "approved" },
  });

  expect(await owner.query(outputsApi.list, { projectId: "project-a" })).toMatchObject([
    { id: "main", title: "Main film", reviewState: "approved" },
    { id: "short" },
  ]);
  const state = await t.run(async (ctx) => ({
    project: await ctx.db.query("projects").withIndex("by_projectId", (q) => q.eq("id", "project-a")).unique(),
    salaryBatches: await ctx.db.query("projectSalaryBatches").collect(),
  }));
  expect(state.project).toMatchObject({ status: "Planned", workflowStageId: "planned" });
  expect(state.salaryBatches).toEqual([]);
});

test("linked versions normalize providers, retain history, and flag unresolved old comments", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  await owner.mutation(outputsApi.initialize, {
    projectId: "project-a",
    outputs: [{ id: "main", title: "Main", category: "Deliverable" }],
  });
  const firstId = await owner.mutation(outputsApi.addVersion, {
    outputId: "main",
    version: { id: "v1", url: "https://youtu.be/dQw4w9WgXcQ?t=5", title: "First" },
  });
  await t.run(async (ctx) => {
    const output = await ctx.db.query("projectOutputs").withIndex("by_outputId", (q) => q.eq("id", "main")).unique();
    if (!output) throw new Error("Output fixture failed");
    const mediaVersionId = ctx.db.normalizeId("projectMediaVersions", firstId);
    if (!mediaVersionId) throw new Error("Version fixture failed");
    await ctx.db.insert("mediaVersionComments", {
      ownerUserId: "owner",
      projectId: "project-a",
      outputId: output._id,
      mediaVersionId,
      authorName: "Client",
      body: "Fix this",
      resolved: false,
      createdAt: "2026-08-24T00:00:00.000Z",
    });
  });
  await owner.mutation(outputsApi.addVersion, {
    outputId: "main",
    version: { id: "v2", url: "https://player.vimeo.com/video/76979871?autoplay=1", title: "Second" },
  });

  const [output] = await owner.query(outputsApi.list, { projectId: "project-a" });
  expect(output.currentVersion).toMatchObject({
    id: "v2",
    versionNumber: 2,
    source: { kind: "vimeo", videoId: "76979871", url: "https://vimeo.com/76979871" },
  });
  expect(output.versions).toHaveLength(2);
  expect(output.versions[1]?.source).toEqual({
    kind: "youtube",
    videoId: "dQw4w9WgXcQ",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });
  expect(output.unresolvedOldVersionCommentCount).toBe(1);
  const state = await t.run(async (ctx) => ({
    project: await ctx.db.query("projects").withIndex("by_projectId", (q) => q.eq("id", "project-a")).unique(),
    salaryBatches: await ctx.db.query("projectSalaryBatches").collect(),
  }));
  expect(state.project).toMatchObject({ status: "Planned", workflowStageId: "planned" });
  expect(state.salaryBatches).toEqual([]);
});

test("invalid providers and unauthorised writes fail while ordinary links stay links", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  await owner.mutation(outputsApi.initialize, {
    projectId: "project-a",
    outputs: [{ id: "main", title: "Main", category: "Deliverable" }],
  });

  await expect(t.withIdentity({ tokenIdentifier: "stranger" }).mutation(outputsApi.update, {
    outputId: "main",
    changes: { reviewState: "changes_requested" },
  })).rejects.toThrow("Project access required");
  await expect(owner.mutation(outputsApi.addVersion, {
    outputId: "main",
    version: { id: "embed", url: "<iframe src='https://youtube.com/embed/x'></iframe>", title: "Embed" },
  })).rejects.toThrow("Embed code");
  await expect(owner.mutation(outputsApi.addVersion, {
    outputId: "main",
    version: { id: "bad-youtube", url: "https://youtube.com/watch?v=no", title: "Bad" },
  })).rejects.toThrow("YouTube URL is invalid");
  await owner.mutation(outputsApi.addVersion, {
    outputId: "main",
    version: { id: "review", url: "https://review.example.com/cut/2#private", title: "Review" },
  });
  const [output] = await owner.query(outputsApi.list, { projectId: "project-a" });
  expect(output.currentVersion?.source).toEqual({ kind: "link", url: "https://review.example.com/cut/2" });

  await owner.mutation(outputsApi.archive, { outputId: "main", archived: true });
  expect(await owner.query(outputsApi.list, { projectId: "project-a" })).toEqual([]);
  expect(await owner.query(outputsApi.list, { projectId: "project-a", includeArchived: true })).toHaveLength(1);
});
