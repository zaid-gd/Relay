import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  insertPendingFreeProjection,
  requireWorkspaceCapability,
} from "./workspaceSubscriptions";
import { recordProjectActivity } from "./projectActivity";
import { teamRoleValidator } from "./domainValidators";
import type {
  NotificationKind,
  TeamActivityKind,
  TeamRole,
} from "../src/lib/domain-values";
import {
  formatTimecodedDetail,
  normalizeOptionalTimecode,
} from "../src/lib/timecode";

const MAX_TEAM_MEMBERS = 3;
const TEAM_WORKSPACE_NAME_LIMIT = 80;
const TEAM_PERMISSION_KEYS = [
  "viewProjects",
  "createProjects",
  "editProjects",
  "updateStatus",
  "commentProjects",
  "reviewProjects",
  "managePortal",
  "manageFinance",
  "manageTeam",
  "useChat",
] as const;

const permissionDefaults: Record<TeamRole, Record<string, boolean>> = {
  Owner: {
    viewProjects: true,
    createProjects: true,
    editProjects: true,
    updateStatus: true,
    commentProjects: true,
    reviewProjects: true,
    managePortal: true,
    manageFinance: true,
    manageTeam: true,
    useChat: true,
  },
  Editor: {
    viewProjects: true,
    createProjects: true,
    editProjects: true,
    updateStatus: true,
    commentProjects: true,
    reviewProjects: true,
    managePortal: true,
    manageFinance: false,
    manageTeam: false,
    useChat: true,
  },
  Reviewer: {
    viewProjects: true,
    createProjects: false,
    editProjects: false,
    updateStatus: false,
    commentProjects: true,
    reviewProjects: true,
    managePortal: false,
    manageFinance: false,
    manageTeam: false,
    useChat: true,
  },
};

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

function actorName(identity: Awaited<ReturnType<typeof requireIdentity>>) {
  return identity.name || identity.nickname || identity.email || "Team member";
}

function normalizePermissions(
  role: TeamRole,
  requested?: Record<string, boolean>
) {
  const defaults = permissionDefaults[role];
  return Object.fromEntries(
    TEAM_PERMISSION_KEYS.map((key) => [
      key,
      requested?.[key] ?? defaults[key] ?? false,
    ])
  );
}

function normalizeWorkspaceSettings(args: {
  name: string;
  currencyCode: string;
  timeZone: string;
  defaultWorkflowTemplateId?: string;
  allowAllTeamProjects: boolean;
}) {
  const name = args.name.trim().slice(0, TEAM_WORKSPACE_NAME_LIMIT);
  const currencyCode = args.currencyCode.trim().toUpperCase();
  const timeZone = args.timeZone.trim().slice(0, 80);
  if (!name) throw new Error("Workspace name is required");
  if (!/^[A-Z]{3}$/.test(currencyCode))
    throw new Error("Currency must be a three-letter code");
  if (!timeZone) throw new Error("Time zone is required");
  return {
    name,
    currencyCode,
    timeZone,
    allowAllTeamProjects: args.allowAllTeamProjects,
    ...(args.defaultWorkflowTemplateId?.trim()
      ? {
          defaultWorkflowTemplateId: args.defaultWorkflowTemplateId
            .trim()
            .slice(0, 120),
        }
      : {}),
  };
}

function inviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function uniqueInviteCode(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = inviteCode();
    const existing = await ctx.db
      .query("teamWorkspaces")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .unique();
    if (!existing) return code;
  }
  throw new Error("Could not create a unique invite code");
}

function mentionsFrom(body: string) {
  const matches = body.match(/@[\w.-]+/g) ?? [];
  return [
    ...new Set(matches.map((mention) => mention.slice(1).toLowerCase())),
  ].slice(0, 8);
}

async function findActiveMembership(
  ctx: QueryCtx | MutationCtx,
  teamId: string,
  userId: string
) {
  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId_and_userId", (q) =>
      q.eq("teamId", teamId).eq("userId", userId)
    )
    .unique();
  if (!membership || membership.status !== "active")
    throw new Error("Team access required");
  return membership;
}

async function requirePermission(
  ctx: MutationCtx,
  teamId: string,
  permission: string
) {
  const identity = await requireIdentity(ctx);
  const member = await findActiveMembership(
    ctx,
    teamId,
    identity.tokenIdentifier
  );
  if (!member.permissions[permission]) throw new Error("Permission denied");
  return { identity, member };
}

async function requireTeamProject(
  ctx: QueryCtx | MutationCtx,
  teamId: string,
  projectId: string
) {
  const project = await ctx.db
    .query("projects")
    .withIndex("by_teamId_and_id", (q) =>
      q.eq("teamId", teamId).eq("id", projectId)
    )
    .unique();
  if (!project) throw new Error("Team project not found");
  return project;
}

async function logActivity(
  ctx: MutationCtx,
  args: {
    teamId: string;
    actorUserId: string;
    actorName: string;
    kind: TeamActivityKind;
    message: string;
    projectId?: string;
  }
) {
  await ctx.db.insert("teamActivity", {
    ...args,
    createdAt: new Date().toISOString(),
  });
}

async function notifyMentionedMembers(
  ctx: MutationCtx,
  args: {
    teamId: string;
    mentions: string[];
    message: string;
    kind: NotificationKind;
    projectId?: string;
    senderUserId: string;
    requiredPermission?: string;
  }
) {
  const members = await membersMatchingMentions(ctx, args);
  if (!members.length) return;
  const createdAt = new Date().toISOString();
  await Promise.all(
    members.map((member) =>
      ctx.db.insert("teamNotifications", {
        teamId: args.teamId,
        userId: member.userId,
        kind: args.kind,
        projectId: args.projectId,
        message: args.message,
        read: false,
        createdAt,
      })
    )
  );
}

async function membersMatchingMentions(
  ctx: MutationCtx,
  args: {
    teamId: string;
    mentions: string[];
    senderUserId: string;
    requiredPermission?: string;
  }
) {
  if (!args.mentions.length) return [];
  const members = await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
    .take(MAX_TEAM_MEMBERS + 1);
  return members.filter((member) => {
    if (member.status !== "active" || member.userId === args.senderUserId)
      return false;
    if (args.requiredPermission && !member.permissions[args.requiredPermission])
      return false;
    const normalizedName = member.name.trim().toLowerCase();
    const nameToken = normalizedName.replace(/\s+/g, ".");
    const firstNameToken = normalizedName.split(/\s+/)[0] ?? "";
    const compactNameToken = normalizedName.replace(/\s+/g, "");
    const emailToken = normalizeEmail(member.email).split("@")[0];
    return [nameToken, firstNameToken, compactNameToken, emailToken].some(
      (token) => token.length > 0 && args.mentions.includes(token)
    );
  });
}

async function notifyProjectParticipants(
  ctx: MutationCtx,
  args: {
    teamId: string;
    senderUserId: string;
    project: Doc<"projects">;
    message: string;
    excludeUserIds?: string[];
  }
) {
  const recipientIds = [
    ...new Set([
      args.project.ownerUserId,
      ...(args.project.assigneeUserIds ?? []),
    ]),
  ];
  const excludedUserIds = new Set([
    args.senderUserId,
    ...(args.excludeUserIds ?? []),
  ]);
  const createdAt = new Date().toISOString();
  await Promise.all(
    recipientIds
      .filter((userId): userId is string =>
        Boolean(userId && !excludedUserIds.has(userId))
      )
      .slice(0, MAX_TEAM_MEMBERS)
      .map((userId) =>
        ctx.db.insert("teamNotifications", {
          teamId: args.teamId,
          userId,
          kind: "project_comment",
          projectId: args.project.id,
          message: args.message,
          read: false,
          createdAt,
        })
      )
  );
}

async function cleanupRemovedMemberProjects(
  ctx: MutationCtx,
  args: { teamId: string; memberUserId: string; transferOwnerUserId: string }
) {
  let reassignedProjectCount = 0;
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
    .take(500);
  const projectUpdates = projects
    .map((project) => {
      const patch: { assigneeUserIds?: string[]; ownerUserId?: string } = {};
      if ((project.assigneeUserIds ?? []).includes(args.memberUserId)) {
        patch.assigneeUserIds = (project.assigneeUserIds ?? []).filter(
          (userId) => userId !== args.memberUserId
        );
      }
      if (project.ownerUserId === args.memberUserId) {
        patch.ownerUserId = args.transferOwnerUserId;
        reassignedProjectCount += 1;
      }
      return Object.keys(patch).length
        ? ctx.db.patch(project._id, patch)
        : null;
    })
    .filter((update): update is Promise<void> => update !== null);
  await Promise.all(projectUpdates);
  return reassignedProjectCount;
}

export const getMyWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const currentMember = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("status", "active")
      )
      .first();
    if (!currentMember) return null;

    const workspace = await ctx.db.get(
      currentMember.teamId as Doc<"teamWorkspaces">["_id"]
    );
    if (!workspace) return null;

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", currentMember.teamId))
      .take(MAX_TEAM_MEMBERS + 1);
    const activity = await ctx.db
      .query("teamActivity")
      .withIndex("by_teamId_and_createdAt", (q) =>
        q.eq("teamId", currentMember.teamId)
      )
      .order("desc")
      .take(40);
    const chat = currentMember.permissions.useChat
      ? await ctx.db
          .query("teamChatMessages")
          .withIndex("by_teamId_and_createdAt", (q) =>
            q.eq("teamId", currentMember.teamId)
          )
          .order("desc")
          .take(40)
      : [];
    const notifications = await ctx.db
      .query("teamNotifications")
      .withIndex("by_teamId_and_userId_and_createdAt", (q) =>
        q
          .eq("teamId", currentMember.teamId)
          .eq("userId", identity.tokenIdentifier)
      )
      .order("desc")
      .take(25);

    return {
      workspace,
      currentMember,
      members,
      activity,
      chat: chat.reverse(),
      notifications,
    };
  },
});

export const listProjectComments = query({
  args: { teamId: v.string(), projectId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const member = await findActiveMembership(
      ctx,
      args.teamId,
      identity.tokenIdentifier
    );
    if (!member.permissions.viewProjects) throw new Error("Permission denied");
    await requireTeamProject(ctx, args.teamId, args.projectId);
    const comments = await ctx.db
      .query("projectComments")
      .withIndex("by_teamId_and_projectId", (q) =>
        q.eq("teamId", args.teamId).eq("projectId", args.projectId)
      )
      .order("desc")
      .take(40);
    return comments.reverse();
  },
});

export const createWorkspace = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const workspaceName = (args.name.trim() || "Relay Team").slice(
      0,
      TEAM_WORKSPACE_NAME_LIMIT
    );
    const activeMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("status", "active")
      )
      .first();
    if (activeMembership) return activeMembership.teamId;

    const now = new Date().toISOString();
    const workspaceId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: identity.tokenIdentifier,
      name: workspaceName,
      inviteCode: await uniqueInviteCode(ctx),
      createdAt: now,
      allowAllTeamProjects: false,
      currencyCode: "USD",
      timeZone: "UTC",
    });
    await ctx.db.insert("teamMembers", {
      teamId: workspaceId,
      userId: identity.tokenIdentifier,
      email: normalizeEmail(identity.email),
      name: actorName(identity),
      role: "Owner",
      status: "active",
      permissions: permissionDefaults.Owner,
      createdAt: now,
      joinedAt: now,
    });
    await insertPendingFreeProjection(ctx, workspaceId);
    await ctx.scheduler.runAfter(
      0,
      internal.workspaceSubscriptionProvisioning.provision,
      {
        workspaceId,
        workspaceName,
        clerkUserId: identity.subject,
      }
    );
    await logActivity(ctx, {
      teamId: workspaceId,
      actorUserId: identity.tokenIdentifier,
      actorName: actorName(identity),
      kind: "workspace_created",
      message: `${actorName(identity)} created the team workspace.`,
    });
    return workspaceId;
  },
});

export const updateWorkspaceProjectPolicy = mutation({
  args: { allowAllTeamProjects: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("status", "active")
      )
      .first();
    if (!membership || membership.role !== "Owner")
      throw new Error("Only a Workspace Owner can change Project visibility");
    const workspace = await ctx.db.get(
      membership.teamId as Doc<"teamWorkspaces">["_id"]
    );
    if (!workspace) throw new Error("Workspace not found");
    await ctx.db.patch(workspace._id, {
      allowAllTeamProjects: args.allowAllTeamProjects,
    });
    return null;
  },
});

export const updateWorkspaceSettings = mutation({
  args: {
    teamId: v.string(),
    name: v.string(),
    currencyCode: v.string(),
    timeZone: v.string(),
    defaultWorkflowTemplateId: v.optional(v.string()),
    allowAllTeamProjects: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const membership = await findActiveMembership(
      ctx,
      args.teamId,
      identity.tokenIdentifier
    );
    if (membership.role !== "Owner")
      throw new Error("Only the Workspace Owner can change workspace settings");
    const workspace = await ctx.db.get(
      args.teamId as Doc<"teamWorkspaces">["_id"]
    );
    if (!workspace) throw new Error("Workspace not found");
    await ctx.db.patch(workspace._id, normalizeWorkspaceSettings(args));
  },
});

export const inviteMember = mutation({
  args: { teamId: v.string(), email: v.string(), role: teamRoleValidator },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(
      ctx,
      args.teamId,
      "manageTeam"
    );
    const workspaceId = ctx.db.normalizeId("teamWorkspaces", args.teamId);
    if (!workspaceId) throw new Error("Workspace not found");
    await requireWorkspaceCapability(ctx, workspaceId, "teamFeatures");
    const email = normalizeEmail(args.email);
    if (!email.includes("@")) throw new Error("Enter a valid email address");

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .take(MAX_TEAM_MEMBERS + 1);
    if (members.length >= MAX_TEAM_MEMBERS)
      throw new Error(
        "Free workspaces are limited to one Owner and two invited members"
      );

    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_and_email", (q) =>
        q.eq("teamId", args.teamId).eq("email", email)
      )
      .unique();
    if (existing) throw new Error("That member is already invited or active");

    await ctx.db.insert("teamMembers", {
      teamId: args.teamId,
      userId: "",
      email,
      name: email.split("@")[0],
      role: args.role,
      status: "invited",
      permissions: normalizePermissions(args.role),
      createdAt: new Date().toISOString(),
    });
    await logActivity(ctx, {
      teamId: args.teamId,
      actorUserId: identity.tokenIdentifier,
      actorName: actorName(identity),
      kind: "member_invited",
      message: `${actorName(identity)} invited ${email} as ${args.role}.`,
    });
  },
});

export const joinWorkspace = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const email = normalizeEmail(identity.email);
    const existingActiveMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("status", "active")
      )
      .first();
    const workspace = await ctx.db
      .query("teamWorkspaces")
      .withIndex("by_inviteCode", (q) =>
        q.eq("inviteCode", args.inviteCode.trim().toUpperCase())
      )
      .unique();
    if (!workspace) throw new Error("Invite code not found");
    if (
      existingActiveMembership &&
      existingActiveMembership.teamId !== workspace._id
    ) {
      throw new Error("You are already active in another team workspace");
    }

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", workspace._id))
      .take(MAX_TEAM_MEMBERS + 1);
    const userMember = members.find(
      (member) => member.userId === identity.tokenIdentifier
    );
    if (userMember?.status === "active") return workspace._id;
    if (
      members.filter((member) => member.status === "active").length >=
      MAX_TEAM_MEMBERS
    ) {
      throw new Error("This team is already full");
    }

    const pendingInvites = members.filter(
      (member) => member.status === "invited"
    );
    const invitedMember = email
      ? pendingInvites.find((member) => member.email === email)
      : pendingInvites.length === 1
        ? pendingInvites[0]
        : null;
    if (!email && pendingInvites.length > 1) {
      throw new Error(
        "Your account needs an email address to join this team when multiple invites are pending"
      );
    }
    if (!invitedMember)
      throw new Error("Your email address is not invited to this team");
    const now = new Date().toISOString();
    await ctx.db.patch(invitedMember._id, {
      userId: identity.tokenIdentifier,
      name: actorName(identity),
      status: "active",
      joinedAt: now,
    });
    await logActivity(ctx, {
      teamId: workspace._id,
      actorUserId: identity.tokenIdentifier,
      actorName: actorName(identity),
      kind: "member_joined",
      message: `${actorName(identity)} joined the workspace.`,
    });
    if (workspace.ownerUserId !== identity.tokenIdentifier) {
      await ctx.db.insert("teamNotifications", {
        teamId: workspace._id,
        userId: workspace.ownerUserId,
        kind: "member_joined",
        message: `${actorName(identity)} joined your workspace.`,
        read: false,
        createdAt: now,
      });
    }
    return workspace._id;
  },
});

export const updateMemberRole = mutation({
  args: {
    teamId: v.string(),
    memberId: v.id("teamMembers"),
    role: teamRoleValidator,
  },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(
      ctx,
      args.teamId,
      "manageTeam"
    );
    if (args.role === "Owner")
      throw new Error("Owner role cannot be assigned here");
    const member = await ctx.db.get(args.memberId);
    if (!member || member.teamId !== args.teamId)
      throw new Error("Team member not found");
    if (member.role === "Owner")
      throw new Error("Owner role cannot be changed");
    await ctx.db.patch(args.memberId, {
      role: args.role,
      permissions: normalizePermissions(args.role),
    });
    await logActivity(ctx, {
      teamId: args.teamId,
      actorUserId: identity.tokenIdentifier,
      actorName: actorName(identity),
      kind: "member_role_updated",
      message: `${actorName(identity)} changed ${member.name} to ${args.role}.`,
    });
    if (member.userId) {
      await ctx.db.insert("teamNotifications", {
        teamId: args.teamId,
        userId: member.userId,
        kind: "role_updated",
        message: `Your team role was changed to ${args.role}.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  },
});

export const updateMemberPermissions = mutation({
  args: {
    teamId: v.string(),
    memberId: v.id("teamMembers"),
    permissions: v.record(v.string(), v.boolean()),
  },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(
      ctx,
      args.teamId,
      "manageTeam"
    );
    const owner = await findActiveMembership(
      ctx,
      args.teamId,
      identity.tokenIdentifier
    );
    if (owner.role !== "Owner")
      throw new Error("Only the Workspace Owner can change member permissions");
    const member = await ctx.db.get(args.memberId);
    if (!member || member.teamId !== args.teamId)
      throw new Error("Team member not found");
    if (member.role === "Owner")
      throw new Error("Owner permissions cannot be changed");
    await ctx.db.patch(args.memberId, {
      permissions: normalizePermissions(
        member.role === "Client" ? "Reviewer" : member.role,
        args.permissions
      ),
    });
    await logActivity(ctx, {
      teamId: args.teamId,
      actorUserId: identity.tokenIdentifier,
      actorName: actorName(identity),
      kind: "member_role_updated",
      message: `${actorName(identity)} updated permissions for ${member.name}.`,
    });
  },
});

export const transferOwnership = mutation({
  args: { teamId: v.string(), memberId: v.id("teamMembers") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const currentOwner = await findActiveMembership(
      ctx,
      args.teamId,
      identity.tokenIdentifier
    );
    if (currentOwner.role !== "Owner")
      throw new Error("Only the Workspace Owner can transfer ownership");
    const nextOwner = await ctx.db.get(args.memberId);
    if (
      !nextOwner ||
      nextOwner.teamId !== args.teamId ||
      nextOwner.status !== "active"
    ) {
      throw new Error("Choose an active team member");
    }
    if (
      nextOwner.userId === identity.tokenIdentifier ||
      nextOwner.role === "Owner"
    ) {
      throw new Error("Choose a different team member");
    }
    const workspace = await ctx.db.get(
      args.teamId as Doc<"teamWorkspaces">["_id"]
    );
    if (!workspace) throw new Error("Workspace not found");
    const now = new Date().toISOString();
    await ctx.db.patch(workspace._id, { ownerUserId: nextOwner.userId });
    await ctx.db.patch(currentOwner._id, {
      role: "Editor",
      permissions: normalizePermissions("Editor"),
    });
    await ctx.db.patch(nextOwner._id, {
      role: "Owner",
      permissions: normalizePermissions("Owner"),
    });
    await logActivity(ctx, {
      teamId: args.teamId,
      actorUserId: identity.tokenIdentifier,
      actorName: actorName(identity),
      kind: "member_role_updated",
      message: `${actorName(identity)} transferred workspace ownership to ${nextOwner.name}.`,
    });
    await ctx.db.insert("teamNotifications", {
      teamId: args.teamId,
      userId: nextOwner.userId,
      kind: "role_updated",
      message: "You are now the Workspace Owner.",
      read: false,
      createdAt: now,
    });
  },
});

export const normalizeLegacyRoles = mutation({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(
      ctx,
      args.teamId,
      "manageTeam"
    );
    const members = [];
    const memberQuery = ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId));
    for await (const member of memberQuery) {
      members.push(member);
    }
    const legacyMembers = members.filter((member) => member.role === "Client");
    if (!legacyMembers.length) return 0;
    const now = new Date().toISOString();
    await Promise.all(
      legacyMembers.map(async (member) => {
        await ctx.db.patch(member._id, {
          role: "Reviewer",
          permissions: permissionDefaults.Reviewer,
        });
        if (member.userId) {
          await ctx.db.insert("teamNotifications", {
            teamId: args.teamId,
            userId: member.userId,
            kind: "role_updated",
            message:
              "Your legacy Client workspace role was updated to Reviewer.",
            read: false,
            createdAt: now,
          });
        }
      })
    );
    await logActivity(ctx, {
      teamId: args.teamId,
      actorUserId: identity.tokenIdentifier,
      actorName: actorName(identity),
      kind: "legacy_roles_normalized",
      message: `${actorName(identity)} updated ${legacyMembers.length} legacy Client role${legacyMembers.length === 1 ? "" : "s"} to Reviewer.`,
    });
    return legacyMembers.length;
  },
});

export const removeMember = mutation({
  args: { teamId: v.string(), memberId: v.id("teamMembers") },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(
      ctx,
      args.teamId,
      "manageTeam"
    );
    const member = await ctx.db.get(args.memberId);
    if (!member || member.teamId !== args.teamId)
      throw new Error("Team member not found");
    if (member.role === "Owner") throw new Error("Owner cannot be removed");
    if (member.userId === identity.tokenIdentifier)
      throw new Error("You cannot remove yourself");

    const reassignedProjectCount = member.userId
      ? await cleanupRemovedMemberProjects(ctx, {
          teamId: args.teamId,
          memberUserId: member.userId,
          transferOwnerUserId: identity.tokenIdentifier,
        })
      : 0;
    await ctx.db.delete(args.memberId);
    await logActivity(ctx, {
      teamId: args.teamId,
      actorUserId: identity.tokenIdentifier,
      actorName: actorName(identity),
      kind: "member_removed",
      message: `${actorName(identity)} removed ${member.email || member.name} from the workspace.${reassignedProjectCount ? ` ${reassignedProjectCount} owned project${reassignedProjectCount === 1 ? "" : "s"} transferred to ${actorName(identity)}.` : ""}`,
    });
  },
});

export const leaveWorkspace = mutation({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const member = await findActiveMembership(
      ctx,
      args.teamId,
      identity.tokenIdentifier
    );
    if (member.role === "Owner")
      throw new Error("Team owners must transfer ownership before leaving");
    const workspace = await ctx.db.get(
      args.teamId as Doc<"teamWorkspaces">["_id"]
    );
    if (!workspace) throw new Error("Team workspace not found");

    const reassignedProjectCount = await cleanupRemovedMemberProjects(ctx, {
      teamId: args.teamId,
      memberUserId: identity.tokenIdentifier,
      transferOwnerUserId: workspace.ownerUserId,
    });
    await ctx.db.delete(member._id);
    await logActivity(ctx, {
      teamId: args.teamId,
      actorUserId: identity.tokenIdentifier,
      actorName: actorName(identity),
      kind: "member_left",
      message: `${actorName(identity)} left the workspace.${reassignedProjectCount ? ` ${reassignedProjectCount} owned project${reassignedProjectCount === 1 ? "" : "s"} transferred to the workspace owner.` : ""}`,
    });
    if (workspace.ownerUserId !== identity.tokenIdentifier) {
      await ctx.db.insert("teamNotifications", {
        teamId: args.teamId,
        userId: workspace.ownerUserId,
        kind: "member_left",
        message: `${actorName(identity)} left the workspace.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  },
});

export const sendChatMessage = mutation({
  args: { teamId: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(ctx, args.teamId, "useChat");
    const body = args.body.trim();
    if (!body) throw new Error("Message cannot be empty");
    const storedBody = body.slice(0, 800);
    const mentions = mentionsFrom(storedBody);
    await ctx.db.insert("teamChatMessages", {
      teamId: args.teamId,
      authorUserId: identity.tokenIdentifier,
      authorName: actorName(identity),
      body: storedBody,
      mentions,
      createdAt: new Date().toISOString(),
    });
    await logActivity(ctx, {
      teamId: args.teamId,
      actorUserId: identity.tokenIdentifier,
      actorName: actorName(identity),
      kind: "chat_message",
      message: `${actorName(identity)} posted in team chat.`,
    });
    await notifyMentionedMembers(ctx, {
      teamId: args.teamId,
      mentions,
      kind: "mention",
      message: `${actorName(identity)} mentioned you in team chat.`,
      senderUserId: identity.tokenIdentifier,
      requiredPermission: "useChat",
    });
  },
});

export const addProjectComment = mutation({
  args: {
    teamId: v.string(),
    projectId: v.string(),
    body: v.string(),
    timecode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity, member } = await requirePermission(
      ctx,
      args.teamId,
      "commentProjects"
    );
    if (!member.permissions.viewProjects) throw new Error("Permission denied");
    const project = await requireTeamProject(ctx, args.teamId, args.projectId);
    const body = args.body.trim();
    if (!body) throw new Error("Comment cannot be empty");
    const storedBody = body.slice(0, 1000);
    const timecode = normalizeOptionalTimecode(args.timecode);
    const mentions = mentionsFrom(storedBody);
    const mentionedMembers = await membersMatchingMentions(ctx, {
      teamId: args.teamId,
      mentions,
      senderUserId: identity.tokenIdentifier,
    });
    await ctx.db.insert("projectComments", {
      teamId: args.teamId,
      projectId: args.projectId,
      authorUserId: identity.tokenIdentifier,
      authorName: actorName(identity),
      body: storedBody,
      timecode,
      mentions,
      createdAt: new Date().toISOString(),
    });
    await logActivity(ctx, {
      teamId: args.teamId,
      actorUserId: identity.tokenIdentifier,
      actorName: actorName(identity),
      kind: "project_comment",
      projectId: args.projectId,
      message: `${actorName(identity)} commented on ${project.title}.`,
    });
    await recordProjectActivity(ctx, {
      project,
      actorUserId: identity.tokenIdentifier,
      actorName: actorName(identity),
      kind: "team_note_added",
      message: `${actorName(identity)} added a team note.`,
      detail: formatTimecodedDetail(timecode, storedBody),
    });
    await notifyProjectParticipants(ctx, {
      teamId: args.teamId,
      senderUserId: identity.tokenIdentifier,
      project,
      message: `${actorName(identity)} commented on ${project.title}.`,
      excludeUserIds: mentionedMembers.map((member) => member.userId),
    });
    await notifyMentionedMembers(ctx, {
      teamId: args.teamId,
      projectId: args.projectId,
      mentions,
      kind: "project_mention",
      message: `${actorName(identity)} mentioned you in a project comment.`,
      senderUserId: identity.tokenIdentifier,
    });
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id("teamNotifications") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== identity.tokenIdentifier) {
      throw new Error("Notification not found");
    }
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllNotificationsRead = mutation({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await findActiveMembership(ctx, args.teamId, identity.tokenIdentifier);
    const notifications = await ctx.db
      .query("teamNotifications")
      .withIndex("by_teamId_and_userId_and_read_and_createdAt", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("userId", identity.tokenIdentifier)
          .eq("read", false)
      )
      .order("desc")
      .take(50);
    await Promise.all(
      notifications.map((notification) =>
        ctx.db.patch(notification._id, { read: true })
      )
    );
  },
});
