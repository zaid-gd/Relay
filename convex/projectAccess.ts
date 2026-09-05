import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type ProjectPermission =
  "viewProjects" | "editProjects" | "updateStatus" | "manageTeam";

export function canSeeTeamProject(
  project: Doc<"projects">,
  membership: Doc<"teamMembers">,
  allowAllTeamProjects: boolean
) {
  return (
    membership.role === "Owner" ||
    allowAllTeamProjects ||
    project.ownerUserId === membership.userId ||
    project.assigneeUserIds.includes(membership.userId)
  );
}

export async function requireProjectVisibility(
  ctx: QueryCtx | MutationCtx,
  project: Doc<"projects">,
  membership: Doc<"teamMembers">
) {
  const workspaceId = ctx.db.normalizeId("teamWorkspaces", membership.teamId);
  const workspace = workspaceId ? await ctx.db.get(workspaceId) : null;
  if (
    !canSeeTeamProject(
      project,
      membership,
      workspace?.allowAllTeamProjects ?? false
    )
  ) {
    throw new Error("Project access required");
  }
}

// Lists and detail operations must enforce the same project visibility policy.
export async function requireProjectAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: string,
  permission: ProjectPermission = "viewProjects"
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const project = await ctx.db
    .query("projects")
    .withIndex("by_projectId", (q) => q.eq("id", projectId))
    .unique();
  if (!project) throw new Error("Project not found");
  if (!project.teamId) {
    if (project.ownerUserId !== identity.tokenIdentifier)
      throw new Error("Project access required");
    return { identity, project, membership: null };
  }
  const teamId = project.teamId;
  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId_and_userId", (q) =>
      q.eq("teamId", teamId).eq("userId", identity.tokenIdentifier)
    )
    .unique();
  if (
    !membership ||
    membership.status !== "active" ||
    !membership.permissions[permission]
  ) {
    throw new Error("Permission denied");
  }
  await requireProjectVisibility(ctx, project, membership);
  return { identity, project, membership };
}
