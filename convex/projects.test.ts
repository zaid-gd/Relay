/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function settings() {
  return {
    studioName: "Studio", profileName: "Owner", profileUsername: "owner", profileTitle: "", profileBio: "", profileLocation: "", profileImageUrl: "",
    timeZone: "UTC", dateFormat: "Month Day, Year", weekStart: "Mon", currencyCode: "USD",
    clients: [{ id: "client-a", name: "Client", company: "", contactName: "", email: "", phone: "", notes: "", archived: false }],
    projectTags: [], salaryWorkType: "Salary", salaryBatchSize: 2, salaryBatchAmount: 1000,
    projectStages: [], notifications: {}, integrations: {}, integrationAccounts: {},
    teamRole: "" as const, teamMembers: [], editorPermissions: {}, rolePermissions: {}, integrationConfigs: {},
    theme: "dark", accentColor: "#fff", density: "compact",
  };
}

const workflowStages = [
  { id: "planned", label: "Planned", purpose: "planned" as const },
  { id: "edit", label: "Delivered", purpose: "editing" as const },
  { id: "done", label: "Ship it", purpose: "delivered" as const },
];

function project(id: string, overrides: {
  teamId?: string;
  clientId?: string;
  projectGroupId?: string;
  starterOutputs?: Array<{ title: string; category: "Deliverable" | "Reference" | "Asset"; reviewState: "draft" }>;
} = {}) {
  return {
    id,
    teamId: overrides.teamId,
    assigneeUserIds: [],
    profileId: "video-editing",
    title: id,
    clientId: overrides.clientId ?? "client-a",
    projectGroupId: overrides.projectGroupId,
    workflowStages,
    workType: "Salary",
    startDate: "2026-08-24",
    dueDate: "2026-09-01",
    earnings: 0,
    notes: "",
    starterOutputs: overrides.starterOutputs,
  };
}

const projectsApi = {
  create: makeFunctionReference<"mutation", { project: ReturnType<typeof project> }, string>("projects:create"),
  transitionStage: makeFunctionReference<"mutation", { projectId: string; stageId: string }>("projects:transitionStage"),
  previewStage: makeFunctionReference<"query", { projectId: string; stageId: string }, { kind: string; progress?: number; requiredProjectCount?: number; amount?: number; batchCreated?: boolean }>("projects:previewStage"),
  listSalaryBatches: makeFunctionReference<"query", {}, Array<{ id: string; paid: boolean; projectIds: string[] }>>("projects:listSalaryBatches"),
  setSalaryBatchPaid: makeFunctionReference<"mutation", { batchId: string; paid: boolean }, null>("projects:setSalaryBatchPaid"),
  list: makeFunctionReference<"query", {}, Array<{ id: string; workflowStageId: string; status: string; completedAt?: string }>>("projects:list"),
};

test("stage transitions resist spoofing and settled Salary Batches stay immutable", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ tokenIdentifier: "owner", name: "Owner" });
  await owner.mutation(api.settings.upsert, settings());
  await owner.mutation(projectsApi.create, { project: project("first") });
  await owner.mutation(projectsApi.create, { project: project("second") });

  await expect(owner.mutation(projectsApi.transitionStage, {
    projectId: "first",
    stageId: "missing",
  })).rejects.toThrow("Workflow stage does not belong");

  await owner.mutation(projectsApi.transitionStage, { projectId: "first", stageId: "edit" });
  expect((await owner.query(projectsApi.list, {})).find(({ id }) => id === "first"))
    .toMatchObject({ workflowStageId: "edit", status: "In Progress" });

  expect(await owner.query(projectsApi.previewStage, { projectId: "first", stageId: "done" })).toMatchObject({ kind: "salary", progress: 1, requiredProjectCount: 2, amount: 1000, batchCreated: false });
  const first = await owner.mutation(projectsApi.transitionStage, { projectId: "first", stageId: "done" });
  expect(first).toMatchObject({ kind: "salary", progress: 1, batchCreated: false });
  expect(await owner.query(projectsApi.previewStage, { projectId: "second", stageId: "done" })).toMatchObject({ kind: "salary", requiredProjectCount: 2, amount: 1000, batchCreated: true });
  const second = await owner.mutation(projectsApi.transitionStage, { projectId: "second", stageId: "done" });
  expect(second).toMatchObject({ kind: "salary", progress: 0, amount: 1000, batchCreated: true });

  const before = await t.run((ctx) => ctx.db.query("projectSalaryBatches").collect());
  expect(before).toHaveLength(1);
  expect(before[0]).toMatchObject({
    requiredProjectCount: 2,
    amount: 1000,
    projectIds: ["first", "second"],
    paid: false,
  });
  expect(await owner.query(projectsApi.listSalaryBatches, {})).toMatchObject([{ id: "salary-batch-1", paid: false, projectIds: ["first", "second"] }]);
  await owner.mutation(projectsApi.setSalaryBatchPaid, { batchId: "salary-batch-1", paid: true });
  expect(await owner.query(projectsApi.listSalaryBatches, {})).toMatchObject([{ id: "salary-batch-1", paid: true, projectIds: ["first", "second"] }]);

  await owner.mutation(projectsApi.transitionStage, { projectId: "first", stageId: "edit" });
  await owner.mutation(api.settings.upsert, { ...settings(), salaryBatchSize: 3, salaryBatchAmount: 9999 });
  expect(await t.run((ctx) => ctx.db.query("projectSalaryBatches").collect())).toEqual([{ ...before[0], paid: true, paidAt: expect.any(String) }]);
  const reopened = (await owner.query(projectsApi.list, {})).find(({ id }) => id === "first");
  expect(reopened).toMatchObject({ status: "In Progress" });
  expect(reopened).not.toHaveProperty("completedAt");
});

test("create validates durable Client and Project Group ownership", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  await owner.mutation(api.settings.upsert, settings());
  await owner.mutation(api.projectGroups.upsert, {
    group: { id: "group-a", clientId: "client-a", name: "Group", notes: "", archived: false, createdAt: "2026-08-24" },
  });

  await owner.mutation(projectsApi.create, { project: project("valid", { projectGroupId: "group-a" }) });
  await expect(owner.mutation(projectsApi.create, {
    project: project("wrong-client", { clientId: "client-b", projectGroupId: "group-a" }),
  })).rejects.toThrow("Project Client must belong");
});

test("create materializes Template outputs in the Project transaction", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  await owner.mutation(api.settings.upsert, settings());
  await owner.mutation(projectsApi.create, { project: project("with-outputs", {
    starterOutputs: [
      { title: "Main film", category: "Deliverable", reviewState: "draft" },
      { title: "Thumbnail", category: "Asset", reviewState: "draft" },
    ],
  }) });

  expect(await t.run((ctx) => ctx.db.query("projectOutputs")
    .withIndex("by_projectId", (q) => q.eq("projectId", "with-outputs"))
    .collect())).toMatchObject([
    { id: "with-outputs:output:1", title: "Main film", dueDate: "2026-09-01" },
    { id: "with-outputs:output:2", title: "Thumbnail", dueDate: "2026-09-01" },
  ]);
});

test("team members need the matching Project permission", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Team",
      inviteCode: "ABC123",
      createdAt: "2026-08-24",
      allowAllTeamProjects: true,
    });
    await ctx.db.insert("teamMembers", {
      teamId,
      userId: "viewer",
      email: "viewer@example.com",
      name: "Viewer",
      role: "Reviewer",
      status: "active",
      permissions: { viewProjects: true, createProjects: false, editProjects: false, updateStatus: false, manageTeam: false },
      createdAt: "2026-08-24",
    });
    await ctx.db.insert("settings", { ...settings(), userId: "owner" });
  });
  const teamId = await t.run(async (ctx) => (await ctx.db.query("teamWorkspaces").first())?._id);
  if (!teamId) throw new Error("Team fixture failed");
  await expect(t.withIdentity({ tokenIdentifier: "viewer" }).mutation(projectsApi.create, {
    project: project("denied", { teamId }),
  })).rejects.toThrow("Permission denied");
});
