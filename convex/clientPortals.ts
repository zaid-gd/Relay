import { v } from "convex/values";
import {
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { recordProjectActivity } from "./projectActivity";
import {
  clientPortalStageValidator,
  deliverableStatusValidator,
  revisionStatusValidator,
} from "./domainValidators";
import type {
  ClientPortalStage,
  PortalEventKind,
} from "../src/lib/domain-values";
import {
  approvalStatusLabel,
  isClientSafeApprovalStatus,
  normalizeDeliverableStatus,
  normalizeFileStatus,
} from "../src/lib/domain-values";
import {
  formatTimecodedDetail,
  normalizeOptionalTimecode,
} from "../src/lib/timecode";

const MAX_DELIVERABLES = 50;
const MAX_PROJECT_FILES = 100;
const MAX_PROJECT_VERSIONS = 500;
const MAX_REVISIONS = 100;
const MAX_EVENTS = 100;
const MAX_SUMMARY_LENGTH = 800;
const MAX_NOTE_LENGTH = 2000;
const MAX_REVISION_LENGTH = 2000;
const MIN_PORTAL_PASSWORD_LENGTH = 4;
const MAX_PORTAL_PASSWORD_LENGTH = 128;
const PORTAL_PASSWORD_ITERATIONS = 120_000;
type PortalAccessState = "active" | "unavailable" | "expired";

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
    if (project.ownerUserId !== identity.subject)
      throw new Error("Project access required");
    return { identity, project };
  }

  const member = await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId_and_userId", (q) =>
      q
        .eq("teamId", project.teamId as string)
        .eq("userId", identity.subject)
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

function cleanText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function normalizedExpiry(value: string | null) {
  const expiresAt = value?.trim() ?? "";
  if (!expiresAt) return undefined;
  const timestamp = Date.parse(expiresAt);
  if (!Number.isFinite(timestamp))
    throw new Error("Enter a valid portal expiry date and time");
  return new Date(timestamp).toISOString();
}

function portalAccessState(
  portal: Doc<"clientPortals">,
  now = Date.now()
): PortalAccessState {
  const enabled = portal.enabled ?? portal.published;
  if (!portal.published || !enabled) return "unavailable";
  if (!portal.expiresAt) return "active";
  const expiry = Date.parse(portal.expiresAt);
  return !Number.isFinite(expiry) || expiry <= now ? "expired" : "active";
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

function hexToBytes(value: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0)
    return new Uint8Array();
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function derivePortalPasswordHash(
  password: string,
  salt: Uint8Array,
  iterations: number
) {
  const saltBuffer = Uint8Array.from(salt).buffer;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBuffer, iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}

async function hashPortalPassword(password: string) {
  if (
    password.length < MIN_PORTAL_PASSWORD_LENGTH ||
    password.length > MAX_PORTAL_PASSWORD_LENGTH ||
    password.trim().length < MIN_PORTAL_PASSWORD_LENGTH
  ) {
    throw new Error("Portal password must be between 4 and 128 characters");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePortalPasswordHash(
    password,
    salt,
    PORTAL_PASSWORD_ITERATIONS
  );
  return {
    passwordHash: bytesToHex(hash),
    passwordSalt: bytesToHex(salt),
    passwordIterations: PORTAL_PASSWORD_ITERATIONS,
  };
}

async function portalPasswordMatches(
  portal: Doc<"clientPortals">,
  password?: string
) {
  if (!portal.passwordHash || !portal.passwordSalt) return true;
  if (!password) return false;
  const expected = hexToBytes(portal.passwordHash);
  const salt = hexToBytes(portal.passwordSalt);
  if (!expected.length || !salt.length) return false;
  const actual = await derivePortalPasswordHash(
    password,
    salt,
    portal.passwordIterations ?? PORTAL_PASSWORD_ITERATIONS
  );
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= actual[index] ^ expected[index];
  }
  return mismatch === 0;
}

function projectProgress(status: string) {
  const normalized = status.trim().toLowerCase();
  if (
    normalized.includes("deliver") ||
    normalized.includes("complete") ||
    normalized === "done"
  )
    return 100;
  if (
    normalized.includes("review") ||
    normalized.includes("revision") ||
    normalized.includes("feedback")
  )
    return 75;
  if (
    normalized.includes("progress") ||
    normalized.includes("editing") ||
    normalized.includes("active")
  )
    return 45;
  return 15;
}

function milestoneForStage(stage: ClientPortalStage): {
  kind: PortalEventKind;
  title: string;
  body: string;
} {
  if (stage === "In Progress") {
    return {
      kind: "work_started",
      title: "Work started",
      body: "Production work is now underway.",
    };
  }
  if (stage === "Review") {
    return {
      kind: "review_sent",
      title: "Review sent",
      body: "The latest project version is ready for client review.",
    };
  }
  if (stage === "Delivered") {
    return {
      kind: "delivery_completed",
      title: "Delivery completed",
      body: "The project has reached final delivery.",
    };
  }
  return {
    kind: "status_changed",
    title: "Project moved to Planning",
    body: "The project workflow returned to planning.",
  };
}

function validPublicUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

async function portalForEditor(ctx: QueryCtx | MutationCtx, projectId: string) {
  await requireProjectAccess(ctx, projectId, "viewProjects");
  return await ctx.db
    .query("clientPortals")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .unique();
}

async function projectDeliverables(
  ctx: QueryCtx,
  projectId: string,
  clientSafeOnly: boolean
) {
  const visibleFiles = await ctx.db
    .query("projectFiles")
    .withIndex(
      "by_projectId_and_category_and_clientVisible_and_createdAt",
      (q) =>
        q
          .eq("projectId", projectId)
          .eq("category", "Deliverable")
          .eq("clientVisible", true)
    )
    .order("desc")
    // ponytail: scan cap keeps this query bounded; add a status-aware index if a
    // project can exceed 200 client-visible deliverables.
    .take(MAX_DELIVERABLES * 4);

  const deliverables = await Promise.all(
    visibleFiles.map(async (file) => {
      const versions = await ctx.db
        .query("projectFileVersions")
        .withIndex("by_projectFileId_and_versionNumber", (q) =>
          q.eq("projectFileId", file._id)
        )
        .order("desc")
        .take(1);
      const latest = versions[0];
      if (!latest) return null;
      const status = normalizeFileStatus(file.status);
      if (clientSafeOnly && !isClientSafeApprovalStatus(status)) return null;
      const url = latest.storageId
        ? await ctx.storage.getUrl(latest.storageId)
        : latest.r2Key
          ? null
          : latest.externalUrl;
      if (!url && !latest.r2Key) return null;
      return {
        versionId: latest._id,
        provider: latest.provider,
        title: file.title,
        detail: file.description,
        url,
        status,
        downloadable: file.downloadable,
        updatedAt: latest.uploadedAt,
      };
    })
  );

  return deliverables
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, MAX_DELIVERABLES);
}

export const getPublicR2DownloadTarget = internalQuery({
  args: {
    token: v.string(),
    versionId: v.id("projectFileVersions"),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const portal = await ctx.db
      .query("clientPortals")
      .withIndex("by_token", (q) => q.eq("token", args.token.trim()))
      .unique();
    if (
      !portal ||
      portalAccessState(portal) !== "active" ||
      !(await portalPasswordMatches(portal, args.password))
    ) {
      return null;
    }
    const version = await ctx.db.get(args.versionId);
    if (!version?.r2Key || version.projectId !== portal.projectId) return null;
    const file = await ctx.db.get(version.projectFileId);
    if (
      !file ||
      file.category !== "Deliverable" ||
      !file.clientVisible ||
      !isClientSafeApprovalStatus(normalizeFileStatus(file.status))
    ) {
      return null;
    }
    const latest = await ctx.db
      .query("projectFileVersions")
      .withIndex("by_projectFileId_and_versionNumber", (q) =>
        q.eq("projectFileId", file._id)
      )
      .order("desc")
      .first();
    if (latest?._id !== version._id) return null;
    return {
      key: version.r2Key,
      fileName: version.fileName,
      mimeType: version.mimeType,
    };
  },
});

async function requireEditablePortal(
  ctx: MutationCtx,
  portalId: Doc<"clientPortals">["_id"]
) {
  const portal = await ctx.db.get(portalId);
  if (!portal) throw new Error("Client portal not found");
  const access = await requireProjectAccess(
    ctx,
    portal.projectId,
    "editProjects"
  );
  return { portal, ...access };
}

async function insertEvent(
  ctx: MutationCtx,
  portalId: Doc<"clientPortals">["_id"],
  kind: PortalEventKind,
  title: string,
  body: string,
  createdAt = new Date().toISOString()
) {
  const existingEvents = await ctx.db
    .query("portalEvents")
    .withIndex("by_portalId_and_createdAt", (q) => q.eq("portalId", portalId))
    .order("desc")
    .take(MAX_EVENTS);
  if (existingEvents.length >= MAX_EVENTS) {
    await ctx.db.delete(existingEvents[existingEvents.length - 1]._id);
  }
  await ctx.db.insert("portalEvents", {
    portalId,
    kind,
    title: cleanText(title, 120),
    body: cleanText(body, 500),
    createdAt,
  });
  await ctx.db.patch(portalId, { updatedAt: createdAt });
}

export const getForProject = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const portal = await portalForEditor(ctx, args.projectId);
    if (!portal) return null;

    const deliverables = await projectDeliverables(ctx, portal.projectId, false);
    const revisions = await ctx.db
      .query("portalRevisions")
      .withIndex("by_portalId_and_createdAt", (q) =>
        q.eq("portalId", portal._id)
      )
      .order("desc")
      .take(MAX_REVISIONS);

    return {
      portal: {
        _id: portal._id,
        projectId: portal.projectId,
        token: portal.token,
        title: portal.title,
        clientName: portal.clientName,
        projectType: portal.projectType,
        status: portal.status,
        sourceStatus: portal.sourceStatus,
        startDate: portal.startDate,
        dueDate: portal.dueDate,
        progress: portal.progress,
        clientSummary: portal.clientSummary,
        clientNotes: portal.clientNotes,
        estimatedCompletion: portal.estimatedCompletion,
        revisionLimit: portal.revisionLimit,
        published: portal.published,
        enabled: portal.enabled ?? portal.published,
        expiresAt: portal.expiresAt ?? null,
        passwordProtected: Boolean(portal.passwordHash && portal.passwordSalt),
        createdAt: portal.createdAt,
        updatedAt: portal.updatedAt,
      },
      deliverables,
      revisions,
    };
  },
});

export const getByToken = query({
  args: { token: v.string(), password: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const portal = await ctx.db
      .query("clientPortals")
      .withIndex("by_token", (q) => q.eq("token", args.token.trim()))
      .unique();
    if (!portal) return { access: "unavailable" as const };
    const access = portalAccessState(portal);
    if (access === "expired") return { access: "expired" as const };
    if (access === "unavailable") return { access: "unavailable" as const };
    if (!(await portalPasswordMatches(portal, args.password))) {
      return { access: "locked" as const };
    }

    const deliverables = await projectDeliverables(ctx, portal.projectId, true);
    const revisions = await ctx.db
      .query("portalRevisions")
      .withIndex("by_portalId_and_createdAt", (q) =>
        q.eq("portalId", portal._id)
      )
      .order("desc")
      .take(MAX_REVISIONS);
    const events = await ctx.db
      .query("portalEvents")
      .withIndex("by_portalId_and_createdAt", (q) =>
        q.eq("portalId", portal._id)
      )
      .order("desc")
      .take(MAX_EVENTS);

    return {
      access: "active" as const,
      title: portal.title,
      clientName: portal.clientName,
      projectType: portal.projectType,
      status: portal.status,
      dueDate: portal.dueDate,
      progress: portal.progress,
      clientSummary: portal.clientSummary,
      clientNotes: portal.clientNotes,
      estimatedCompletion: portal.estimatedCompletion,
      revisionLimit: portal.revisionLimit,
      expiresAt: portal.expiresAt ?? null,
      createdAt: portal.createdAt,
      updatedAt: portal.updatedAt,
      deliverables,
      revisions: revisions.map((item) => ({
        clientName: item.clientName,
        message: item.message,
        timecode: item.timecode ?? null,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      events: events.map((item) => ({
        kind: item.kind,
        title: item.title,
        body: item.body,
        createdAt: item.createdAt,
      })),
    };
  },
});

export const publish = mutation({
  args: {
    projectId: v.string(),
    clientSummary: v.string(),
    clientNotes: v.string(),
    estimatedCompletion: v.string(),
    revisionLimit: v.number(),
    clientStage: clientPortalStageValidator,
  },
  handler: async (ctx, args) => {
    const { identity, project } = await requireProjectAccess(
      ctx,
      args.projectId,
      "editProjects"
    );
    const existing = await ctx.db
      .query("clientPortals")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .unique();
    const now = new Date().toISOString();
    const revisionLimit = Math.max(
      0,
      Math.min(20, Math.floor(args.revisionLimit))
    );
    const clientStage = args.clientStage;
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", project.ownerUserId))
      .unique();
    const snapshot = {
      title: cleanText(project.title, 160),
      clientName: cleanText(
        settings?.clients?.find((client) => client.id === project.clientId)
          ?.name ?? "",
        120
      ),
      projectType: cleanText(project.workType, 120),
      status: clientStage,
      sourceStatus: project.status,
      startDate: project.startDate,
      dueDate: project.dueDate,
      progress: projectProgress(clientStage),
      clientSummary: cleanText(args.clientSummary, MAX_SUMMARY_LENGTH),
      clientNotes: cleanText(args.clientNotes, MAX_NOTE_LENGTH),
      estimatedCompletion:
        cleanText(args.estimatedCompletion, 40) || project.dueDate,
      revisionLimit,
      updatedAt: now,
    };

    if (existing) {
      const statusChanged = existing.status !== snapshot.status;
      await ctx.db.patch(existing._id, snapshot);
      if (statusChanged) {
        const milestone = milestoneForStage(snapshot.status);
        await insertEvent(
          ctx,
          existing._id,
          milestone.kind,
          milestone.title,
          milestone.body
        );
      }
      await recordProjectActivity(ctx, {
        project,
        actorUserId: identity.subject,
        actorName: identity.name || identity.email || "CutLab user",
        kind: statusChanged ? "client_stage_changed" : "client_portal_updated",
        message: statusChanged
          ? `Client workflow stage changed to ${snapshot.status}.`
          : "Client portal details were updated.",
      });
      return { token: existing.token };
    }

    const token = crypto.randomUUID().replaceAll("-", "");
    const portalId = await ctx.db.insert("clientPortals", {
      ownerUserId: identity.subject,
      projectId: args.projectId,
      token,
      ...snapshot,
      published: true,
      enabled: true,
      createdAt: project.createdAt || now,
    });
    await insertEvent(
      ctx,
      portalId,
      "project_created",
      "Project created",
      "The project workspace and client portal were prepared.",
      project.createdAt || now
    );
    if (clientStage !== "Planning") {
      const milestone = milestoneForStage(clientStage);
      await insertEvent(
        ctx,
        portalId,
        milestone.kind,
        milestone.title,
        milestone.body,
        now
      );
    }
    await insertEvent(
      ctx,
      portalId,
      "portal_published",
      "Client portal published",
      "Project progress is now available through this private link.",
      now
    );
    await recordProjectActivity(ctx, {
      project,
      actorUserId: identity.subject,
      actorName: identity.name || identity.email || "CutLab user",
      kind: "client_portal_published",
      message: "The client portal was published.",
    });
    return { token };
  },
});

export const setPublished = mutation({
  args: { portalId: v.id("clientPortals"), published: v.boolean() },
  handler: async (ctx, args) => {
    const { portal, identity, project } = await requireEditablePortal(
      ctx,
      args.portalId
    );
    await ctx.db.patch(args.portalId, {
      published: args.published,
      enabled: args.published,
      updatedAt: new Date().toISOString(),
    });
    await recordProjectActivity(ctx, {
      project,
      actorUserId: identity.subject,
      actorName: identity.name || identity.email || "CutLab user",
      kind: args.published
        ? "client_portal_published"
        : "client_portal_unpublished",
      message: `The client portal was ${args.published ? "published" : "unpublished"}.`,
    });
    return null;
  },
});

export const setAccessControls = mutation({
  args: {
    portalId: v.id("clientPortals"),
    enabled: v.boolean(),
    expiresAt: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const { portal, identity, project } = await requireEditablePortal(
      ctx,
      args.portalId
    );
    const now = new Date().toISOString();
    const expiresAt = normalizedExpiry(args.expiresAt);
    const wasEnabled = portal.enabled ?? portal.published;
    await ctx.db.patch(args.portalId, {
      enabled: args.enabled,
      published: args.enabled ? true : portal.published,
      expiresAt,
      updatedAt: now,
    });
    if (wasEnabled !== args.enabled) {
      await recordProjectActivity(ctx, {
        project,
        actorUserId: identity.subject,
        actorName: identity.name || identity.email || "CutLab user",
        kind: args.enabled ? "client_portal_enabled" : "client_portal_disabled",
        message: `Client portal access was ${args.enabled ? "enabled" : "disabled"}.`,
        createdAt: now,
      });
    } else if (portal.expiresAt !== expiresAt) {
      await recordProjectActivity(ctx, {
        project,
        actorUserId: identity.subject,
        actorName: identity.name || identity.email || "CutLab user",
        kind: "client_portal_updated",
        message: expiresAt
          ? `Client portal expiry was set to ${expiresAt}.`
          : "Client portal expiry was removed.",
        createdAt: now,
      });
    }
    return null;
  },
});

export const regenerateToken = mutation({
  args: { portalId: v.id("clientPortals") },
  handler: async (ctx, args) => {
    const { identity, project } = await requireEditablePortal(
      ctx,
      args.portalId
    );
    const token = crypto.randomUUID().replaceAll("-", "");
    const now = new Date().toISOString();
    await ctx.db.patch(args.portalId, { token, updatedAt: now });
    await recordProjectActivity(ctx, {
      project,
      actorUserId: identity.subject,
      actorName: identity.name || identity.email || "CutLab user",
      kind: "client_portal_token_regenerated",
      message:
        "The client portal link was regenerated. The previous link no longer works.",
      createdAt: now,
    });
    return { token };
  },
});

export const setPasswordProtection = mutation({
  args: {
    portalId: v.id("clientPortals"),
    password: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const { portal, identity, project } = await requireEditablePortal(
      ctx,
      args.portalId
    );
    const now = new Date().toISOString();
    if (args.password === null) {
      await ctx.db.patch(args.portalId, {
        passwordHash: undefined,
        passwordSalt: undefined,
        passwordIterations: undefined,
        updatedAt: now,
      });
      await recordProjectActivity(ctx, {
        project,
        actorUserId: identity.subject,
        actorName: identity.name || identity.email || "CutLab user",
        kind: "client_portal_updated",
        message: "Client portal password protection was removed.",
        createdAt: now,
      });
      return { passwordProtected: false };
    }

    const passwordFields = await hashPortalPassword(args.password);
    const wasProtected = Boolean(portal.passwordHash && portal.passwordSalt);
    await ctx.db.patch(args.portalId, { ...passwordFields, updatedAt: now });
    await recordProjectActivity(ctx, {
      project,
      actorUserId: identity.subject,
      actorName: identity.name || identity.email || "CutLab user",
      kind: "client_portal_updated",
      message: `Client portal password protection was ${wasProtected ? "updated" : "enabled"}.`,
      createdAt: now,
    });
    return { passwordProtected: true };
  },
});

export const addDeliverable = mutation({
  args: {
    portalId: v.id("clientPortals"),
    title: v.string(),
    detail: v.string(),
    url: v.string(),
    status: deliverableStatusValidator,
    downloadable: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { identity, project } = await requireEditablePortal(
      ctx,
      args.portalId
    );
    const title = cleanText(args.title, 160);
    const detail = cleanText(args.detail, 300);
    const url = args.url.trim();
    const status = normalizeDeliverableStatus(args.status);
    const actor = identity.name || identity.email || "CutLab user";
    if (!title) throw new Error("Deliverable title is required");
    if (!validPublicUrl(url))
      throw new Error("Enter a valid http or https deliverable URL");
    const existingVisibleDeliverables = await ctx.db
      .query("projectFiles")
      .withIndex(
        "by_projectId_and_category_and_clientVisible_and_createdAt",
        (q) =>
          q
            .eq("projectId", project.id)
            .eq("category", "Deliverable")
            .eq("clientVisible", true)
      )
      .take(MAX_DELIVERABLES);
    if (existingVisibleDeliverables.length >= MAX_DELIVERABLES)
      throw new Error("This portal has reached its deliverable limit");
    const existingFiles = await ctx.db
      .query("projectFiles")
      .withIndex("by_projectId_and_createdAt", (q) =>
        q.eq("projectId", project.id)
      )
      .take(MAX_PROJECT_FILES);
    if (existingFiles.length >= MAX_PROJECT_FILES)
      throw new Error("This project has reached its 100-file limit");
    const existingVersions = await ctx.db
      .query("projectFileVersions")
      .withIndex("by_projectId_and_uploadedAt", (q) =>
        q.eq("projectId", project.id)
      )
      .take(MAX_PROJECT_VERSIONS);
    if (existingVersions.length >= MAX_PROJECT_VERSIONS)
      throw new Error("This project has reached its 500-version history limit");
    const now = new Date().toISOString();
    const fileId = await ctx.db.insert("projectFiles", {
      projectId: project.id,
      ownerUserId: project.ownerUserId,
      teamId: project.teamId,
      category: "Deliverable",
      title,
      description: detail,
      status,
      clientVisible: true,
      downloadable: args.downloadable,
      createdByUserId: identity.subject,
      createdByName: actor,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("projectFileVersions", {
      projectId: project.id,
      projectFileId: fileId,
      versionNumber: 1,
      status,
      provider: "external",
      externalUrl: url,
      fileName: title,
      mimeType: "text/uri-list",
      size: 0,
      uploadedByUserId: identity.subject,
      uploadedByName: actor,
      uploadedAt: now,
      notes: detail,
    });
    await insertEvent(
      ctx,
      args.portalId,
      "deliverable_added",
      "New file available",
      `${title} was added to the project deliverables.`
    );
    await recordProjectActivity(ctx, {
      project,
      actorUserId: identity.subject,
      actorName: actor,
      kind: "project_file_added",
      message: `${title} was added to deliverable files.`,
      detail: detail || undefined,
    });
    return { fileId };
  },
});
export const submitRevision = mutation({
  args: {
    token: v.string(),
    password: v.optional(v.string()),
    clientName: v.string(),
    message: v.string(),
    timecode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const portal = await ctx.db
      .query("clientPortals")
      .withIndex("by_token", (q) => q.eq("token", args.token.trim()))
      .unique();
    if (
      !portal ||
      portalAccessState(portal) !== "active" ||
      !(await portalPasswordMatches(portal, args.password))
    ) {
      throw new Error("Client portal unavailable");
    }
    const message = cleanText(args.message, MAX_REVISION_LENGTH);
    if (!message) throw new Error("Revision request cannot be empty");
    const timecode = normalizeOptionalTimecode(args.timecode);
    const existing = await ctx.db
      .query("portalRevisions")
      .withIndex("by_portalId_and_createdAt", (q) =>
        q.eq("portalId", portal._id)
      )
      .take(MAX_REVISIONS);
    const effectiveLimit = Math.min(
      MAX_REVISIONS,
      Math.max(0, Math.floor(portal.revisionLimit ?? MAX_REVISIONS))
    );
    if (existing.length >= effectiveLimit)
      throw new Error("This portal has reached its revision request limit");
    const now = new Date().toISOString();
    await ctx.db.insert("portalRevisions", {
      portalId: portal._id,
      clientName:
        cleanText(args.clientName, 100) || portal.clientName || "Client",
      message,
      timecode,
      status: "Submitted",
      createdAt: now,
      updatedAt: now,
    });
    await insertEvent(
      ctx,
      portal._id,
      "revision_requested",
      "Revision requested",
      timecode
        ? `A new client revision request was submitted at ${timecode}.`
        : "A new client revision request was submitted.",
      now
    );
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("id", portal.projectId))
      .unique();
    if (project) {
      await recordProjectActivity(ctx, {
        project,
        actorUserId: "client",
        actorName:
          cleanText(args.clientName, 100) || portal.clientName || "Client",
        kind: "revision_requested",
        message: "A client revision request was submitted.",
        detail: formatTimecodedDetail(timecode, message),
        createdAt: now,
      });
    }
    await ctx.db.patch(portal._id, { updatedAt: now });
    return null;
  },
});

export const updateRevisionStatus = mutation({
  args: {
    revisionId: v.id("portalRevisions"),
    status: revisionStatusValidator,
  },
  handler: async (ctx, args) => {
    const revision = await ctx.db.get(args.revisionId);
    if (!revision) throw new Error("Revision request not found");
    const { identity, project } = await requireEditablePortal(
      ctx,
      revision.portalId
    );
    const status = args.status;
    const now = new Date().toISOString();
    await ctx.db.patch(args.revisionId, { status, updatedAt: now });
    if (status === "Resolved") {
      await insertEvent(
        ctx,
        revision.portalId,
        "revision_completed",
        "Revision completed",
        "A client revision request was resolved.",
        now
      );
    }
    await recordProjectActivity(ctx, {
      project,
      actorUserId: identity.subject,
      actorName: identity.name || identity.email || "CutLab user",
      kind: "revision_status_changed",
      message: `A revision request changed from ${revision.status} to ${status}.`,
    });
    return null;
  },
});
