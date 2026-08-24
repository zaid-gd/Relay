import { type Infer, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { workflowStageValidator } from "./domainValidators";

const createProjectValidator = v.object({
  id: v.string(),
  teamId: v.optional(v.string()),
  assigneeUserIds: v.array(v.string()),
  profileId: v.string(),
  title: v.string(),
  clientId: v.string(),
  projectGroupId: v.optional(v.string()),
  workflowStages: v.array(workflowStageValidator),
  workType: v.string(),
  startDate: v.string(),
  dueDate: v.string(),
  earnings: v.number(),
  notes: v.string(),
  templateId: v.optional(v.string()),
  templateProjectType: v.optional(v.string()),
});

const projectUpdateValidator = v.object({
  title: v.optional(v.string()),
  clientId: v.optional(v.string()),
  projectGroupId: v.optional(v.union(v.string(), v.null())),
  assigneeUserIds: v.optional(v.array(v.string())),
  workType: v.optional(v.string()),
  startDate: v.optional(v.string()),
  dueDate: v.optional(v.string()),
  earnings: v.optional(v.number()),
  paid: v.optional(v.boolean()),
  notes: v.optional(v.string()),
});

const salaryBatchImportValidator = v.object({
  id: v.string(),
  number: v.number(),
  workType: v.string(),
  requiredProjectCount: v.number(),
  amount: v.number(),
  projectIds: v.array(v.string()),
  completedAt: v.string(),
  paid: v.boolean(),
  paidAt: v.optional(v.string()),
});

type WorkflowStage = Infer<typeof workflowStageValidator>;
type FunctionCtx = QueryCtx | MutationCtx;

async function requireIdentity(ctx: FunctionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

async function activeMembership(ctx: FunctionCtx, teamId: string, userId: string) {
  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId_and_userId", (q) => q.eq("teamId", teamId).eq("userId", userId))
    .unique();
  return membership?.status === "active" ? membership : null;
}

async function requireTeamPermission(
  ctx: FunctionCtx,
  teamId: string,
  userId: string,
  permission: "viewProjects" | "createProjects" | "editProjects" | "updateStatus" | "manageTeam",
) {
  const membership = await activeMembership(ctx, teamId, userId);
  if (!membership || !membership.permissions[permission]) throw new Error("Permission denied");
  return membership;
}

async function validatedAssignees(ctx: FunctionCtx, teamId: string | undefined, userIds: string[]) {
  const unique = [...new Set(userIds)].slice(0, 6);
  if (!teamId) return [];
  const memberships = await Promise.all(unique.map((userId) => activeMembership(ctx, teamId, userId)));
  if (memberships.some((membership) => !membership)) throw new Error("Project assignees must be active Workspace members");
  return unique;
}

async function getProject(ctx: FunctionCtx, projectId: string) {
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
  permission: "viewProjects" | "editProjects" | "updateStatus" | "manageTeam",
) {
  const identity = await requireIdentity(ctx);
  const project = await getProject(ctx, projectId);
  if (project.teamId) {
    const membership = await requireTeamPermission(
      ctx,
      project.teamId,
      identity.tokenIdentifier,
      permission,
    );
    return { identity, membership, project };
  }
  if (project.ownerUserId !== identity.tokenIdentifier) throw new Error("Project access required");
  return { identity, membership: null, project };
}

function normalizeWorkflow(stages: WorkflowStage[]) {
  if (stages.length < 2 || stages.length > 12) throw new Error("Workflow needs 2 to 12 stages");
  const normalized = stages.map((stage) => ({
    id: stage.id.trim().slice(0, 80),
    label: stage.label.trim().slice(0, 80),
    purpose: stage.purpose,
  }));
  if (!normalized.length || normalized.some((stage) => !stage.id || !stage.label)) {
    throw new Error("Workflow stages need an id and label");
  }
  if (new Set(normalized.map((stage) => stage.id)).size !== normalized.length) {
    throw new Error("Workflow stage ids must be unique");
  }
  if (normalized.filter((stage) => stage.purpose === "delivered").length !== 1) {
    throw new Error("Workflow needs exactly one Delivered stage");
  }
  return normalized;
}

function statusForPurpose(purpose: WorkflowStage["purpose"]) {
  switch (purpose) {
    case "planned": return "Planned" as const;
    case "editing": return "In Progress" as const;
    case "client_review": return "Review" as const;
    case "revisions": return "Revision" as const;
    case "approved": return "Review" as const;
    case "delivered": return "Delivered" as const;
  }
}

async function settingsOwnerId(ctx: FunctionCtx, teamId: string | undefined, userId: string) {
  if (!teamId) return userId;
  const workspaceId = ctx.db.normalizeId("teamWorkspaces", teamId);
  if (!workspaceId) throw new Error("Team workspace not found");
  const workspace = await ctx.db.get("teamWorkspaces", workspaceId);
  if (!workspace) throw new Error("Team workspace not found");
  return workspace.ownerUserId;
}

async function validateClientAndGroup(
  ctx: FunctionCtx,
  args: { userId: string; teamId?: string; clientId: string; projectGroupId?: string },
) {
  const ownerId = await settingsOwnerId(ctx, args.teamId, args.userId);
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_userId", (q) => q.eq("userId", ownerId))
    .unique();
  if (!settings?.clients?.some((client) => client.id === args.clientId && !client.archived)) {
    throw new Error("Project Client must belong to this Workspace");
  }
  if (!args.projectGroupId) return settings;
  const projectGroupId = args.projectGroupId;
  const teamId = args.teamId;
  const group = teamId
    ? await ctx.db
        .query("projectGroups")
        .withIndex("by_teamId_and_id", (q) => q.eq("teamId", teamId).eq("id", projectGroupId))
        .unique()
    : await ctx.db
        .query("projectGroups")
        .withIndex("by_userId_and_id", (q) => q.eq("userId", args.userId).eq("id", projectGroupId))
        .unique();
  if (!group || group.archived || group.clientId !== args.clientId) {
    throw new Error("Project Group must be active and belong to the selected Client");
  }
  return settings;
}

async function deliveryEffect(ctx: FunctionCtx, ownerUserId: string, project: Doc<"projects">) {
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_userId", (q) => q.eq("userId", ownerUserId))
    .unique();
  if (project.workType !== (settings?.salaryWorkType ?? "Job / Salary")) {
    return { result: { kind: "client" as const, earned: project.earnings }, projectIds: [] };
  }

  const requiredProjectCount = Math.max(1, Math.floor(settings?.salaryBatchSize ?? 20));
  const amount = Math.max(0, settings?.salaryBatchAmount ?? 10000);
  const batches = await ctx.db
    .query("projectSalaryBatches")
    .withIndex("by_ownerUserId_and_workType", (q) =>
      q.eq("ownerUserId", ownerUserId).eq("workType", project.workType))
    .take(500);
  const settledProjectIds = new Set(batches.flatMap((batch) => batch.projectIds));
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_ownerUserId_and_teamId", (q) =>
      q.eq("ownerUserId", ownerUserId).eq("teamId", undefined))
    .take(500);
  const contributors = projects
    .filter((candidate) =>
      candidate.workType === project.workType &&
      !settledProjectIds.has(candidate.id) &&
      (candidate.id === project.id || candidate.status === "Delivered"))
    .sort((left, right) =>
      (left.completedAt ?? left.createdAt).localeCompare(right.completedAt ?? right.createdAt))
    .slice(0, requiredProjectCount);
  const batchCreated = contributors.length === requiredProjectCount;
  return {
    result: {
      kind: "salary" as const,
      progress: batchCreated ? 0 : contributors.length,
      requiredProjectCount,
      amount,
      batchCreated,
    },
    projectIds: contributors.map((candidate) => candidate.id),
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const personal = await ctx.db
      .query("projects")
      .withIndex("by_ownerUserId_and_teamId", (q) =>
        q.eq("ownerUserId", identity.tokenIdentifier).eq("teamId", undefined))
      .take(500);
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("status", "active"))
      .first();
    if (!membership?.permissions.viewProjects) return personal;
    const workspaceId = ctx.db.normalizeId("teamWorkspaces", membership.teamId);
    const workspace = workspaceId ? await ctx.db.get("teamWorkspaces", workspaceId) : null;
    const teamProjects = await ctx.db
      .query("projects")
      .withIndex("by_teamId", (q) => q.eq("teamId", membership.teamId))
      .take(500);
    const visibleTeamProjects = membership.role === "Owner" || workspace?.allowAllTeamProjects
      ? teamProjects
      : teamProjects.filter((project) =>
          project.ownerUserId === identity.tokenIdentifier ||
          project.assigneeUserIds.includes(identity.tokenIdentifier));
    return [...personal, ...visibleTeamProjects];
  },
});

export const listSalaryBatches = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query("projectSalaryBatches")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", identity.tokenIdentifier))
      .take(500);
  },
});

export const setSalaryBatchPaid = mutation({
  args: { batchId: v.string(), paid: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const batch = await ctx.db
      .query("projectSalaryBatches")
      .withIndex("by_ownerUserId_and_id", (q) => q.eq("ownerUserId", identity.tokenIdentifier).eq("id", args.batchId))
      .unique();
    if (!batch) throw new Error("Salary Batch not found");
    await ctx.db.patch(batch._id, { paid: args.paid, paidAt: args.paid ? new Date().toISOString() : undefined });
    return null;
  },
});

export const importSalaryBatches = mutation({
  args: { batches: v.array(salaryBatchImportValidator) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    if (args.batches.length > 500) throw new Error("Too many Salary Batches");
    const existing = await ctx.db
      .query("projectSalaryBatches")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", identity.tokenIdentifier))
      .first();
    if (existing) throw new Error("Salary Batch import requires an empty Workspace");
    const seenProjectIds = new Set<string>();
    for (const batch of args.batches) {
      if (batch.projectIds.length !== batch.requiredProjectCount || batch.projectIds.some((id) => seenProjectIds.has(id))) {
        throw new Error("Salary Batch snapshot is invalid");
      }
      const projects = await Promise.all(batch.projectIds.map((id) => getProject(ctx, id)));
      if (projects.some((project) => project.ownerUserId !== identity.tokenIdentifier || project.teamId || project.workType !== batch.workType)) {
        throw new Error("Salary Batch Projects must belong to this Workspace");
      }
      batch.projectIds.forEach((id) => seenProjectIds.add(id));
      await ctx.db.insert("projectSalaryBatches", { ...batch, ownerUserId: identity.tokenIdentifier });
    }
    return null;
  },
});

export const create = mutation({
  args: { project: createProjectValidator },
  handler: async (ctx, { project }) => {
    const identity = await requireIdentity(ctx);
    if (project.teamId) {
      await requireTeamPermission(ctx, project.teamId, identity.tokenIdentifier, "createProjects");
    }
    if (!project.id.trim()) throw new Error("Project id is required");
    if (!project.title.trim()) throw new Error("Project title is required");
    if (await ctx.db.query("projects").withIndex("by_projectId", (q) => q.eq("id", project.id)).unique()) {
      throw new Error("Project id already exists");
    }
    const settings = await validateClientAndGroup(ctx, {
      userId: identity.tokenIdentifier,
      teamId: project.teamId,
      clientId: project.clientId,
      projectGroupId: project.projectGroupId,
    });
    const workflowStages = normalizeWorkflow(project.workflowStages);
    const firstStage = workflowStages[0];
    if (firstStage.purpose === "delivered") {
      throw new Error("A Project cannot start in its Delivered stage");
    }
    const id = project.id.trim().slice(0, 80);
    const now = new Date().toISOString();
    const assigneeUserIds = await validatedAssignees(ctx, project.teamId, project.assigneeUserIds);
    await ctx.db.insert("projects", {
      ...project,
      id,
      title: project.title.trim().slice(0, 160),
      notes: project.notes.trim().slice(0, 4000),
      ownerUserId: identity.tokenIdentifier,
      assigneeUserIds,
      workflowStages,
      workflowStageId: firstStage.id,
      status: statusForPurpose(firstStage.purpose),
      earnings: !project.teamId && project.workType === settings.salaryWorkType
        ? 0
        : Math.max(0, project.earnings),
      archived: false,
      paid: false,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const update = mutation({
  args: { projectId: v.string(), changes: projectUpdateValidator },
  handler: async (ctx, args) => {
    const { identity, project } = await requireProjectAccess(ctx, args.projectId, "editProjects");
    const clientId = args.changes.clientId ?? project.clientId;
    const projectGroupId = args.changes.projectGroupId === null
      ? undefined
      : args.changes.projectGroupId ?? project.projectGroupId;
    const settings = await validateClientAndGroup(ctx, {
      userId: identity.tokenIdentifier,
      teamId: project.teamId,
      clientId,
      projectGroupId,
    });
    const title = args.changes.title?.trim();
    if (args.changes.title !== undefined && !title) throw new Error("Project title is required");
    const paid = args.changes.paid ?? project.paid;
    const workType = args.changes.workType ?? project.workType;
    const earnings = !project.teamId && workType === settings.salaryWorkType
      ? 0
      : Math.max(0, args.changes.earnings ?? project.earnings);
    const assigneeUserIds = args.changes.assigneeUserIds === undefined
      ? undefined
      : await validatedAssignees(ctx, project.teamId, args.changes.assigneeUserIds);
    await ctx.db.patch(project._id, {
      ...args.changes,
      projectGroupId,
      earnings,
      ...(title === undefined ? {} : { title: title.slice(0, 160) }),
      ...(args.changes.notes === undefined ? {} : { notes: args.changes.notes.trim().slice(0, 4000) }),
      ...(assigneeUserIds === undefined ? {} : { assigneeUserIds }),
      paidDate: paid ? project.paidDate ?? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    });
    return null;
  },
});

export const setArchived = mutation({
  args: { projectId: v.string(), archived: v.boolean() },
  handler: async (ctx, args) => {
    const { project } = await requireProjectAccess(ctx, args.projectId, "editProjects");
    await ctx.db.patch(project._id, { archived: args.archived, updatedAt: new Date().toISOString() });
    return null;
  },
});

export const remove = mutation({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const project = await getProject(ctx, args.projectId);
    if (project.teamId) {
      const membership = await activeMembership(ctx, project.teamId, identity.tokenIdentifier);
      const canRemove = membership?.permissions.manageTeam
        || (project.ownerUserId === identity.tokenIdentifier && membership?.permissions.editProjects);
      if (!canRemove) throw new Error("Permission denied");
    } else if (project.ownerUserId !== identity.tokenIdentifier) {
      throw new Error("Project access required");
    }
    await ctx.db.delete(project._id);
    return null;
  },
});

export const previewStage = query({
  args: { projectId: v.string(), stageId: v.string() },
  handler: async (ctx, args) => {
    const { identity, project } = await requireProjectAccess(ctx, args.projectId, "updateStatus");
    const stage = project.workflowStages.find((candidate) => candidate.id === args.stageId);
    if (!stage) throw new Error("Workflow stage does not belong to this Project");
    if (stage.purpose !== "delivered") return { kind: "none" as const };
    if (project.teamId) return { kind: "client" as const, earned: project.earnings };
    return (await deliveryEffect(ctx, identity.tokenIdentifier, project)).result;
  },
});

export const transitionStage = mutation({
  args: { projectId: v.string(), stageId: v.string() },
  handler: async (ctx, args) => {
    const { identity, project } = await requireProjectAccess(ctx, args.projectId, "updateStatus");
    const stage = project.workflowStages.find((candidate) => candidate.id === args.stageId);
    if (!stage) throw new Error("Workflow stage does not belong to this Project");
    const status = statusForPurpose(stage.purpose);
    const now = new Date().toISOString();
    const completedAt = status === "Delivered"
      ? project.status === "Delivered" ? project.completedAt ?? now : now
      : undefined;
    await ctx.db.patch(project._id, {
      workflowStageId: stage.id,
      status,
      completedAt,
      updatedAt: now,
    });

    if (status !== "Delivered" || project.teamId) {
      return status === "Delivered"
        ? { kind: "client" as const, earned: project.earnings, completedAt }
        : { kind: "none" as const, completedAt };
    }

    const effect = await deliveryEffect(ctx, identity.tokenIdentifier, project);
    if (effect.result.kind === "client") return { ...effect.result, completedAt };
    const batches = await ctx.db
      .query("projectSalaryBatches")
      .withIndex("by_ownerUserId_and_workType", (q) =>
        q.eq("ownerUserId", identity.tokenIdentifier).eq("workType", project.workType))
      .take(500);
    if (effect.result.batchCreated) {
      const number = batches.reduce((highest, batch) => Math.max(highest, batch.number), 0) + 1;
      await ctx.db.insert("projectSalaryBatches", {
        ownerUserId: identity.tokenIdentifier,
        id: `salary-batch-${number}`,
        number,
        workType: project.workType,
        requiredProjectCount: effect.result.requiredProjectCount,
        amount: effect.result.amount,
        projectIds: effect.projectIds,
        completedAt: now,
        paid: false,
      });
    }
    return { ...effect.result, completedAt };
  },
});
