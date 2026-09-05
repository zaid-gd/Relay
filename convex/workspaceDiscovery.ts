import { readWorkspaceClients } from "./workspaceClients";
import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";

const MAX_PROJECTS = 500;
const MAX_OUTPUTS_PER_PROJECT = 100;
const MAX_FILES_PER_PROJECT = 100;

type VisibleProject = {
  _id: string;
  id: string;
  ownerUserId: string;
  teamId?: string;
  title: string;
  clientId: string;
  status: string;
  workflowStageId: string;
  startDate: string;
  dueDate: string;
  earnings: number;
  paid: boolean;
  paidDate?: string;
  completedAt?: string;
  archived: boolean;
  workType: string;
};

async function visibleProjects(ctx: QueryCtx, userId: string) {
  const personal = await ctx.db
    .query("projects")
    .withIndex("by_ownerUserId_and_teamId", (q) =>
      q.eq("ownerUserId", userId).eq("teamId", undefined)
    )
    .take(MAX_PROJECTS);
  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_userId_and_status", (q) =>
      q.eq("userId", userId).eq("status", "active")
    )
    .first();
  if (!membership?.permissions.viewProjects) return personal;
  const workspaceId = ctx.db.normalizeId("teamWorkspaces", membership.teamId);
  const workspace = workspaceId
    ? await ctx.db.get("teamWorkspaces", workspaceId)
    : null;
  const teamProjects = await ctx.db
    .query("projects")
    .withIndex("by_teamId", (q) => q.eq("teamId", membership.teamId))
    .take(MAX_PROJECTS);
  const visibleTeamProjects =
    membership.role === "Owner" || workspace?.allowAllTeamProjects
      ? teamProjects
      : teamProjects.filter(
          (project) =>
            project.ownerUserId === userId ||
            project.assigneeUserIds.includes(userId)
        );
  return [...personal, ...visibleTeamProjects];
}

async function workspaceSettings(ctx: QueryCtx, ownerUserId: string) {
  return await ctx.db
    .query("settings")
    .withIndex("by_userId", (q) => q.eq("userId", ownerUserId))
    .order("desc")
    .first();
}

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return { clients: [], groups: [], projects: [], outputs: [], files: [] };
    const projects = await visibleProjects(ctx, identity.tokenIdentifier);
    const personalSettings = await workspaceSettings(
      ctx,
      identity.tokenIdentifier
    );
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("status", "active")
      )
      .first();
    const teamOwnerId = membership
      ? await (async () => {
          const workspaceId = ctx.db.normalizeId(
            "teamWorkspaces",
            membership.teamId
          );
          const workspace = workspaceId
            ? await ctx.db.get("teamWorkspaces", workspaceId)
            : null;
          return workspace?.ownerUserId;
        })()
      : undefined;
    const settings = teamOwnerId
      ? await workspaceSettings(ctx, teamOwnerId)
      : personalSettings;
    const includeArchived = args.includeArchived === true;
    const visible = includeArchived
      ? projects
      : projects.filter((project) => !project.archived);
    const clientRecords = (
      await readWorkspaceClients(
        ctx,
        teamOwnerId ?? identity.tokenIdentifier,
        settings?.clients
      )
    ).filter((client) => includeArchived || !client.archived);
    const clientNames = new Map(
      clientRecords.map((client) => [client.id, client.name])
    );
    const groups = membership
      ? await ctx.db
          .query("projectGroups")
          .withIndex("by_teamId", (q) => q.eq("teamId", membership.teamId))
          .take(500)
      : await ctx.db
          .query("projectGroups")
          .withIndex("by_userId_and_teamId", (q) =>
            q.eq("userId", identity.tokenIdentifier).eq("teamId", undefined)
          )
          .take(500);
    const visibleGroups = groups.filter(
      (group) => includeArchived || !group.archived
    );
    const outputs: Array<{
      id: string;
      projectId: string;
      title: string;
      dueDate?: string;
      reviewState: string;
      archived: boolean;
      updatedAt: string;
    }> = [];
    const files: Array<{
      id: string;
      projectId: string;
      projectOutputId?: string;
      title: string;
      fileName?: string;
      category: string;
      status: string;
      updatedAt: string;
      archived: boolean;
      versionId?: string;
      url?: string;
    }> = [];
    for (const project of visible) {
      const projectOutputs = await ctx.db
        .query("projectOutputs")
        .withIndex("by_projectId", (q) => q.eq("projectId", project.id))
        .take(MAX_OUTPUTS_PER_PROJECT);
      for (const output of projectOutputs) {
        if (!includeArchived && output.archived) continue;
        outputs.push({
          id: output.id,
          projectId: output.projectId,
          title: output.title,
          dueDate: output.dueDate,
          reviewState: output.reviewState,
          archived: output.archived,
          updatedAt: output.updatedAt,
        });
      }
      const projectFiles = await ctx.db
        .query("projectFiles")
        .withIndex("by_projectId_and_createdAt", (q) =>
          q.eq("projectId", project.id)
        )
        .order("desc")
        .take(MAX_FILES_PER_PROJECT);
      for (const file of projectFiles) {
        if (!includeArchived && file.archived) continue;
        const version = await ctx.db
          .query("projectFileVersions")
          .withIndex("by_projectFileId_and_versionNumber", (q) =>
            q.eq("projectFileId", file._id)
          )
          .order("desc")
          .first();
        files.push({
          id: file._id,
          projectId: file.projectId,
          projectOutputId: file.projectOutputId
            ? String(file.projectOutputId)
            : undefined,
          title: file.title,
          fileName: version?.fileName,
          category: file.category,
          status: file.status,
          updatedAt: file.updatedAt,
          archived: file.archived ?? false,
          versionId: version?._id,
          url: version?.storageId
            ? ((await ctx.storage.getUrl(version.storageId)) ?? undefined)
            : (version?.externalUrl ?? undefined),
        });
      }
    }
    return {
      clients: clientRecords.map((client) => ({
        id: client.id,
        name: client.name,
        company: client.company,
        archived: client.archived,
      })),
      groups: visibleGroups.map((group) => ({
        id: group.id,
        name: group.name,
        clientId: group.clientId,
        archived: group.archived,
      })),
      projects: visible.map(
        (project): VisibleProject & { clientName: string } => ({
          _id: String(project._id),
          id: project.id,
          ownerUserId: project.ownerUserId,
          teamId: project.teamId,
          title: project.title,
          clientId: project.clientId,
          clientName: clientNames.get(project.clientId) ?? "No client",
          status: project.status,
          workflowStageId: project.workflowStageId,
          startDate: project.startDate,
          dueDate: project.dueDate,
          earnings: project.earnings,
          paid: project.paid,
          paidDate: project.paidDate,
          completedAt: project.completedAt,
          archived: project.archived,
          workType: project.workType,
        })
      ),
      outputs,
      files,
    };
  },
});
