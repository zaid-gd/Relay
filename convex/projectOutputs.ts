import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import {
  fileCategoryValidator,
  projectOutputReviewStateValidator,
} from "./domainValidators";

type FunctionCtx = QueryCtx | MutationCtx;

const outputInputValidator = v.object({
  id: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  category: fileCategoryValidator,
  reviewState: v.optional(projectOutputReviewStateValidator),
  dueDate: v.optional(v.string()),
});

async function requireIdentity(ctx: FunctionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

async function requireProjectAccess(
  ctx: FunctionCtx,
  projectId: string,
  permission: "viewProjects" | "editProjects",
) {
  const identity = await requireIdentity(ctx);
  const project = await ctx.db
    .query("projects")
    .withIndex("by_projectId", (q) => q.eq("id", projectId))
    .unique();
  if (!project) throw new Error("Project not found");
  if (!project.teamId) {
    if (project.ownerUserId !== identity.tokenIdentifier) throw new Error("Project access required");
    return { identity, project };
  }
  const teamId = project.teamId;
  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId_and_userId", (q) =>
      q.eq("teamId", teamId).eq("userId", identity.tokenIdentifier))
    .unique();
  if (membership?.status !== "active" || !membership.permissions[permission]) {
    throw new Error("Permission denied");
  }
  return { identity, project };
}

async function outputByPublicId(ctx: FunctionCtx, outputId: string) {
  const output = await ctx.db
    .query("projectOutputs")
    .withIndex("by_outputId", (q) => q.eq("id", outputId))
    .unique();
  if (!output) throw new Error("Project Output not found");
  return output;
}

function cleanRequired(value: string, label: string, maxLength: number) {
  const cleaned = value.trim().slice(0, maxLength);
  if (!cleaned) throw new Error(`${label} is required`);
  return cleaned;
}

function normalizeMediaUrl(raw: string) {
  if (raw.includes("<") || raw.includes(">")) throw new Error("Embed code is not accepted");
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Media URL is invalid");
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    throw new Error("Media URL must use HTTP or HTTPS");
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const segments = url.pathname.split("/").filter(Boolean);
    const videoId = host === "youtu.be"
      ? segments.length === 1 ? segments[0] : undefined
      : url.pathname === "/watch"
        ? url.searchParams.get("v") ?? undefined
        : url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)\/?$/)?.[1];
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      throw new Error("YouTube URL is invalid");
    }
    return { kind: "youtube" as const, url: `https://www.youtube.com/watch?v=${videoId}`, videoId };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const videoId = host === "player.vimeo.com" && parts[0] === "video" && parts.length === 2
      ? parts[1]
      : host === "vimeo.com" && parts.length === 1
        ? parts[0]
        : undefined;
    if (!videoId || !/^\d{6,12}$/.test(videoId)) throw new Error("Vimeo URL is invalid");
    return { kind: "vimeo" as const, url: `https://vimeo.com/${videoId}`, videoId };
  }
  url.hash = "";
  return { kind: "link" as const, url: url.toString() };
}

async function insertOutput(
  ctx: MutationCtx,
  project: { id: string; ownerUserId: string; teamId?: string },
  input: {
    id: string;
    title: string;
    description?: string;
    category: "Deliverable" | "Reference" | "Asset";
    reviewState?: "draft" | "sent_to_client" | "changes_requested" | "approved" | "final_delivered";
    dueDate?: string;
  },
) {
  const id = cleanRequired(input.id, "Project Output id", 80);
  const existing = await ctx.db
    .query("projectOutputs")
    .withIndex("by_outputId", (q) => q.eq("id", id))
    .unique();
  if (existing) {
    if (existing.projectId === project.id) return existing._id;
    throw new Error("Project Output id already exists");
  }
  const now = new Date().toISOString();
  return ctx.db.insert("projectOutputs", {
    ownerUserId: project.ownerUserId,
    projectId: project.id,
    teamId: project.teamId,
    id,
    title: cleanRequired(input.title, "Project Output title", 160),
    description: (input.description ?? "").trim().slice(0, 2000),
    category: input.category,
    reviewState: input.reviewState ?? "draft",
    dueDate: input.dueDate?.trim().slice(0, 40) || undefined,
    archived: false,
    createdAt: now,
    updatedAt: now,
  });
}

export const initializeFromTemplate = mutation({
  args: { projectId: v.string(), outputs: v.array(outputInputValidator) },
  handler: async (ctx, args) => {
    const { project } = await requireProjectAccess(ctx, args.projectId, "editProjects");
    if (args.outputs.length > 20) throw new Error("A Template can initialize at most 20 Project Outputs");
    const normalizedIds = args.outputs.map(({ id }) => id.trim().slice(0, 80));
    if (normalizedIds.some((id) => !id) || new Set(normalizedIds).size !== args.outputs.length) {
      throw new Error("Project Output ids must be unique");
    }
    const existing = await ctx.db
      .query("projectOutputs")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(101);
    const existingIds = new Set(existing.map(({ id }) => id));
    const newCount = normalizedIds.filter((id) => !existingIds.has(id)).length;
    if (existing.length + newCount > 100) throw new Error("A Project can have at most 100 Outputs");
    const ids: Array<Id<"projectOutputs">> = [];
    for (const output of args.outputs) ids.push(await insertOutput(ctx, project, output));
    return ids;
  },
});

export const create = mutation({
  args: { projectId: v.string(), output: outputInputValidator },
  handler: async (ctx, args) => {
    const { project } = await requireProjectAccess(ctx, args.projectId, "editProjects");
    const existing = await ctx.db
      .query("projectOutputs")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(100);
    if (existing.length >= 100) throw new Error("A Project can have at most 100 Outputs");
    return insertOutput(ctx, project, args.output);
  },
});

export const update = mutation({
  args: {
    outputId: v.string(),
    changes: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      category: v.optional(fileCategoryValidator),
      reviewState: v.optional(projectOutputReviewStateValidator),
      dueDate: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    const output = await outputByPublicId(ctx, args.outputId);
    await requireProjectAccess(ctx, output.projectId, "editProjects");
    const title = args.changes.title === undefined
      ? undefined
      : cleanRequired(args.changes.title, "Project Output title", 160);
    await ctx.db.patch(output._id, {
      ...args.changes,
      ...(title === undefined ? {} : { title }),
      ...(args.changes.description === undefined
        ? {}
        : { description: args.changes.description.trim().slice(0, 2000) }),
      dueDate: args.changes.dueDate === null
        ? undefined
        : args.changes.dueDate?.trim().slice(0, 40),
      updatedAt: new Date().toISOString(),
    });
    return null;
  },
});

export const setArchived = mutation({
  args: { outputId: v.string(), archived: v.boolean() },
  handler: async (ctx, args) => {
    const output = await outputByPublicId(ctx, args.outputId);
    await requireProjectAccess(ctx, output.projectId, "editProjects");
    await ctx.db.patch(output._id, { archived: args.archived, updatedAt: new Date().toISOString() });
    return null;
  },
});

export const addLinkedMediaVersion = mutation({
  args: {
    outputId: v.string(),
    version: v.object({ id: v.string(), url: v.string(), title: v.string(), notes: v.optional(v.string()) }),
  },
  handler: async (ctx, args) => {
    const output = await outputByPublicId(ctx, args.outputId);
    const { identity } = await requireProjectAccess(ctx, output.projectId, "editProjects");
    if (output.archived) throw new Error("Archived Project Outputs cannot receive Media Versions");
    const id = cleanRequired(args.version.id, "Media Version id", 80);
    if (await ctx.db.query("projectMediaVersions").withIndex("by_versionId", (q) => q.eq("id", id)).unique()) {
      throw new Error("Media Version id already exists");
    }
    const latest = await ctx.db
      .query("projectMediaVersions")
      .withIndex("by_outputId_and_versionNumber", (q) => q.eq("outputId", output._id))
      .order("desc")
      .first();
    if ((latest?.versionNumber ?? 0) >= 100) throw new Error("A Project Output can have at most 100 Media Versions");
    const now = new Date().toISOString();
    const versionId = await ctx.db.insert("projectMediaVersions", {
      ownerUserId: output.ownerUserId,
      projectId: output.projectId,
      outputId: output._id,
      id,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      source: normalizeMediaUrl(args.version.url),
      title: cleanRequired(args.version.title, "Media Version title", 160),
      notes: (args.version.notes ?? "").trim().slice(0, 2000),
      createdByUserId: identity.tokenIdentifier,
      createdAt: now,
    });
    await ctx.db.patch(output._id, { currentMediaVersionId: versionId, updatedAt: now });
    return versionId;
  },
});

export const listForProject = query({
  args: { projectId: v.string(), includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId, "viewProjects");
    const activeOutputs = await ctx.db
      .query("projectOutputs")
      .withIndex("by_projectId_and_archived", (q) => q.eq("projectId", args.projectId).eq("archived", false))
      .take(100);
    const archivedOutputs = args.includeArchived
      ? await ctx.db.query("projectOutputs")
          .withIndex("by_projectId_and_archived", (q) => q.eq("projectId", args.projectId).eq("archived", true))
          .take(100)
      : [];
    const visibleOutputs = [...activeOutputs, ...archivedOutputs];
    return Promise.all(visibleOutputs.map(async (output) => {
      const versions = await ctx.db
        .query("projectMediaVersions")
        .withIndex("by_outputId_and_versionNumber", (q) => q.eq("outputId", output._id))
        .order("desc")
        .take(100);
      const unresolved = await ctx.db
        .query("mediaVersionComments")
        .withIndex("by_outputId_and_resolved", (q) => q.eq("outputId", output._id).eq("resolved", false))
        .take(500);
      return {
        ...output,
        versions,
        currentVersion: versions.find(({ _id }) => _id === output.currentMediaVersionId) ?? null,
        unresolvedOldVersionCommentCount: unresolved.filter(
          ({ mediaVersionId }) => mediaVersionId !== output.currentMediaVersionId,
        ).length,
      };
    }));
  },
});
