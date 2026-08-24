import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const projectsApi = {
  setPayment: makeFunctionReference<"mutation", { projectId: string; paid: boolean }, null>("projects:setPayment"),
  update: makeFunctionReference<"mutation", { projectId: string; changes: { paid: boolean } }, null>("projects:update"),
};

function project(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ownerUserId: "owner",
    id,
    assigneeUserIds: [],
    profileId: "video-editing",
    title: id,
    clientId: "client-a",
    archived: false,
    status: "Delivered" as const,
    workflowStageId: "done",
    workflowStages: [
      { id: "edit", label: "Edit", purpose: "editing" as const },
      { id: "done", label: "Delivered", purpose: "delivered" as const },
    ],
    workType: "Freelance",
    startDate: "2026-08-01",
    dueDate: "2026-08-10",
    earnings: 500,
    paid: false,
    notes: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

test("payment is owner-authorized, durable, and activity-backed", async () => {
  const t = convexTest(schema, modules);
  await t.run((ctx) => ctx.db.insert("projects", project("client-project")));
  const owner = t.withIdentity({ tokenIdentifier: "owner", name: "Owner" });

  await owner.mutation(projectsApi.setPayment, { projectId: "client-project", paid: true });
  expect(await t.run((ctx) => ctx.db.query("projects").withIndex("by_projectId", (q) => q.eq("id", "client-project")).unique()))
    .toMatchObject({ paid: true, paidDate: expect.any(String) });
  expect(await t.run((ctx) => ctx.db.query("projectActivity").collect())).toMatchObject([
    { projectId: "client-project", kind: "project_updated", message: "client-project was marked paid." },
  ]);

  await owner.mutation(projectsApi.setPayment, { projectId: "client-project", paid: false });
  expect(await t.run((ctx) => ctx.db.query("projects").withIndex("by_projectId", (q) => q.eq("id", "client-project")).unique()))
    .toMatchObject({ paid: false });
  expect(await t.run((ctx) => ctx.db.query("projects").withIndex("by_projectId", (q) => q.eq("id", "client-project")).unique()))
    .not.toHaveProperty("paidDate");
});

test("payment rejects generic update, Salary work, and unauthorized team members", async () => {
  const t = convexTest(schema, modules);
  const teamId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Team",
      inviteCode: "PAY123",
      createdAt: "2026-08-01",
    });
    await ctx.db.insert("teamMembers", {
      teamId: id,
      userId: "editor",
      email: "editor@example.com",
      name: "Editor",
      role: "Editor",
      status: "active",
      permissions: { viewProjects: true, manageFinance: true },
      createdAt: "2026-08-01",
    });
    await ctx.db.insert("teamMembers", {
      teamId: id,
      userId: "reviewer",
      email: "reviewer@example.com",
      name: "Reviewer",
      role: "Reviewer",
      status: "active",
      permissions: { viewProjects: true, manageFinance: false },
      createdAt: "2026-08-01",
    });
    await ctx.db.insert("projects", project("team-project", { teamId: id }));
    await ctx.db.insert("projects", project("salary-project", { workType: "Job / Salary" }));
    return id;
  });

  await expect(t.withIdentity({ tokenIdentifier: "owner" }).mutation(projectsApi.update, {
    projectId: "salary-project",
    changes: { paid: true },
  })).rejects.toThrow();
  await expect(t.withIdentity({ tokenIdentifier: "reviewer" }).mutation(projectsApi.setPayment, {
    projectId: "team-project",
    paid: true,
  })).rejects.toThrow("Permission denied");
  await t.withIdentity({ tokenIdentifier: "editor" }).mutation(projectsApi.setPayment, {
    projectId: "team-project",
    paid: true,
  });
  await expect(t.withIdentity({ tokenIdentifier: "owner" }).mutation(projectsApi.setPayment, {
    projectId: "salary-project",
    paid: true,
  })).rejects.toThrow("Salary Projects");
  expect(teamId).toBeTruthy();
});

test("new team role defaults grant finance to Owners and Editors only", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ tokenIdentifier: "owner", name: "Owner" });
  const teamId = await owner.mutation(api.team.createWorkspace, { name: "Team" });
  const member = await t.run((ctx) => ctx.db.query("teamMembers").withIndex("by_teamId", (q) => q.eq("teamId", teamId)).unique());
  expect(member?.permissions.manageFinance).toBe(true);
});
