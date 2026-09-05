import { requireProjectVisibility } from "./projectAccess";
import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getPublicPortalAccess } from "./projectPortals";

type FunctionCtx = QueryCtx | MutationCtx;
type ProjectPermission = "viewProjects" | "reviewProjects";

const MAX_COMMENTS = 100;
const MAX_COMMENT_BODY = 2_000;
const MAX_AUTHOR_NAME = 120;

async function identity(ctx: FunctionCtx) {
  const value = await ctx.auth.getUserIdentity();
  if (!value) throw new Error("Not authenticated");
  return value;
}

async function projectById(ctx: FunctionCtx, projectId: string) {
  const project = await ctx.db
    .query("projects")
    .withIndex("by_projectId", (q) => q.eq("id", projectId))
    .unique();
  if (!project) throw new Error("Project not found");
  return project;
}

async function requireProjectAccess(
  ctx: FunctionCtx,
  projectId: string,
  permission: ProjectPermission
) {
  const currentIdentity = await identity(ctx);
  const project = await projectById(ctx, projectId);
  if (!project.teamId) {
    if (project.ownerUserId !== currentIdentity.tokenIdentifier)
      throw new Error("Project access required");
    return { identity: currentIdentity, project };
  }

  const teamId = project.teamId;
  const member = await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId_and_userId", (q) =>
      q.eq("teamId", teamId).eq("userId", currentIdentity.tokenIdentifier)
    )
    .unique();
  const permitted =
    member?.permissions[permission] ??
    (permission === "reviewProjects"
      ? member?.permissions.commentProjects
      : false);
  if (!member || member.status !== "active" || !permitted) {
    throw new Error("Permission denied");
  }
  await requireProjectVisibility(ctx, project, member);
  return { identity: currentIdentity, project };
}

async function sharedVersion(
  ctx: FunctionCtx,
  portal: Doc<"projectPortals">,
  outputId: string,
  mediaVersionId: string
) {
  if (!portal.selectedOutputIds.includes(outputId)) return null;
  const output = await ctx.db
    .query("projectOutputs")
    .withIndex("by_outputId", (q) => q.eq("id", outputId))
    .unique();
  if (!output || output.projectId !== portal.projectId || output.archived)
    return null;
  const version = await ctx.db
    .query("projectMediaVersions")
    .withIndex("by_versionId", (q) => q.eq("id", mediaVersionId))
    .unique();
  if (
    !version ||
    version.outputId !== output._id ||
    output.currentMediaVersionId !== version._id
  )
    return null;
  return { output, version };
}

function publicComment(
  comment: Doc<"mediaVersionComments">,
  outputId: string,
  mediaVersionId: string
) {
  return {
    id: comment._id,
    outputId,
    mediaVersionId,
    authorName: comment.authorName,
    body: comment.body,
    resolved: comment.resolved,
    createdAt: comment.createdAt,
    resolvedAt: comment.resolvedAt ?? null,
  };
}

async function currentComments(ctx: QueryCtx, portal: Doc<"projectPortals">) {
  const comments: Array<ReturnType<typeof publicComment>> = [];
  for (const outputId of portal.selectedOutputIds.slice(0, 20)) {
    const output = await ctx.db
      .query("projectOutputs")
      .withIndex("by_outputId", (q) => q.eq("id", outputId))
      .unique();
    if (
      !output ||
      output.projectId !== portal.projectId ||
      output.archived ||
      !output.currentMediaVersionId
    )
      continue;
    const versions = await ctx.db
      .query("projectMediaVersions")
      .withIndex("by_outputId_and_versionNumber", (q) =>
        q.eq("outputId", output._id)
      )
      .take(100);
    const current = versions.find(
      (version) => version._id === output.currentMediaVersionId
    );
    if (!current) continue;
    const rows = await ctx.db
      .query("mediaVersionComments")
      .withIndex("by_mediaVersionId", (q) =>
        q.eq("mediaVersionId", current._id)
      )
      .order("desc")
      .take(MAX_COMMENTS);
    comments.push(
      ...rows.map((comment) => publicComment(comment, output.id, current.id))
    );
  }
  return comments
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, MAX_COMMENTS);
}

export const listForPortal = query({
  args: { token: v.string(), pin: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const result = await getPublicPortalAccess(ctx, args.token, args.pin);
    if (!result.portal) return { access: result.access, comments: [] };
    return {
      access: "active" as const,
      comments: await currentComments(ctx, result.portal),
    };
  },
});

export const addPublicComment = mutation({
  args: {
    token: v.string(),
    pin: v.optional(v.string()),
    outputId: v.string(),
    mediaVersionId: v.string(),
    authorName: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await getPublicPortalAccess(ctx, args.token, args.pin);
    if (!result.portal) throw new Error(`Portal access ${result.access}`);
    const authorName = args.authorName.trim().slice(0, MAX_AUTHOR_NAME);
    const body = args.body.trim().slice(0, MAX_COMMENT_BODY);
    if (!authorName) throw new Error("Display name is required");
    if (!body) throw new Error("Comment cannot be empty");
    const shared = await sharedVersion(
      ctx,
      result.portal,
      args.outputId,
      args.mediaVersionId
    );
    if (!shared)
      throw new Error(
        "Comments can only be added to the current shared Media Version"
      );
    const commentId = await ctx.db.insert("mediaVersionComments", {
      ownerUserId: result.portal.ownerUserId,
      projectId: result.portal.projectId,
      outputId: shared.output._id,
      mediaVersionId: shared.version._id,
      authorName,
      body,
      resolved: false,
      createdAt: new Date().toISOString(),
    });
    const comment = await ctx.db.get("mediaVersionComments", commentId);
    if (!comment) throw new Error("Comment could not be stored");
    return publicComment(comment, shared.output.id, shared.version.id);
  },
});

export const reopenPublicComment = mutation({
  args: {
    token: v.string(),
    pin: v.optional(v.string()),
    commentId: v.id("mediaVersionComments"),
  },
  handler: async (ctx, args) => {
    const result = await getPublicPortalAccess(ctx, args.token, args.pin);
    if (!result.portal) throw new Error(`Portal access ${result.access}`);
    const comment = await ctx.db.get("mediaVersionComments", args.commentId);
    if (!comment || comment.projectId !== result.portal.projectId)
      throw new Error("Comment not found");
    const output = await ctx.db.get("projectOutputs", comment.outputId);
    if (!output) throw new Error("Comment Output not found");
    const version = await ctx.db.get(
      "projectMediaVersions",
      comment.mediaVersionId
    );
    if (!version) throw new Error("Comment Media Version not found");
    const shared = await sharedVersion(
      ctx,
      result.portal,
      output.id,
      version.id
    );
    if (!shared)
      throw new Error(
        "Only comments on the current shared Media Version can be reopened"
      );
    await ctx.db.patch(comment._id, { resolved: false, resolvedAt: undefined });
    const updated = await ctx.db.get("mediaVersionComments", comment._id);
    if (!updated) throw new Error("Comment could not be reopened");
    return publicComment(updated, output.id, version.id);
  },
});

export const listForProject = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId, "viewProjects");
    const outputs = await ctx.db
      .query("projectOutputs")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(100);
    const outputById = new Map(
      outputs.map((output) => [output._id, output.id])
    );
    const comments: Array<ReturnType<typeof publicComment>> = [];
    for (const output of outputs) {
      const versions = await ctx.db
        .query("projectMediaVersions")
        .withIndex("by_outputId_and_versionNumber", (q) =>
          q.eq("outputId", output._id)
        )
        .take(100);
      const versionById = new Map(
        versions.map((version) => [version._id, version.id])
      );
      const rows = await ctx.db
        .query("mediaVersionComments")
        .withIndex("by_outputId_and_resolved", (q) =>
          q.eq("outputId", output._id)
        )
        .order("desc")
        .take(MAX_COMMENTS);
      comments.push(
        ...rows.map((comment) =>
          publicComment(
            comment,
            outputById.get(comment.outputId) ?? comment.outputId,
            versionById.get(comment.mediaVersionId) ?? comment.mediaVersionId
          )
        )
      );
    }
    return comments
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, MAX_COMMENTS);
  },
});

export const setResolved = mutation({
  args: { commentId: v.id("mediaVersionComments"), resolved: v.boolean() },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get("mediaVersionComments", args.commentId);
    if (!comment) throw new Error("Comment not found");
    await requireProjectAccess(ctx, comment.projectId, "reviewProjects");
    const resolvedAt = args.resolved ? new Date().toISOString() : undefined;
    await ctx.db.patch(comment._id, { resolved: args.resolved, resolvedAt });
    const updated = await ctx.db.get("mediaVersionComments", comment._id);
    if (!updated) throw new Error("Comment could not be updated");
    const [output, version] = await Promise.all([
      ctx.db.get("projectOutputs", updated.outputId),
      ctx.db.get("projectMediaVersions", updated.mediaVersionId),
    ]);
    return publicComment(
      updated,
      output?.id ?? updated.outputId,
      version?.id ?? updated.mediaVersionId
    );
  },
});
