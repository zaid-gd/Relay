import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { recordProjectActivity } from "./projectActivity";
import { getPublicPortalAccess } from "./projectPortals";
import {
  fileCategoryValidator,
  fileProviderValidator,
  fileStatusValidator,
} from "./domainValidators";
import {
  approvalStatusLabel,
  isClientSafeApprovalStatus,
  normalizeFileStatus,
} from "../src/lib/domain-values";
import type {
  FileCategory,
  FileProvider,
  FileStatus,
  ProjectActivityKind,
  TeamActivityKind,
} from "../src/lib/domain-values";
import { planIncludesFileUploads } from "../src/lib/subscription-entitlements";

const MAX_PROJECT_FILES = 100;
const MAX_PROJECT_VERSIONS = 500;
const MAX_VERSIONS_PER_FILE = 20;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_WORKSPACE_BYTES = 200 * 1024 * 1024;
type FileActivityKind = ProjectActivityKind & TeamActivityKind;

type ProjectRecord = Pick<
  Doc<"projects">,
  "_id" | "id" | "ownerUserId" | "teamId"
>;

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

async function requireProjectAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: string,
  permission: "viewProjects" | "editProjects"
) {
  const identity = await requireIdentity(ctx);
  const project = await ctx.db
    .query("projects")
    .withIndex("by_projectId", (q) => q.eq("id", projectId))
    .unique();
  if (!project) throw new Error("Project not found");
  if (!project.teamId) {
    if (project.ownerUserId !== identity.tokenIdentifier)
      throw new Error("Project access required");
    return { identity, project };
  }
  const member = await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId_and_userId", (q) =>
      q
        .eq("teamId", project.teamId as string)
        .eq("userId", identity.tokenIdentifier)
    )
    .unique();
  if (
    !member ||
    member.status !== "active" ||
    !member.permissions[permission]
  ) {
    throw new Error("Project access required");
  }
  return { identity, project };
}

function requireFileUploadPlan(
  identity: Awaited<ReturnType<typeof requireIdentity>>
) {
  if (!planIncludesFileUploads(identity.pla)) {
    throw new Error(
      "File uploads require a Creator or Studio plan. External links remain available on Free."
    );
  }
}

function actorName(identity: Awaited<ReturnType<typeof requireIdentity>>) {
  return identity.name || identity.nickname || identity.email || "CutLab user";
}

function cleanText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function validExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const SAFE_FILE_TYPES: Record<string, readonly string[]> = {
  "application/pdf": ["pdf"],
  "text/plain": ["txt"],
  "text/markdown": ["md", "markdown"],
  "text/x-markdown": ["md", "markdown"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

function validateSafeFile(
  fileName: string,
  mimeType: string,
  size: number,
  provider: FileProvider
) {
  if (!Number.isFinite(size) || size < 0 || size > MAX_FILE_BYTES) {
    throw new Error("Files must be 20 MB or smaller");
  }
  const normalizedMime = mimeType.trim().toLowerCase();
  const extension = fileName.trim().split(".").pop()?.toLowerCase();
  if (provider !== "convex" && provider !== "r2" && extension !== "exe") return;
  if (!extension || !SAFE_FILE_TYPES[normalizedMime]?.includes(extension)) {
    throw new Error(
      "Only PDF, text, Markdown, JPEG, PNG, and WebP files are accepted"
    );
  }
}

async function validateProjectOutput(
  ctx: QueryCtx | MutationCtx,
  projectId: string,
  projectOutputId: Id<"projectOutputs"> | null | undefined
) {
  if (!projectOutputId) return;
  const output = await ctx.db.get(projectOutputId);
  if (!output || output.projectId !== projectId || output.archived) {
    throw new Error("Project Output not found");
  }
}

async function workspaceUsage(
  ctx: QueryCtx | MutationCtx,
  project: ProjectRecord
) {
  const projects = project.teamId
    ? await ctx.db
        .query("projects")
        .withIndex("by_teamId", (q) => q.eq("teamId", project.teamId))
        .take(500)
    : await ctx.db
        .query("projects")
        .withIndex("by_ownerUserId_and_teamId", (q) =>
          q.eq("ownerUserId", project.ownerUserId).eq("teamId", undefined)
        )
        .take(500);
  let total = 0;
  for (const candidate of projects) {
    const versions = await ctx.db
      .query("projectFileVersions")
      .withIndex("by_projectId_and_uploadedAt", (q) =>
        q.eq("projectId", candidate.id)
      )
      .take(MAX_PROJECT_VERSIONS);
    total += versions.reduce((sum, version) => sum + version.size, 0);
  }
  return total;
}

async function requireWorkspaceCapacity(
  ctx: QueryCtx | MutationCtx,
  project: ProjectRecord,
  incomingBytes = 0
) {
  if (
    (await workspaceUsage(ctx, project)) + incomingBytes >
    MAX_WORKSPACE_BYTES
  ) {
    throw new Error(
      "Workspace storage limit reached. Permanently delete archived files before uploading more."
    );
  }
}

async function requireEditableFile(
  ctx: MutationCtx,
  fileId: Id<"projectFiles">
) {
  const file = await ctx.db.get(fileId);
  if (!file) throw new Error("Project file not found");
  const access = await requireProjectAccess(
    ctx,
    file.projectId,
    "editProjects"
  );
  return { file, ...access };
}

async function logFileActivity(
  ctx: MutationCtx,
  project: ProjectRecord,
  identity: Awaited<ReturnType<typeof requireIdentity>>,
  kind: FileActivityKind,
  message: string,
  detail?: string
) {
  const name = actorName(identity);
  await recordProjectActivity(ctx, {
    project: {
      id: project.id,
      ownerUserId: project.ownerUserId,
      teamId: project.teamId,
    },
    actorUserId: identity.tokenIdentifier,
    actorName: name,
    kind,
    message,
    detail,
  });
  if (project.teamId) {
    await ctx.db.insert("teamActivity", {
      teamId: project.teamId,
      actorUserId: identity.tokenIdentifier,
      actorName: name,
      kind,
      projectId: project.id,
      message,
      createdAt: new Date().toISOString(),
    });
  }
}

async function nextVersionNumber(ctx: MutationCtx, fileId: Id<"projectFiles">) {
  const versions = await ctx.db
    .query("projectFileVersions")
    .withIndex("by_projectFileId_and_versionNumber", (q) =>
      q.eq("projectFileId", fileId)
    )
    .order("desc")
    .take(MAX_VERSIONS_PER_FILE);
  if (versions.length >= MAX_VERSIONS_PER_FILE)
    throw new Error("This file has reached its 20-version limit");
  return (versions[0]?.versionNumber ?? 0) + 1;
}

async function insertVersion(
  ctx: MutationCtx,
  args: {
    project: ProjectRecord;
    identity: Awaited<ReturnType<typeof requireIdentity>>;
    projectFileId?: Id<"projectFiles">;
    projectOutputId?: Id<"projectOutputs">;
    category: FileCategory;
    title: string;
    description: string;
    status: FileStatus;
    clientVisible: boolean;
    downloadable: boolean;
    provider: FileProvider;
    storageId?: Id<"_storage">;
    r2Key?: string;
    externalUrl?: string;
    externalId?: string;
    fileName: string;
    mimeType: string;
    size: number;
    notes: string;
  }
) {
  const now = new Date().toISOString();
  validateSafeFile(args.fileName, args.mimeType, args.size, args.provider);
  await validateProjectOutput(ctx, args.project.id, args.projectOutputId);
  await requireWorkspaceCapacity(
    ctx,
    args.project,
    Math.max(0, Math.floor(args.size))
  );
  const projectVersions = await ctx.db
    .query("projectFileVersions")
    .withIndex("by_projectId_and_uploadedAt", (q) =>
      q.eq("projectId", args.project.id)
    )
    .take(MAX_PROJECT_VERSIONS);
  if (projectVersions.length >= MAX_PROJECT_VERSIONS) {
    throw new Error("This project has reached its 500-version history limit");
  }
  if (args.storageId) {
    const existingStorageReference = await ctx.db
      .query("projectFileVersions")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .unique();
    if (existingStorageReference) {
      throw new Error(
        "This uploaded file is already attached to a project version"
      );
    }
  }
  if (args.r2Key) {
    const existingR2Reference = await ctx.db
      .query("projectFileVersions")
      .withIndex("by_r2Key", (q) => q.eq("r2Key", args.r2Key))
      .unique();
    if (existingR2Reference) {
      throw new Error(
        "This R2 object is already attached to a project version"
      );
    }
  }
  let fileId = args.projectFileId;
  let previousStatus: FileStatus | null = null;
  if (fileId) {
    const existing = await ctx.db.get(fileId);
    if (!existing || existing.projectId !== args.project.id)
      throw new Error("Project file not found");
    if (existing.archived)
      throw new Error("Restore this file before adding another version");
    previousStatus = normalizeFileStatus(existing.status);
    if (args.projectOutputId !== undefined && args.projectOutputId !== null) {
      await ctx.db.patch(fileId, { projectOutputId: args.projectOutputId });
    }
  } else {
    const existingFiles = await ctx.db
      .query("projectFiles")
      .withIndex("by_projectId_and_createdAt", (q) =>
        q.eq("projectId", args.project.id)
      )
      .take(MAX_PROJECT_FILES);
    if (existingFiles.length >= MAX_PROJECT_FILES)
      throw new Error("This project has reached its 100-file limit");
    fileId = await ctx.db.insert("projectFiles", {
      projectId: args.project.id,
      projectOutputId: args.projectOutputId,
      ownerUserId: args.project.ownerUserId,
      teamId: args.project.teamId,
      category: args.category,
      title: cleanText(args.title, 160) || cleanText(args.fileName, 160),
      description: cleanText(args.description, 500),
      status: args.status,
      clientVisible: args.clientVisible && args.category === "Deliverable",
      downloadable: args.downloadable,
      archived: false,
      createdByUserId: args.identity.tokenIdentifier,
      createdByName: actorName(args.identity),
      createdAt: now,
      updatedAt: now,
    });
  }
  const versionNumber = await nextVersionNumber(ctx, fileId);
  await ctx.db.insert("projectFileVersions", {
    projectId: args.project.id,
    projectFileId: fileId,
    versionNumber,
    status: args.status,
    provider: args.provider,
    storageId: args.storageId,
    r2Key: args.r2Key,
    externalUrl: args.externalUrl,
    externalId: cleanText(args.externalId ?? "", 300) || undefined,
    fileName: cleanText(args.fileName, 240),
    mimeType: cleanText(args.mimeType, 120),
    size: Math.max(0, Math.floor(args.size)),
    uploadedByUserId: args.identity.tokenIdentifier,
    uploadedByName: actorName(args.identity),
    uploadedAt: now,
    notes: cleanText(args.notes, 500),
  });
  await ctx.db.patch(fileId, {
    status: args.status,
    updatedAt: now,
  });
  const file = await ctx.db.get(fileId);
  await logFileActivity(
    ctx,
    args.project,
    args.identity,
    versionNumber === 1 ? "project_file_added" : "project_file_version_added",
    versionNumber === 1
      ? `${file?.title ?? args.fileName} was added to ${args.category.toLowerCase()} files.`
      : `${file?.title ?? args.fileName} version ${versionNumber} was uploaded.`,
    `${args.fileName} · ${args.provider} · ${approvalStatusLabel(args.status)}`
  );
  if (previousStatus && previousStatus !== args.status) {
    await logFileActivity(
      ctx,
      args.project,
      args.identity,
      "project_file_updated",
      `${file?.title ?? args.fileName} approval changed from ${approvalStatusLabel(previousStatus)} to ${approvalStatusLabel(args.status)}.`
    );
  }
  return fileId;
}

export const listForProject = query({
  args: { projectId: v.string(), includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { project } = await requireProjectAccess(
      ctx,
      args.projectId,
      "viewProjects"
    );
    const [files, versions] = await Promise.all([
      ctx.db
        .query("projectFiles")
        .withIndex("by_projectId_and_createdAt", (q) =>
          q.eq("projectId", args.projectId)
        )
        .order("desc")
        .take(MAX_PROJECT_FILES),
      ctx.db
        .query("projectFileVersions")
        .withIndex("by_projectId_and_uploadedAt", (q) =>
          q.eq("projectId", args.projectId)
        )
        .order("desc")
        .take(MAX_PROJECT_VERSIONS),
    ]);
    const visibleFiles = args.includeArchived
      ? files
      : files.filter((file) => !file.archived);
    const versionsWithUrls = await Promise.all(
      versions.map(async (version) => ({
        _id: version._id,
        projectFileId: version.projectFileId,
        versionNumber: version.versionNumber,
        status: normalizeFileStatus(version.status),
        provider: version.provider,
        url: version.storageId
          ? await ctx.storage.getUrl(version.storageId)
          : version.externalUrl,
        externalId: version.externalId,
        fileName: version.fileName,
        mimeType: version.mimeType,
        size: version.size,
        uploadedByName: version.uploadedByName,
        uploadedAt: version.uploadedAt,
        notes: version.notes,
      }))
    );
    return {
      retainedBytes: await workspaceUsage(ctx, project),
      workspaceLimitBytes: MAX_WORKSPACE_BYTES,
      files: visibleFiles.map((file) => ({
        _id: file._id,
        category: file.category,
        title: file.title,
        description: file.description,
        status: normalizeFileStatus(file.status),
        clientVisible: file.clientVisible,
        downloadable: file.downloadable,
        projectOutputId: file.projectOutputId,
        archived: file.archived ?? false,
        createdByName: file.createdByName,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        versions: versionsWithUrls.filter(
          (version) => version.projectFileId === file._id
        ),
      })),
      uploadHistory: versionsWithUrls,
    };
  },
});

/** Return only explicitly visible, client-safe latest file versions for an active portal. */
export const listForPortal = query({
  args: { token: v.string(), pin: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const access = await getPublicPortalAccess(ctx, args.token, args.pin);
    if (!access.portal) return { access: access.access, files: [] };
    const files = await ctx.db
      .query("projectFiles")
      .withIndex(
        "by_projectId_and_category_and_clientVisible_and_createdAt",
        (q) =>
          q
            .eq("projectId", access.portal.projectId)
            .eq("category", "Deliverable")
            .eq("clientVisible", true)
      )
      .order("desc")
      .take(MAX_PROJECT_FILES);
    const visible = [];
    for (const file of files) {
      if (file.archived) continue;
      const status = normalizeFileStatus(file.status);
      if (!isClientSafeApprovalStatus(status)) continue;
      const version = await ctx.db
        .query("projectFileVersions")
        .withIndex("by_projectFileId_and_versionNumber", (q) =>
          q.eq("projectFileId", file._id)
        )
        .order("desc")
        .first();
      if (!version) continue;
      const url = version.storageId
        ? await ctx.storage.getUrl(version.storageId)
        : (version.externalUrl ?? null);
      if (!url) continue;
      visible.push({
        id: file._id,
        title: file.title,
        description: file.description,
        status,
        url,
        downloadable: file.downloadable,
        fileName: version.fileName,
        mimeType: version.mimeType,
        updatedAt: version.uploadedAt,
      });
    }
    return { access: "active" as const, files: visible };
  },
});

export const generateUploadUrl = mutation({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const { identity, project } = await requireProjectAccess(
      ctx,
      args.projectId,
      "editProjects"
    );
    requireFileUploadPlan(identity);
    await requireWorkspaceCapacity(ctx, project);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createR2UploadSession = internalMutation({
  args: {
    projectId: v.string(),
    projectFileId: v.optional(v.id("projectFiles")),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity, project } = await requireProjectAccess(
      ctx,
      args.projectId,
      "editProjects"
    );
    requireFileUploadPlan(identity);
    await requireWorkspaceCapacity(ctx, project);
    const safeName =
      cleanText(args.fileName, 160).replace(/[^a-zA-Z0-9._-]+/g, "-") || "file";
    const key = `projects/${encodeURIComponent(project.id)}/files/${crypto.randomUUID()}-${safeName}`;
    const now = new Date().toISOString();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const sessionId = await ctx.db.insert("r2UploadSessions", {
      projectId: project.id,
      projectFileId: args.projectFileId,
      key,
      uploaderUserId: identity.tokenIdentifier,
      status: "pending",
      createdAt: now,
      expiresAt,
    });
    return { sessionId, key, expiresAt };
  },
});

export const getR2UploadSession = internalQuery({
  args: { sessionId: v.id("r2UploadSessions") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.uploaderUserId !== identity.tokenIdentifier)
      return null;
    return session;
  },
});

export const getR2DownloadTarget = internalQuery({
  args: { versionId: v.id("projectFileVersions") },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version?.r2Key) return null;
    await requireProjectAccess(ctx, version.projectId, "viewProjects");
    return {
      key: version.r2Key,
      fileName: version.fileName,
      mimeType: version.mimeType,
    };
  },
});

export const finalizeR2Upload = internalMutation({
  args: {
    sessionId: v.id("r2UploadSessions"),
    projectId: v.string(),
    projectFileId: v.optional(v.id("projectFiles")),
    projectOutputId: v.optional(v.id("projectOutputs")),
    category: fileCategoryValidator,
    title: v.string(),
    description: v.string(),
    status: fileStatusValidator,
    clientVisible: v.boolean(),
    downloadable: v.boolean(),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity, project } = await requireProjectAccess(
      ctx,
      args.projectId,
      "editProjects"
    );
    requireFileUploadPlan(identity);
    const session = await ctx.db.get(args.sessionId);
    if (
      !session ||
      session.projectId !== args.projectId ||
      session.uploaderUserId !== identity.tokenIdentifier
    ) {
      throw new Error("R2 upload session not found");
    }
    if (session.status !== "pending")
      throw new Error("R2 upload session already used");
    if (session.expiresAt <= Date.now())
      throw new Error("R2 upload session expired");
    if (
      args.projectFileId &&
      session.projectFileId &&
      args.projectFileId !== session.projectFileId
    ) {
      throw new Error("R2 upload target changed");
    }
    const fileId = await insertVersion(ctx, {
      project: project,
      identity,
      projectFileId: args.projectFileId ?? session.projectFileId,
      projectOutputId: args.projectOutputId,
      category: args.category,
      title: args.title,
      description: args.description,
      status: args.status,
      clientVisible: args.clientVisible,
      downloadable: args.downloadable,
      provider: "r2",
      r2Key: session.key,
      fileName: args.fileName,
      mimeType: args.mimeType,
      size: args.size,
      notes: args.notes,
    });
    await ctx.db.patch(args.sessionId, { status: "completed" });
    return fileId;
  },
});

export const saveStorageVersion = mutation({
  args: {
    projectId: v.string(),
    projectFileId: v.optional(v.id("projectFiles")),
    projectOutputId: v.optional(v.id("projectOutputs")),
    storageId: v.id("_storage"),
    category: fileCategoryValidator,
    title: v.string(),
    description: v.string(),
    status: fileStatusValidator,
    clientVisible: v.boolean(),
    downloadable: v.boolean(),
    fileName: v.string(),
    mimeType: v.string(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity, project } = await requireProjectAccess(
      ctx,
      args.projectId,
      "editProjects"
    );
    requireFileUploadPlan(identity);
    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) throw new Error("Uploaded file not found");
    return await insertVersion(ctx, {
      ...args,
      project,
      identity,
      provider: "convex",
      size: metadata.size,
      mimeType:
        args.mimeType || metadata.contentType || "application/octet-stream",
    });
  },
});

export const saveExternalVersion = mutation({
  args: {
    projectId: v.string(),
    projectFileId: v.optional(v.id("projectFiles")),
    projectOutputId: v.optional(v.id("projectOutputs")),
    category: fileCategoryValidator,
    title: v.string(),
    description: v.string(),
    status: fileStatusValidator,
    clientVisible: v.boolean(),
    downloadable: v.boolean(),
    provider: fileProviderValidator,
    externalUrl: v.string(),
    externalId: v.optional(v.string()),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.provider === "convex")
      throw new Error("Use the upload flow for Convex storage");
    if (!validExternalUrl(args.externalUrl))
      throw new Error("Enter a valid http or https file URL");
    const { identity, project } = await requireProjectAccess(
      ctx,
      args.projectId,
      "editProjects"
    );
    return await insertVersion(ctx, { ...args, project, identity });
  },
});

export const updateFile = mutation({
  args: {
    fileId: v.id("projectFiles"),
    projectOutputId: v.optional(v.union(v.id("projectOutputs"), v.null())),
    category: fileCategoryValidator,
    title: v.string(),
    description: v.string(),
    status: fileStatusValidator,
    clientVisible: v.boolean(),
    downloadable: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { file, identity, project } = await requireEditableFile(
      ctx,
      args.fileId
    );
    await validateProjectOutput(ctx, file.projectId, args.projectOutputId);
    const title = cleanText(args.title, 160);
    if (!title) throw new Error("File title is required");
    const previousStatus = normalizeFileStatus(file.status);
    const latestVersion =
      previousStatus !== args.status
        ? await ctx.db
            .query("projectFileVersions")
            .withIndex("by_projectFileId_and_versionNumber", (q) =>
              q.eq("projectFileId", args.fileId)
            )
            .order("desc")
            .first()
        : null;
    await ctx.db.patch(args.fileId, {
      category: args.category,
      title,
      description: cleanText(args.description, 500),
      status: args.status,
      clientVisible: args.clientVisible && args.category === "Deliverable",
      downloadable: args.downloadable,
      ...(args.projectOutputId === undefined
        ? {}
        : { projectOutputId: args.projectOutputId ?? undefined }),
      updatedAt: new Date().toISOString(),
    });
    if (latestVersion) {
      await ctx.db.patch(latestVersion._id, { status: args.status });
    }
    const statusChanged = previousStatus !== args.status;
    await logFileActivity(
      ctx,
      project,
      identity,
      "project_file_updated",
      statusChanged
        ? `${file.title} approval changed from ${approvalStatusLabel(previousStatus)} to ${approvalStatusLabel(args.status)}.`
        : `${file.title} file details were updated.`
    );
    return null;
  },
});

export const archiveFile = mutation({
  args: { fileId: v.id("projectFiles") },
  handler: async (ctx, args) => {
    const { file, identity, project } = await requireEditableFile(
      ctx,
      args.fileId
    );
    if (file.archived) return null;
    await ctx.db.patch(args.fileId, {
      archived: true,
      clientVisible: false,
      updatedAt: new Date().toISOString(),
    });
    await logFileActivity(
      ctx,
      project,
      identity,
      "project_file_updated",
      `${file.title} was archived.`
    );
    return null;
  },
});

export const restoreFile = mutation({
  args: { fileId: v.id("projectFiles") },
  handler: async (ctx, args) => {
    const { file, identity, project } = await requireEditableFile(
      ctx,
      args.fileId
    );
    if (!file.archived) return null;
    await ctx.db.patch(args.fileId, {
      archived: false,
      updatedAt: new Date().toISOString(),
    });
    await logFileActivity(
      ctx,
      project,
      identity,
      "project_file_updated",
      `${file.title} was restored.`
    );
    return null;
  },
});

export const removeFile = mutation({
  args: { fileId: v.id("projectFiles") },
  handler: async (ctx, args) => {
    const { file, identity, project } = await requireEditableFile(
      ctx,
      args.fileId
    );
    if (!file.archived)
      throw new Error("Archive this file before deleting it permanently");
    const versions = await ctx.db
      .query("projectFileVersions")
      .withIndex("by_projectFileId_and_versionNumber", (q) =>
        q.eq("projectFileId", args.fileId)
      )
      .take(MAX_VERSIONS_PER_FILE);
    await Promise.all(
      versions.map(async (version) => {
        if (version.storageId) await ctx.storage.delete(version.storageId);
        if (version.r2Key) {
          await ctx.scheduler.runAfter(0, internal.r2.deleteObject, {
            key: version.r2Key,
          });
        }
        await ctx.db.delete(version._id);
      })
    );
    await ctx.db.delete(args.fileId);
    await logFileActivity(
      ctx,
      project,
      identity,
      "project_file_removed",
      `${file.title} was removed from project files.`
    );
    return null;
  },
});
