import { type Infer, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { fileCategoryValidator, projectOutputReviewStateValidator, workflowStageValidator } from "./domainValidators";

const createProjectValidator = v.object({
  id: v.string(),
  teamId: v.optional(v.string()),
  assigneeUserIds: v.array(v.string()),
  profileId: v.string(),
  title: v.string(),
  clientId: v.string(),
  salaryPlanId: v.optional(v.id("salaryPlans")),
  projectGroupId: v.optional(v.string()),
  workflowStages: v.array(workflowStageValidator),
  workType: v.string(),
  startDate: v.string(),
  dueDate: v.string(),
  earnings: v.number(),
  notes: v.string(),
  templateId: v.optional(v.string()),
  templateProjectType: v.optional(v.string()),
  starterOutputs: v.optional(v.array(v.object({
    title: v.string(),
    category: fileCategoryValidator,
    reviewState: projectOutputReviewStateValidator,
  }))),
});

const projectUpdateValidator = v.object({
  title: v.optional(v.string()),
  clientId: v.optional(v.string()),
  salaryPlanId: v.optional(v.union(v.id("salaryPlans"), v.null())),
  projectGroupId: v.optional(v.union(v.string(), v.null())),
  assigneeUserIds: v.optional(v.array(v.string())),
  workType: v.optional(v.string()),
  startDate: v.optional(v.string()),
  dueDate: v.optional(v.string()),
  earnings: v.optional(v.number()),
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

async function requirePaymentAccess(ctx: MutationCtx, project: Doc<"projects">) {
  const identity = await requireIdentity(ctx);
  if (!project.teamId) {
    if (project.ownerUserId !== identity.tokenIdentifier) throw new Error("Project access required");
    return identity;
  }
  const membership = await activeMembership(ctx, project.teamId, identity.tokenIdentifier);
  if (!membership || !(membership.permissions.manageFinance ?? membership.role === "Owner")) throw new Error("Permission denied");
  return identity;
}

async function isLegacySalaryProject(ctx: MutationCtx, project: Doc<"projects">) {
  const workspaceId = project.teamId ? ctx.db.normalizeId("teamWorkspaces", project.teamId) : null;
  const ownerUserId = project.teamId
    ? (workspaceId ? (await ctx.db.get(workspaceId))?.ownerUserId : undefined)
    : project.ownerUserId;
  const settings = ownerUserId
    ? await ctx.db.query("settings").withIndex("by_userId", (q) => q.eq("userId", ownerUserId)).unique()
    : null;
  return project.workType.trim().toLowerCase() === (settings?.salaryWorkType ?? "Job / Salary").trim().toLowerCase();
}

async function recordPaymentActivity(
  ctx: MutationCtx,
  project: Doc<"projects">,
  identity: Awaited<ReturnType<typeof requireIdentity>>,
  paid: boolean,
) {
  const existing = await ctx.db
    .query("projectActivity")
    .withIndex("by_projectId_and_createdAt", (q) => q.eq("projectId", project.id))
    .order("desc")
    .take(150);
  if (existing.length >= 150) await ctx.db.delete(existing[existing.length - 1]._id);
  await ctx.db.insert("projectActivity", {
    projectId: project.id,
    ownerUserId: project.ownerUserId,
    teamId: project.teamId,
    actorUserId: identity.tokenIdentifier,
    actorName: (identity.name || identity.nickname || identity.email || "Relay user").trim().slice(0, 120),
    kind: "project_updated",
    message: `${project.title} was marked ${paid ? "paid" : "unpaid"}.`,
    createdAt: new Date().toISOString(),
  });
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

async function getSalaryPlan(ctx: FunctionCtx, planId: Doc<"salaryPlans">["_id"], ownerUserId: string) {
  const plan = await ctx.db.get("salaryPlans", planId);
  if (!plan || plan.ownerUserId !== ownerUserId) throw new Error("Salary Plan not found");
  return plan;
}

async function validateSalaryPlan(
  ctx: FunctionCtx,
  planId: Doc<"salaryPlans">["_id"] | undefined,
  ownerUserId: string,
  teamId: string | undefined,
  clientId: string,
) {
  if (!planId) return null;
  if (teamId) throw new Error("Salary Plans are available for solo Projects only");
  const plan = await getSalaryPlan(ctx, planId, ownerUserId);
  if (plan.archived) throw new Error("Salary Plan is archived");
  if (plan.clientId !== clientId) throw new Error("Project Client must match the Salary Plan");
  return plan;
}

async function deliveryEffect(ctx: FunctionCtx, ownerUserId: string, project: Doc<"projects">) {
  const plan = project.salaryPlanId
    ? await getSalaryPlan(ctx, project.salaryPlanId, ownerUserId)
    : null;
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_userId", (q) => q.eq("userId", ownerUserId))
    .unique();
  if (!plan && project.workType !== (settings?.salaryWorkType ?? "Job / Salary")) {
    return { result: { kind: "client" as const, earned: project.earnings }, projectIds: [] };
  }

  const requiredProjectCount = plan?.requiredProjectCount ?? Math.max(1, Math.floor(settings?.salaryBatchSize ?? 20));
  const amount = plan?.amount ?? Math.max(0, settings?.salaryBatchAmount ?? 10000);
  const batches = await ctx.db
    .query("projectSalaryBatches")
    .withIndex("by_ownerUserId_and_workType", (q) => q.eq("ownerUserId", ownerUserId).eq("workType", project.workType))
    .collect();
  const settledProjectIds = new Set(batches
    .filter((batch) => plan ? batch.salaryPlanId === plan._id : !batch.salaryPlanId)
    .flatMap((batch) => batch.projectIds));
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_ownerUserId_and_teamId", (q) =>
      q.eq("ownerUserId", ownerUserId).eq("teamId", undefined))
    .collect();
  const contributors = projects
    .filter((candidate) =>
      candidate.workType === project.workType &&
      candidate.salaryPlanId === project.salaryPlanId &&
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
    plan,
    clientName: plan ? settings?.clients?.find((client) => client.id === plan.clientId)?.name : undefined,
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
    const receivedAt = args.paid ? batch.receivedAt ?? new Date().toISOString() : undefined;
    await ctx.db.patch(batch._id, {
      paid: args.paid,
      paidAt: args.paid ? batch.paidAt ?? receivedAt : undefined,
      received: args.paid,
      receivedAt,
    });
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
    const seenBatchIds = new Set<string>();
    for (const batch of args.batches) {
      if (
        !batch.id.trim() || seenBatchIds.has(batch.id) ||
        !Number.isInteger(batch.requiredProjectCount) || batch.requiredProjectCount < 1 ||
        !Number.isFinite(batch.amount) || batch.amount < 0 ||
        batch.projectIds.length !== batch.requiredProjectCount ||
        new Set(batch.projectIds).size !== batch.projectIds.length ||
        batch.projectIds.some((id) => !id.trim() || seenProjectIds.has(id))
      ) {
        throw new Error("Salary Batch snapshot is invalid");
      }
      const projects = await Promise.all(batch.projectIds.map((id) => getProject(ctx, id)));
      if (projects.some((project) => project.ownerUserId !== identity.tokenIdentifier || project.teamId || project.workType !== batch.workType || project.status !== "Delivered")) {
        throw new Error("Salary Batch Projects must belong to this Workspace");
      }
      seenBatchIds.add(batch.id);
      batch.projectIds.forEach((id) => seenProjectIds.add(id));
      await ctx.db.insert("projectSalaryBatches", { ...batch, ownerUserId: identity.tokenIdentifier });
    }
    return null;
  },
});

export const create = mutation({
  args: { project: createProjectValidator },
  returns: v.string(),
  handler: async (ctx, { project }) => {
    const identity = await requireIdentity(ctx);
    if (project.teamId) {
      await requireTeamPermission(ctx, project.teamId, identity.tokenIdentifier, "createProjects");
    }
    const id = project.id.trim().slice(0, 80);
    if (!id) throw new Error("Project id is required");
    if (!project.title.trim()) throw new Error("Project title is required");
    const existing = await ctx.db.query("projects").withIndex("by_projectId", (q) => q.eq("id", id)).unique();
    if (existing?.ownerUserId === identity.tokenIdentifier && existing.teamId === project.teamId) {
      return id;
    }
    if (existing) {
      throw new Error("Project id already exists");
    }
    const reservedByBatch = (await ctx.db
      .query("projectSalaryBatches")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", identity.tokenIdentifier))
      .collect())
      .some((batch) => batch.projectIds.includes(id));
    if (reservedByBatch) throw new Error("Project id is reserved by Salary Batch history");
    const settings = await validateClientAndGroup(ctx, {
      userId: identity.tokenIdentifier,
      teamId: project.teamId,
      clientId: project.clientId,
      projectGroupId: project.projectGroupId,
    });
    const salaryPlan = await validateSalaryPlan(
      ctx,
      project.salaryPlanId,
      identity.tokenIdentifier,
      project.teamId,
      project.clientId,
    );
    const workflowStages = normalizeWorkflow(project.workflowStages);
    const firstStage = workflowStages[0];
    if (firstStage.purpose === "delivered") {
      throw new Error("A Project cannot start in its Delivered stage");
    }
    const now = new Date().toISOString();
    const assigneeUserIds = await validatedAssignees(ctx, project.teamId, project.assigneeUserIds);
    const { starterOutputs = [], ...projectFields } = project;
    if (starterOutputs.length > 20) throw new Error("A Template can create at most 20 Project Outputs");
    await ctx.db.insert("projects", {
      ...projectFields,
      id,
      title: project.title.trim().slice(0, 160),
      notes: project.notes.trim().slice(0, 4000),
      ownerUserId: identity.tokenIdentifier,
      assigneeUserIds,
      workflowStages,
      workflowStageId: firstStage.id,
      status: statusForPurpose(firstStage.purpose),
      earnings: salaryPlan || (!project.teamId && project.workType === settings.salaryWorkType)
        ? 0
        : Math.max(0, project.earnings),
      archived: false,
      paid: false,
      createdAt: now,
      updatedAt: now,
    });
    for (const [index, output] of starterOutputs.entries()) {
      const title = output.title.trim().slice(0, 160);
      if (!title) throw new Error("Project Output title is required");
      await ctx.db.insert("projectOutputs", {
        ownerUserId: identity.tokenIdentifier,
        projectId: id,
        teamId: project.teamId,
        id: `${id}:output:${index + 1}`.slice(0, 80),
        title,
        description: "",
        category: output.category,
        reviewState: output.reviewState,
        dueDate: project.dueDate,
        archived: false,
        createdAt: now,
        updatedAt: now,
      });
    }
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
    const salaryPlanId = args.changes.salaryPlanId === null
      ? undefined
      : args.changes.salaryPlanId ?? project.salaryPlanId;
    if (salaryPlanId !== project.salaryPlanId) {
      const settledBatch = (await ctx.db
        .query("projectSalaryBatches")
        .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", project.ownerUserId))
        .collect())
        .some((batch) => batch.projectIds.includes(project.id));
      if (settledBatch) throw new Error("A Project in a completed Salary Batch cannot change Salary Plans");
    }
    const settings = await validateClientAndGroup(ctx, {
      userId: identity.tokenIdentifier,
      teamId: project.teamId,
      clientId,
      projectGroupId,
    });
    const salaryPlan = await validateSalaryPlan(
      ctx,
      salaryPlanId,
      identity.tokenIdentifier,
      project.teamId,
      clientId,
    );
    const title = args.changes.title?.trim();
    if (args.changes.title !== undefined && !title) throw new Error("Project title is required");
    const workType = args.changes.workType ?? project.workType;
    const earnings = salaryPlan || (!project.teamId && workType === settings.salaryWorkType)
      ? 0
      : Math.max(0, args.changes.earnings ?? project.earnings);
    const assigneeUserIds = args.changes.assigneeUserIds === undefined
      ? undefined
      : await validatedAssignees(ctx, project.teamId, args.changes.assigneeUserIds);
    await ctx.db.patch(project._id, {
      ...args.changes,
      clientId,
      salaryPlanId,
      projectGroupId,
      earnings,
      ...(title === undefined ? {} : { title: title.slice(0, 160) }),
      ...(args.changes.notes === undefined ? {} : { notes: args.changes.notes.trim().slice(0, 4000) }),
      ...(assigneeUserIds === undefined ? {} : { assigneeUserIds }),
      updatedAt: new Date().toISOString(),
    });
    return null;
  },
});

export const setPayment = mutation({
  args: { projectId: v.string(), paid: v.boolean() },
  handler: async (ctx, args) => {
    const project = await getProject(ctx, args.projectId);
    const identity = await requirePaymentAccess(ctx, project);
    if (project.status !== "Delivered") throw new Error("Only delivered Projects can be marked paid");
    if (project.salaryPlanId) throw new Error("Salary Plan Projects use Salary Batch payment tracking");
    if (!(Number.isFinite(project.earnings) && project.earnings > 0)) {
      throw new Error("Project must have a positive agreed amount");
    }
    if (await isLegacySalaryProject(ctx, project)) {
      throw new Error("Salary Projects use Salary Batch payment tracking");
    }
    const paidDate = args.paid ? project.paidDate ?? new Date().toISOString() : undefined;
    await ctx.db.patch(project._id, {
      paid: args.paid,
      paidDate,
      updatedAt: new Date().toISOString(),
    });
    await recordPaymentActivity(ctx, project, identity, args.paid);
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
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", identity.tokenIdentifier))
      .collect();
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
        ...(effect.plan ? {
          salaryPlanId: effect.plan._id,
          clientId: effect.plan.clientId,
          clientName: effect.clientName,
          planStartDate: effect.plan.startDate,
          planNotes: effect.plan.notes,
        } : {}),
        completedAt: now,
        paid: false,
        received: false,
      });
    }
    return { ...effect.result, completedAt };
  },
});
