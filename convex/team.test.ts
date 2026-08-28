/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const ownerPermissions = {
  viewProjects: true,
  createProjects: true,
  editProjects: true,
  updateStatus: true,
  commentProjects: true,
  manageTeam: true,
  useChat: true,
};

const reviewerPermissions = {
  viewProjects: true,
  createProjects: false,
  editProjects: false,
  updateStatus: false,
  commentProjects: true,
  manageTeam: false,
  useChat: true,
};

async function setupTeam() {
  const t = convexTest(schema, modules);
  const teamId = await t.run(async (ctx) => {
    const createdAt = new Date().toISOString();
    const workspaceId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Test Team",
      inviteCode: "ABC123",
      createdAt,
    });
    await ctx.db.insert("teamMembers", {
      teamId: workspaceId,
      userId: "owner",
      email: "owner@example.com",
      name: "Owner User",
      role: "Owner",
      status: "active",
      permissions: ownerPermissions,
      createdAt,
      joinedAt: createdAt,
    });
    await ctx.db.insert("teamMembers", {
      teamId: workspaceId,
      userId: "reviewer",
      email: "reviewer@example.com",
      name: "Review User",
      role: "Reviewer",
      status: "active",
      permissions: reviewerPermissions,
      createdAt,
      joinedAt: createdAt,
    });
    return workspaceId;
  });
  return {
    t,
    teamId,
    owner: t.withIdentity({ tokenIdentifier: "owner", name: "Owner User" }),
    reviewer: t.withIdentity({ tokenIdentifier: "reviewer", name: "Review User" }),
  };
}

async function insertProject(
  t: ReturnType<typeof convexTest>,
  teamId: string,
  id = "current-team-project"
) {
  const createdAt = new Date().toISOString();
  await t.run((ctx) =>
    ctx.db.insert("projects", {
      ownerUserId: "owner",
      id,
      teamId,
      assigneeUserIds: ["reviewer"],
      profileId: "video-editing",
      title: "Current team project",
      clientId: "client",
      archived: false,
      status: "In Progress",
      workflowStageId: "editing",
      workflowStages: [
        { id: "planned", label: "Planned", purpose: "planned" },
        { id: "editing", label: "Editing", purpose: "editing" },
        { id: "delivered", label: "Delivered", purpose: "delivered" },
      ],
      workType: "Freelance",
      startDate: "2026-08-28",
      dueDate: "2026-09-04",
      earnings: 500,
      paid: false,
      notes: "",
      createdAt,
      updatedAt: createdAt,
    })
  );
}

describe("team workspace permissions and synchronization", () => {
  test("comments resolve through current Projects", async () => {
    const { t, teamId, owner, reviewer } = await setupTeam();
    await insertProject(t, teamId);

    await reviewer.mutation(api.team.addProjectComment, {
      teamId,
      projectId: "current-team-project",
      body: "Ready for review.",
    });

    await expect(
      owner.query(api.team.listProjectComments, {
        teamId,
        projectId: "current-team-project",
      })
    ).resolves.toMatchObject([{ body: "Ready for review." }]);
  });

  test("workspace settings stay owner-controlled", async () => {
    const { teamId, owner, reviewer } = await setupTeam();
    await owner.mutation(api.team.updateWorkspaceSettings, {
      teamId,
      name: "Updated Workspace",
      currencyCode: "AED",
      timeZone: "Asia/Dubai",
      allowAllTeamProjects: true,
    });
    await expect(
      reviewer.mutation(api.team.updateWorkspaceSettings, {
        teamId,
        name: "Nope",
        currencyCode: "USD",
        timeZone: "UTC",
        allowAllTeamProjects: false,
      })
    ).rejects.toThrow("Workspace Owner");
    await expect(owner.query(api.team.getMyWorkspace, {})).resolves.toMatchObject({
      workspace: {
        name: "Updated Workspace",
        currencyCode: "AED",
        timeZone: "Asia/Dubai",
        allowAllTeamProjects: true,
      },
    });
  });

  test("removed members lose workspace and collaboration access", async () => {
    const { t, teamId, owner, reviewer } = await setupTeam();
    const reviewerId = await t.run(async (ctx) => {
      const member = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId_and_userId", (q) =>
          q.eq("teamId", teamId).eq("userId", "reviewer")
        )
        .unique();
      if (!member) throw new Error("Reviewer missing");
      return member._id;
    });

    await owner.mutation(api.team.removeMember, { teamId, memberId: reviewerId });

    await expect(reviewer.query(api.team.getMyWorkspace, {})).resolves.toBeNull();
    await expect(
      reviewer.mutation(api.team.sendChatMessage, { teamId, body: "Still here" })
    ).rejects.toThrow("Team access required");
  });

  test("mark all notifications reads the full unread batch", async () => {
    const { t, teamId, owner } = await setupTeam();
    await t.run(async (ctx) => {
      for (let index = 0; index < 2; index += 1) {
        await ctx.db.insert("teamNotifications", {
          teamId,
          userId: "owner",
          kind: "project_update",
          message: `Unread notification ${index}`,
          read: false,
          createdAt: `2026-06-10T12:0${index}:00.000Z`,
        });
      }
    });

    await owner.mutation(api.team.markAllNotificationsRead, { teamId });

    const unread = await t.run((ctx) =>
      ctx.db
        .query("teamNotifications")
        .withIndex("by_teamId_and_userId_and_read_and_createdAt", (q) =>
          q.eq("teamId", teamId).eq("userId", "owner").eq("read", false)
        )
        .take(10)
    );
    expect(unread).toHaveLength(0);
  });
});
