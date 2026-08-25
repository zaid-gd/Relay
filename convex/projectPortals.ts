import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { projectPortalStatusValidator } from "./domainValidators";

type FunctionCtx = QueryCtx | MutationCtx;
type PortalStatus = "draft" | "open" | "closed";
type PublicAccess = "active" | "unpublished" | "closed" | "expired" | "invalid_token" | "pin_required" | "invalid_pin";

const MAX_OUTPUTS = 20;
const MAX_NOTES = 2_000;
const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 128;
const PIN_ITERATIONS = 120_000;

const portalConfigValidator = v.object({
  publicNotes: v.string(),
  showStartDate: v.boolean(),
  showDueDate: v.boolean(),
  selectedOutputIds: v.array(v.string()),
  expiresAt: v.union(v.string(), v.null()),
});

async function requireIdentity(ctx: FunctionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

async function requireProjectAccess(
  ctx: FunctionCtx,
  projectId: string,
  permission: "viewProjects" | "editProjects" | "managePortal",
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
  const permitted = membership?.permissions[permission]
    ?? (permission === "managePortal" ? membership?.role !== "Reviewer" : false);
  if (membership?.status !== "active" || !permitted) {
    throw new Error("Permission denied");
  }
  return { identity, project };
}

function cleanNotes(value: string) {
  return value.trim().slice(0, MAX_NOTES);
}

function normalizeExpiry(value: string | null | undefined) {
  if (value === null || value === undefined || !value.trim()) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error("Enter a valid portal expiry date and time");
  return new Date(timestamp).toISOString();
}

function randomHex(byteLength: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(byteLength)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) return new Uint8Array();
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function derivePinHash(pin: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: Uint8Array.from(salt).buffer, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

async function hashPin(pin: string) {
  const value = pin.trim();
  if (value.length < MIN_PIN_LENGTH || value.length > MAX_PIN_LENGTH) {
    throw new Error("Portal PIN must be between 4 and 128 characters");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePinHash(value, salt, PIN_ITERATIONS);
  return {
    pinHash: bytesToHex(hash),
    pinSalt: bytesToHex(salt),
    pinIterations: PIN_ITERATIONS,
  };
}

async function pinMatches(portal: Doc<"projectPortals">, pin: string | undefined) {
  if (!portal.pinHash || !portal.pinSalt) return true;
  if (!pin) return false;
  const expected = hexToBytes(portal.pinHash);
  const salt = hexToBytes(portal.pinSalt);
  if (!expected.length || !salt.length) return false;
  const actual = await derivePinHash(pin.trim(), salt, portal.pinIterations ?? PIN_ITERATIONS);
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= actual[index] ^ expected[index];
  return mismatch === 0;
}

async function validateSelectedOutputs(ctx: FunctionCtx, projectId: string, ids: string[]) {
  if (ids.length > MAX_OUTPUTS) throw new Error("A portal can show at most 20 Project Outputs");
  const normalized = ids.map((id) => id.trim());
  if (normalized.some((id) => !id) || new Set(normalized).size !== normalized.length) {
    throw new Error("Portal Project Output ids must be unique");
  }
  const outputs = await ctx.db
    .query("projectOutputs")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .take(100);
  const outputById = new Map(outputs.map((output) => [output.id, output]));
  if (normalized.some((id) => !outputById.get(id) || outputById.get(id)?.archived)) {
    throw new Error("Portal Project Outputs must belong to this Project and be active");
  }
  return normalized;
}

function accessState(portal: Doc<"projectPortals">, now = Date.now()): PublicAccess {
  if (portal.status === "draft") return "unpublished";
  if (portal.status === "closed") return "closed";
  if (portal.expiresAt) {
    const expiry = Date.parse(portal.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= now) return "expired";
  }
  return "active";
}

export async function getPublicPortalAccess(ctx: FunctionCtx, token: string, pin: string | undefined) {
  const normalizedToken = token.trim();
  if (!normalizedToken) return { portal: null, access: "invalid_token" as const };
  const tokenHash = await sha256(normalizedToken);
  const portal = await ctx.db.query("projectPortals").withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash)).unique();
  if (!portal) return { portal: null, access: "invalid_token" as const };
  const access = accessState(portal);
  if (access !== "active") return { portal: null, access };
  if (portal.pinHash && pin === undefined) return { portal: null, access: "pin_required" as const };
  if (portal.pinHash && !(await pinMatches(portal, pin))) return { portal: null, access: "invalid_pin" as const };
  return { portal, access: "active" as const };
}

function publicStageForPurpose(purpose: Doc<"projects">["workflowStages"][number]["purpose"] | undefined) {
  switch (purpose) {
    case "editing": return { stage: "In Progress", progress: 45 };
    case "revisions": return { stage: "Review", progress: 60 };
    case "client_review": return { stage: "Review", progress: 75 };
    case "approved": return { stage: "Review", progress: 90 };
    case "delivered": return { stage: "Delivered", progress: 100 };
    case "planned":
    case undefined:
      return { stage: "Planning", progress: 15 };
  }
}

function publicProject(project: Doc<"projects">, portal: Doc<"projectPortals">) {
  const workflowStage = project.workflowStages.find(({ id }) => id === project.workflowStageId);
  const { stage, progress } = publicStageForPurpose(workflowStage?.purpose);
  return {
    title: project.title,
    stage,
    progress,
    publicNotes: portal.publicNotes,
    startDate: portal.showStartDate ? project.startDate : null,
    dueDate: portal.showDueDate ? project.dueDate : null,
  };
}

async function publicOutputs(ctx: QueryCtx, projectId: string, portal: Doc<"projectPortals">) {
  const outputs = await ctx.db
    .query("projectOutputs")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .take(100);
  const byId = new Map(outputs.map((output) => [output.id, output]));
  const visible = [];
  for (const outputId of portal.selectedOutputIds) {
    const output = byId.get(outputId);
    if (!output || output.archived) continue;
    const versions = await ctx.db
      .query("projectMediaVersions")
      .withIndex("by_outputId_and_versionNumber", (q) => q.eq("outputId", output._id))
      .order("desc")
      .take(100);
    const current = versions.find(({ _id }) => _id === output.currentMediaVersionId);
    visible.push({
      id: output.id,
      title: output.title,
      category: output.category,
      reviewState: output.reviewState,
      currentVersion: current
        ? { id: current.id, versionNumber: current.versionNumber, title: current.title, source: current.source }
        : null,
    });
  }
  return visible;
}

async function publicProjection(ctx: QueryCtx, project: Doc<"projects">, portal: Doc<"projectPortals">) {
  return { project: publicProject(project, portal), outputs: await publicOutputs(ctx, project.id, portal) };
}

function editorPortal(portal: Doc<"projectPortals">) {
  return {
    id: portal._id,
    projectId: portal.projectId,
    status: portal.status,
    expiresAt: portal.expiresAt ?? null,
    hasPin: Boolean(portal.pinHash),
    publicNotes: portal.publicNotes,
    showStartDate: portal.showStartDate,
    showDueDate: portal.showDueDate,
    selectedOutputIds: portal.selectedOutputIds,
    createdAt: portal.createdAt,
    updatedAt: portal.updatedAt,
  };
}

export const publish = mutation({
  args: { projectId: v.string(), config: portalConfigValidator },
  handler: async (ctx, args) => {
    const { project } = await requireProjectAccess(ctx, args.projectId, "managePortal");
    if (await ctx.db.query("projectPortals").withIndex("by_projectId", (q) => q.eq("projectId", project.id)).unique()) {
      throw new Error("This Project already has a Client Portal");
    }
    const selectedOutputIds = await validateSelectedOutputs(ctx, project.id, args.config.selectedOutputIds);
    const token = randomHex(32);
    const now = new Date().toISOString();
    const portalId = await ctx.db.insert("projectPortals", {
      ownerUserId: project.ownerUserId,
      projectId: project.id,
      teamId: project.teamId,
      tokenHash: await sha256(token),
      status: "draft",
      expiresAt: normalizeExpiry(args.config.expiresAt),
      publicNotes: cleanNotes(args.config.publicNotes),
      showStartDate: args.config.showStartDate,
      showDueDate: args.config.showDueDate,
      selectedOutputIds,
      createdAt: now,
      updatedAt: now,
    });
    return { portalId, token };
  },
});

export const getForProject = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const { project } = await requireProjectAccess(ctx, args.projectId, "managePortal");
    const portal = await ctx.db.query("projectPortals").withIndex("by_projectId", (q) => q.eq("projectId", project.id)).unique();
    return portal ? { portal: editorPortal(portal), preview: await publicProjection(ctx, project, portal) } : null;
  },
});

export const updateSettings = mutation({
  args: {
    portalId: v.id("projectPortals"),
    changes: v.object({
      publicNotes: v.optional(v.string()),
      showStartDate: v.optional(v.boolean()),
      showDueDate: v.optional(v.boolean()),
      selectedOutputIds: v.optional(v.array(v.string())),
      expiresAt: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    const portal = await ctx.db.get("projectPortals", args.portalId);
    if (!portal) throw new Error("Client Portal not found");
    await requireProjectAccess(ctx, portal.projectId, "managePortal");
    const selectedOutputIds = args.changes.selectedOutputIds === undefined
      ? undefined
      : await validateSelectedOutputs(ctx, portal.projectId, args.changes.selectedOutputIds);
    await ctx.db.patch(portal._id, {
      ...(args.changes.publicNotes === undefined ? {} : { publicNotes: cleanNotes(args.changes.publicNotes) }),
      ...(args.changes.showStartDate === undefined ? {} : { showStartDate: args.changes.showStartDate }),
      ...(args.changes.showDueDate === undefined ? {} : { showDueDate: args.changes.showDueDate }),
      ...(selectedOutputIds === undefined ? {} : { selectedOutputIds }),
      ...(args.changes.expiresAt === undefined ? {} : { expiresAt: normalizeExpiry(args.changes.expiresAt) }),
      updatedAt: new Date().toISOString(),
    });
    return null;
  },
});

export const setStatus = mutation({
  args: { portalId: v.id("projectPortals"), status: projectPortalStatusValidator },
  handler: async (ctx, args) => {
    const portal = await ctx.db.get("projectPortals", args.portalId);
    if (!portal) throw new Error("Client Portal not found");
    await requireProjectAccess(ctx, portal.projectId, "managePortal");
    await ctx.db.patch(portal._id, { status: args.status, updatedAt: new Date().toISOString() });
    return null;
  },
});

export const setPin = mutation({
  args: { portalId: v.id("projectPortals"), pin: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const portal = await ctx.db.get("projectPortals", args.portalId);
    if (!portal) throw new Error("Client Portal not found");
    await requireProjectAccess(ctx, portal.projectId, "managePortal");
    if (args.pin === null) {
      await ctx.db.patch(portal._id, {
        pinHash: undefined,
        pinSalt: undefined,
        pinIterations: undefined,
        updatedAt: new Date().toISOString(),
      });
      return null;
    }
    const hashed = await hashPin(args.pin);
    await ctx.db.patch(portal._id, { ...hashed, updatedAt: new Date().toISOString() });
    return null;
  },
});

export const regenerateToken = mutation({
  args: { portalId: v.id("projectPortals") },
  handler: async (ctx, args) => {
    const portal = await ctx.db.get("projectPortals", args.portalId);
    if (!portal) throw new Error("Client Portal not found");
    await requireProjectAccess(ctx, portal.projectId, "managePortal");
    const token = randomHex(32);
    await ctx.db.patch(portal._id, { tokenHash: await sha256(token), updatedAt: new Date().toISOString() });
    return { token };
  },
});

export const getByToken = query({
  args: { token: v.string(), pin: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const result = await getPublicPortalAccess(ctx, args.token, args.pin);
    if (!result.portal) return { access: result.access };
    const project = await ctx.db.query("projects").withIndex("by_projectId", (q) => q.eq("id", result.portal.projectId)).unique();
    if (!project) return { access: "invalid_token" as const };
    return { access: "active" as const, ...await publicProjection(ctx, project, result.portal) };
  },
});
