/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const salaryPlansApi = {
  create: makeFunctionReference<
    "mutation",
    {
      clientId: string;
      requiredProjectCount: number;
      amount: number;
      startDate: string;
      notes: string;
    },
    string
  >("salaryPlans:create"),
  list: makeFunctionReference<
    "query",
    { includeArchived?: boolean },
    Array<{ archived: boolean }>
  >("salaryPlans:list"),
  update: makeFunctionReference<
    "mutation",
    {
      planId: string;
      changes: {
        clientId: string;
        requiredProjectCount: number;
        amount: number;
        startDate: string;
        notes: string;
        archived?: boolean;
      };
    },
    null
  >("salaryPlans:update"),
  setArchived: makeFunctionReference<
    "mutation",
    { planId: string; archived: boolean },
    null
  >("salaryPlans:setArchived"),
  setReceived: makeFunctionReference<
    "mutation",
    { batchId: string; received: boolean; correctionNote?: string },
    null
  >("salaryPlans:setReceived"),
};

const projectsApi = {
  create: makeFunctionReference<
    "mutation",
    { project: Record<string, unknown> },
    string
  >("projects:create"),
  transitionStage: makeFunctionReference<
    "mutation",
    { projectId: string; stageId: string },
    { kind: string; progress?: number; batchCreated?: boolean }
  >("projects:transitionStage"),
  previewStage: makeFunctionReference<
    "query",
    { projectId: string; stageId: string },
    {
      kind: string;
      progress?: number;
      requiredProjectCount?: number;
      amount?: number;
    }
  >("projects:previewStage"),
};

function settings() {
  return {
    studioName: "Studio",
    profileName: "Owner",
    profileUsername: "owner",
    profileTitle: "",
    profileBio: "",
    profileLocation: "",
    profileImageUrl: "",
    timeZone: "UTC",
    dateFormat: "Month Day, Year",
    weekStart: "Mon",
    currencyCode: "USD",
    clients: [
      {
        id: "client-a",
        name: "Client",
        company: "",
        contactName: "",
        email: "",
        phone: "",
        notes: "",
        archived: false,
      },
    ],
    projectTags: [],
    salaryWorkType: "Salary",
    salaryBatchSize: 20,
    salaryBatchAmount: 10000,
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

function project(id: string, salaryPlanId: string) {
  return {
    id,
    assigneeUserIds: [],
    profileId: "video-editing",
    title: id,
    clientId: "client-a",
    salaryPlanId,
    workflowStages: [
      { id: "planned", label: "Planned", purpose: "planned" as const },
      { id: "done", label: "Delivered", purpose: "delivered" as const },
    ],
    workType: "Salary",
    startDate: "2026-08-24",
    dueDate: "2026-09-01",
    earnings: 999,
    notes: "",
  };
}

async function addWorkspace(
  t: ReturnType<typeof convexTest>,
  plan: "free" | "creator"
) {
  await t.run(async (ctx) => {
    const workspaceId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Salary Workspace",
      inviteCode: "SALARY",
      createdAt: "2026-09-01T00:00:00.000Z",
    });
    await ctx.db.insert("teamMembers", {
      teamId: workspaceId,
      userId: "owner",
      email: "owner@example.com",
      name: "Owner",
      role: "Owner",
      status: "active",
      permissions: { manageFinance: true },
      createdAt: "2026-09-01T00:00:00.000Z",
    });
    await ctx.db.insert("workspaceSubscriptions", {
      workspaceId,
      plan,
      billingPeriod: plan === "free" ? null : "monthly",
      subscriptionStatus: plan === "free" ? "free" : "active",
      confirmedEditorQuantity: 1,
      includedEditorSeatQuantity: 1,
      purchasedExtraEditorSeatQuantity: 0,
      storageAddonQuantity: 0,
      reconciliationState: "synced",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
  });
}

test("Salary Plan delivery snapshots terms and survives later edits", async () => {
  const t = convexTest(schema, modules);
  await addWorkspace(t, "creator");
  const owner = t.withIdentity({ tokenIdentifier: "owner", name: "Owner" });
  await owner.mutation(api.settings.upsert, settings());
  const planId = await owner.mutation(salaryPlansApi.create, {
    clientId: "client-a",
    requiredProjectCount: 2,
    amount: 1200,
    startDate: "2026-08-01",
    notes: "Monthly contract",
  });
  await owner.mutation(projectsApi.create, { project: project("one", planId) });
  await owner.mutation(projectsApi.create, { project: project("two", planId) });
  expect(
    await owner.query(projectsApi.previewStage, {
      projectId: "one",
      stageId: "done",
    })
  ).toMatchObject({
    kind: "salary",
    progress: 1,
    requiredProjectCount: 2,
    amount: 1200,
  });
  await owner.mutation(projectsApi.transitionStage, {
    projectId: "one",
    stageId: "done",
  });
  const result = await owner.mutation(projectsApi.transitionStage, {
    projectId: "two",
    stageId: "done",
  });
  expect(result).toMatchObject({ kind: "salary", batchCreated: true });

  const before = await t.run((ctx) =>
    ctx.db.query("projectSalaryBatches").unique()
  );
  if (!before) throw new Error("Salary Batch was not created");
  expect(before).toMatchObject({
    salaryPlanId: planId,
    clientId: "client-a",
    clientName: "Client",
    requiredProjectCount: 2,
    amount: 1200,
    planStartDate: "2026-08-01",
    planNotes: "Monthly contract",
    projectIds: ["one", "two"],
    paid: false,
    received: false,
  });
  await owner.mutation(salaryPlansApi.update, {
    planId,
    changes: {
      clientId: "client-a",
      requiredProjectCount: 3,
      amount: 1800,
      startDate: "2026-09-01",
      notes: "Changed later",
    },
  });
  const after = await t.run((ctx) =>
    ctx.db.get("projectSalaryBatches", before._id)
  );
  expect(after).toMatchObject({
    requiredProjectCount: 2,
    amount: 1200,
    planStartDate: "2026-08-01",
    planNotes: "Monthly contract",
  });

  await owner.mutation(salaryPlansApi.setReceived, {
    batchId: before._id,
    received: true,
    correctionNote: "Paid by bank transfer",
  });
  expect(
    await t.run((ctx) => ctx.db.get("projectSalaryBatches", before._id))
  ).toMatchObject({
    received: true,
    paid: true,
    correctionNote: "Paid by bank transfer",
  });
});

test("Salary Plans are owner-only and archive without deleting history", async () => {
  const t = convexTest(schema, modules);
  await addWorkspace(t, "creator");
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  await owner.mutation(api.settings.upsert, settings());
  const planId = await owner.mutation(salaryPlansApi.create, {
    clientId: "client-a",
    requiredProjectCount: 1,
    amount: 500,
    startDate: "2026-08-24",
    notes: "",
  });
  await expect(
    t.withIdentity({ tokenIdentifier: "editor" }).query(salaryPlansApi.list, {})
  ).resolves.toEqual([]);
  await owner.mutation(salaryPlansApi.setArchived, { planId, archived: true });
  expect(await owner.query(salaryPlansApi.list, {})).toEqual([]);
  expect(
    await owner.query(salaryPlansApi.list, { includeArchived: true })
  ).toMatchObject([{ _id: planId, archived: true }]);
});

test("Free Workspaces cannot create Salary Plans", async () => {
  const t = convexTest(schema, modules);
  await addWorkspace(t, "free");
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  await owner.mutation(api.settings.upsert, settings());

  await expect(
    owner.mutation(salaryPlansApi.create, {
      clientId: "client-a",
      requiredProjectCount: 1,
      amount: 500,
      startDate: "2026-08-24",
      notes: "",
    })
  ).rejects.toThrow("Creator or Team");
});

test("custom Workflow Template changes use Workspace entitlements", async () => {
  const template = {
    id: "custom-review",
    name: "Custom review",
    description: "",
    projectType: "Video",
    workType: "freelance" as const,
    durationDays: 7,
    workflowStages: [
      { id: "planned", label: "Planned", purpose: "planned" as const },
      { id: "delivered", label: "Delivered", purpose: "delivered" as const },
    ],
    deliverables: [],
    checklistItems: [],
  };
  const freeTest = convexTest(schema, modules);
  await addWorkspace(freeTest, "free");
  const freeOwner = freeTest.withIdentity({ tokenIdentifier: "owner" });

  await expect(
    freeOwner.mutation(api.settings.upsert, {
      ...settings(),
      customProjectTemplates: [template],
    })
  ).rejects.toThrow("Creator or Team");

  const creatorTest = convexTest(schema, modules);
  await addWorkspace(creatorTest, "creator");
  const creatorOwner = creatorTest.withIdentity({ tokenIdentifier: "owner" });
  await expect(
    creatorOwner.mutation(api.settings.upsert, {
      ...settings(),
      customProjectTemplates: [template],
    })
  ).resolves.toBeNull();
});
