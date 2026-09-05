/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import type { FunctionReturnType } from "convex/server";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const client = (id: string) => ({
  id,
  name: id,
  company: "",
  contactName: "",
  email: "",
  phone: "",
  notes: "",
  archived: false,
});
const preferences = {
  studioName: "Studio",
  profileName: "Owner",
  profileUsername: "owner",
  profileTitle: "",
  profileBio: "",
  profileLocation: "",
  profileImageUrl: "",
  timeZone: "UTC",
  dateFormat: "YYYY-MM-DD",
  weekStart: "Mon",
  currencyCode: "USD",
  clients: [client("a"), client("b")],
  projectTags: [],
  salaryWorkType: "Salary",
  salaryBatchSize: 20,
  salaryBatchAmount: 1000,
  projectStages: [],
  notifications: {},
  teamRole: "" as const,
  teamMembers: [],
  rolePermissions: {},
  integrationConfigs: {},
  theme: "Dark",
  accentColor: "#fff",
  density: "Balanced",
};
const project = (id: string) => ({
  id,
  ownerUserId: "owner",
  assigneeUserIds: [] as string[],
  profileId: "video-editing",
  title: id,
  clientId: "a",
  archived: false,
  status: "Planned" as const,
  workflowStageId: "plan",
  workflowStages: [
    { id: "plan", label: "Plan", purpose: "planned" as const },
    { id: "edit", label: "Edit", purpose: "editing" as const },
    { id: "done", label: "Done", purpose: "delivered" as const },
  ],
  workType: "Freelance",
  startDate: "2026-09-01",
  dueDate: "2026-09-12",
  earnings: 10,
  paid: false,
  notes: "",
  createdAt: "2026-09-01",
  updatedAt: "2026-09-01",
});

test("hidden team projects reject direct file, output, activity and stage access", async () => {
  const t = convexTest(schema, modules);
  const { teamId, projectId, memberId } = await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Team",
      inviteCode: "PRIVATE",
      createdAt: "2026-09-01",
      allowAllTeamProjects: false,
    });
    const memberId = await ctx.db.insert("teamMembers", {
      teamId,
      userId: "editor",
      email: "editor@example.com",
      name: "Editor",
      role: "Editor",
      status: "active",
      permissions: {
        viewProjects: true,
        editProjects: true,
        updateStatus: true,
      },
      createdAt: "2026-09-01",
    });
    const projectId = await ctx.db.insert("projects", {
      ...project("hidden"),
      teamId,
    });
    return { teamId, projectId, memberId };
  });
  const editor = t.withIdentity({ tokenIdentifier: "editor" });
  expect(await editor.query(api.projects.list, {})).toEqual([]);
  await expect(
    editor.query(api.projectFiles.listForProject, { projectId: "hidden" })
  ).rejects.toThrow("Project access required");
  await expect(
    editor.query(api.projectOutputs.listForProject, { projectId: "hidden" })
  ).rejects.toThrow("Project access required");
  await expect(
    editor.query(api.projectActivity.listForProject, { projectId: "hidden" })
  ).rejects.toThrow("Project access required");
  await expect(
    editor.mutation(api.projects.transitionStage, {
      projectId: "hidden",
      stageId: "edit",
    })
  ).rejects.toThrow("Project access required");
  await t.run((ctx) =>
    ctx.db.patch(projectId, { assigneeUserIds: ["editor"] })
  );
  expect(
    await editor.query(api.projectActivity.listForProject, {
      projectId: "hidden",
    })
  ).toEqual([]);
  expect(
    (
      await editor.query(api.projectFiles.listForProject, {
        projectId: "hidden",
      })
    ).files
  ).toEqual([]);
  expect(
    await editor.query(api.projectOutputs.listForProject, {
      projectId: "hidden",
    })
  ).toEqual([]);
  await editor.mutation(api.projects.transitionStage, {
    projectId: "hidden",
    stageId: "edit",
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(projectId, { assigneeUserIds: [] });
    await ctx.db.patch(teamId, { allowAllTeamProjects: true });
  });
  expect(
    await editor.query(api.projectActivity.listForProject, {
      projectId: "hidden",
    })
  ).toEqual([]);
  await t.run((ctx) => ctx.db.patch(memberId, { status: "invited" }));
  await expect(
    editor.query(api.projectActivity.listForProject, { projectId: "hidden" })
  ).rejects.toThrow("Permission denied");
  await expect(
    t
      .withIdentity({ tokenIdentifier: "outsider" })
      .query(api.projectOutputs.listForProject, { projectId: "hidden" })
  ).rejects.toThrow("Permission denied");
});

test("pagination retains projects and salary batches beyond the former 500-record limit", async () => {
  const t = convexTest(schema, modules);
  for (let start = 0; start < 501; start += 100) {
    await t.run(async (ctx) => {
      for (let i = start; i < Math.min(start + 100, 501); i++) {
        await ctx.db.insert("projects", project(`project-${i}`));
        await ctx.db.insert("projectSalaryBatches", {
          ownerUserId: "owner",
          id: `batch-${i}`,
          number: i,
          workType: "Salary",
          requiredProjectCount: 1,
          amount: 25,
          projectIds: [`project-${i}`],
          completedAt: "2026-09-01",
          paid: false,
        });
      }
    });
  }
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  const ids: string[] = [];
  let cursor: string | null = null;
  while (true) {
    const result: FunctionReturnType<typeof api.projects.listPage> =
      await owner.query(api.projects.listPage, {
        scope: "personal",
        paginationOpts: { numItems: 100, cursor },
      });
    ids.push(...result.page.map((row) => row.id));
    if (result.isDone) break;
    cursor = result.continueCursor;
  }
  expect(new Set(ids).size).toBe(501);
  cursor = null;
  let amount = 0;
  let count = 0;
  while (true) {
    const result: FunctionReturnType<typeof api.projects.salaryBatchesPage> =
      await owner.query(api.projects.salaryBatchesPage, {
        paginationOpts: { numItems: 100, cursor },
      });
    count += result.page.length;
    amount += result.page.reduce((sum, row) => sum + row.amount, 0);
    if (result.isDone) break;
    cursor = result.continueCursor;
  }
  expect(count).toBe(501);
  expect(amount).toBe(501 * 25);
  expect(
    (
      await t
        .withIdentity({ tokenIdentifier: "other" })
        .query(api.projects.listPage, {
          scope: "personal",
          paginationOpts: { numItems: 100, cursor: null },
        })
    ).page
  ).toEqual([]);
});

test("independent settings and client edits preserve changes made by another tab", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  await owner.mutation(api.settings.upsert, {
    ...preferences,
    customClients: ["a", "b"],
  });
  await owner.mutation(api.settings.patch, {
    changes: { theme: "Light" },
    clients: [{ ...client("a"), name: "Renamed" }],
  });
  await owner.mutation(api.settings.patch, {
    changes: { timeZone: "Asia/Dubai" },
    clients: [{ ...client("b"), phone: "123" }],
  });
  const saved = await owner.query(api.settings.get, {});
  expect(saved).toMatchObject({ theme: "Light", timeZone: "Asia/Dubai" });
  expect(saved?.clients).toEqual([
    { ...client("a"), name: "Renamed" },
    { ...client("b"), phone: "123" },
  ]);
  expect(await t.run((ctx) => ctx.db.query("clients").collect())).toHaveLength(
    2
  );
  await expect(
    t
      .withIdentity({ tokenIdentifier: "other" })
      .mutation(api.settings.patch, { changes: { theme: "Dark" } })
  ).rejects.toThrow();
  // Creation resolves the separate client record, not the legacy settings array.
  const {
    ownerUserId,
    archived,
    status,
    workflowStageId,
    paid,
    createdAt,
    updatedAt,
    ...input
  } = project("linked");
  await owner.mutation(api.projects.create, { project: input });
});

test("legacy client arrays remain readable and record edits take precedence", async () => {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("settings", { ...preferences, userId: "owner" })
  );
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  await owner.mutation(api.settings.patch, {
    changes: {},
    clients: [{ ...client("a"), archived: true }],
  });
  const saved = await owner.query(api.settings.get, {});
  expect(saved?.clients).toEqual([
    { ...client("a"), archived: true },
    client("b"),
  ]);
});
