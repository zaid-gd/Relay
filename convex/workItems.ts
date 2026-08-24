import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { deleteProjectActivity, recordProjectActivity } from "./projectActivity";
import {
  fileCategoryValidator,
  fileStatusValidator,
  storedProjectStatusValidator,
} from "./domainValidators";
import type {
  ClientPortalStage,
  PortalEventKind,
} from "../src/lib/domain-values";

const integrationLinkValidator = v.record(
  v.string(),
  v.object({
    url: v.string(),
    label: v.string(),
    notes: v.string(),
    updatedAt: v.string(),
  })
);

const templateDeliverableValidator = v.object({
  title: v.string(),
  category: fileCategoryValidator,
  initialStatus: fileStatusValidator,
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const personalItems = await ctx.db
      .query("workItems")
      .withIndex("by_userId_and_teamId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("teamId", undefined)
      )
      .take(500);
    const activeMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("status", "active")
      )
      .first();
    const canViewTeamProjects = Boolean(activeMembership?.permissions.viewProjects);
    const teamItems = activeMembership && canViewTeamProjects
      ? await ctx.db
          .query("workItems")
          .withIndex("by_teamId", (q) => q.eq("teamId", activeMembership.teamId))
          .take(500)
      : [];
    const currentUserTeamItems = teamItems
      .filter((item) => item.userId === identity.tokenIdentifier);
    const currentUserItems = [...personalItems, ...currentUserTeamItems]
      .sort((left, right) => left._creationTime - right._creationTime);
    const itemsById = new Map<string, Doc<"workItems">>();
    for (const item of [...currentUserItems, ...teamItems]) {
      itemsById.set(item.id, item);
    }
    const items = Array.from(itemsById.values());
    return items.map((item) => ({
      id: item.id,
      teamId: item.teamId,
      ownerUserId: item.ownerUserId,
      assigneeUserIds: item.assigneeUserIds,
      profileId: item.profileId,
      title: item.title,
      client: item.client,
      clientId: item.clientId,
      status: item.status,
      workType: item.workType,
      startDate: item.startDate,
      dueDate: item.dueDate,
      earnings: item.earnings,
      paid: item.paid,
      paidDate: item.paidDate,
      notes: item.notes,
      templateId: item.templateId,
      templateProjectType: item.templateProjectType,
      workflowStages: item.workflowStages,
      templateDeliverables: item.templateDeliverables,
      checklistItems: item.checklistItems,
      checklistCompleted: item.checklistCompleted,
      integrationLinks: item.integrationLinks,
      createdAt: item.createdAt,
    }));
  },
});

export const replaceAll = mutation({
  args: {
    deleteMissing: v.optional(v.boolean()),
    items: v.array(
      v.object({
        id: v.string(),
        teamId: v.optional(v.string()),
        ownerUserId: v.optional(v.string()),
        assigneeUserIds: v.optional(v.array(v.string())),
        profileId: v.string(),
        title: v.string(),
        client: v.optional(v.string()),
        clientId: v.optional(v.string()),
        status: storedProjectStatusValidator,
        workType: v.string(),
        startDate: v.string(),
        dueDate: v.string(),
        earnings: v.number(),
        paid: v.optional(v.boolean()),
        paidDate: v.optional(v.string()),
        notes: v.string(),
        templateId: v.optional(v.string()),
        templateProjectType: v.optional(v.string()),
        workflowStages: v.optional(v.array(v.string())),
        templateDeliverables: v.optional(v.array(templateDeliverableValidator)),
        checklistItems: v.optional(v.array(v.string())),
        checklistCompleted: v.optional(v.record(v.string(), v.boolean())),
        integrationLinks: v.optional(integrationLinkValidator),
        createdAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;
    const activeMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", userId).eq("status", "active")
      )
      .first();
    const canCreateTeamProjects = Boolean(activeMembership?.permissions.createProjects);
    const canEditTeamProjects = Boolean(activeMembership?.permissions.editProjects);
    const canManageTeamProjects = Boolean(activeMembership?.permissions.manageTeam);
    const canUpdateTeamStatus = Boolean(activeMembership?.permissions.updateStatus);
    const personalExisting = await ctx.db
      .query("workItems")
      .withIndex("by_userId_and_teamId", (q) =>
        q.eq("userId", userId).eq("teamId", undefined)
      )
      .take(500);
    const teamExisting = activeMembership
      ? await ctx.db
          .query("workItems")
          .withIndex("by_teamId", (q) => q.eq("teamId", activeMembership.teamId))
          .take(500)
      : [];
    const activeTeamMemberIds = activeMembership
      ? new Set(
          (
            await ctx.db
              .query("teamMembers")
              .withIndex("by_teamId", (q) => q.eq("teamId", activeMembership.teamId))
              .take(6)
          )
            .filter((member) => member.status === "active")
            .map((member) => member.userId)
        )
      : new Set<string>();
    const existingById = new Map<string, Doc<"workItems">>();
    for (const item of [...personalExisting, ...teamExisting]) {
      existingById.set(item.id, item);
    }
    const incomingIds = new Set(args.items.map((item) => item.id));
    const now = new Date().toISOString();

    for (const item of args.items) {
      const existing = existingById.get(item.id);
      const targetTeamId = existing?.teamId ?? item.teamId;
      const isTeamProject = Boolean(targetTeamId);
      if (targetTeamId && activeMembership?.teamId !== targetTeamId) {
        throw new Error("Team access required for this project");
      }
      const normalizedPaid = item.paid ?? false;
      const normalizedPaidDate = item.paidDate ?? "";
      const normalizedChecklistCompleted = item.checklistCompleted ?? {};
      const isStatusOnlyUpdate = Boolean(
        existing &&
        existing.teamId &&
        existing.title === item.title &&
        (existing.client ?? "") === (item.client ?? "") &&
        existing.workType === item.workType &&
        existing.startDate === item.startDate &&
        existing.dueDate === item.dueDate &&
        existing.earnings === item.earnings &&
        (existing.paid ?? false) === normalizedPaid &&
        (existing.paidDate ?? "") === normalizedPaidDate &&
        existing.notes === item.notes &&
        existing.templateId === item.templateId &&
        existing.templateProjectType === item.templateProjectType &&
        JSON.stringify(existing.workflowStages ?? []) === JSON.stringify(item.workflowStages ?? []) &&
        JSON.stringify(existing.templateDeliverables ?? []) === JSON.stringify(item.templateDeliverables ?? []) &&
        JSON.stringify(existing.checklistItems ?? []) === JSON.stringify(item.checklistItems ?? []) &&
        JSON.stringify(existing.checklistCompleted ?? {}) === JSON.stringify(normalizedChecklistCompleted) &&
        JSON.stringify(existing.integrationLinks ?? {}) === JSON.stringify(item.integrationLinks ?? {}) &&
        JSON.stringify(existing.assigneeUserIds ?? []) === JSON.stringify(item.assigneeUserIds ?? [])
      );
      if (isTeamProject && !existing && !canCreateTeamProjects) {
        throw new Error("You do not have permission to create team projects");
      }
      if (isTeamProject && existing && existing.teamId && !canEditTeamProjects && !(isStatusOnlyUpdate && canUpdateTeamStatus)) {
        throw new Error("You do not have permission to edit team projects");
      }
      if (isTeamProject && existing && existing.teamId && isStatusOnlyUpdate && !canEditTeamProjects && canUpdateTeamStatus) {
        if (existing.status !== item.status) {
          await ctx.db.patch(existing._id, { status: item.status });
          await syncClientPortal(ctx, existing, { ...existing, status: item.status });
          await logProjectActivity(ctx, {
            teamId: existing.teamId,
            actorUserId: userId,
            actorName: identity.name || identity.email || "Team member",
            projectId: item.id,
            message: `${item.title} status changed from ${existing.status} to ${item.status}.`,
          });
          await recordProjectActivity(ctx, {
            project: existing,
            actorUserId: userId,
            actorName: identity.name || identity.email || "Team member",
            kind: "status_changed",
            message: `${item.title} status changed from ${existing.status} to ${item.status}.`,
          });
          await notifyProjectAssignees(ctx, {
            teamId: existing.teamId,
            senderUserId: userId,
            ownerUserId: existing.ownerUserId,
            assigneeUserIds: existing.assigneeUserIds ?? [],
            projectId: item.id,
            message: `${item.title} was updated.`,
          });
        }
        continue;
      }
      const requestedAssignees = item.assigneeUserIds ?? existing?.assigneeUserIds ?? [];
      const assigneeUserIds = targetTeamId
        ? requestedAssignees.filter((assigneeUserId) => activeTeamMemberIds.has(assigneeUserId)).slice(0, 5)
        : [];

      const nextItem = {
        profileId: item.profileId,
        title: item.title,
        client: item.client ?? "",
        clientId: item.clientId,
        status: item.status,
        workType: item.workType,
        startDate: item.startDate,
        dueDate: item.dueDate,
        earnings: item.earnings,
        paid: normalizedPaid,
        paidDate: normalizedPaid ? (normalizedPaidDate || now) : "",
        notes: item.notes,
        templateId: item.templateId,
        templateProjectType: item.templateProjectType?.trim().slice(0, 80),
        workflowStages: item.workflowStages?.map((stage) => stage.trim()).filter(Boolean).slice(0, 12),
        templateDeliverables: item.templateDeliverables?.map((deliverable) => ({
          ...deliverable,
          title: deliverable.title.trim().slice(0, 120),
        })).filter((deliverable) => deliverable.title).slice(0, 12),
        checklistItems: item.checklistItems?.map((entry) => entry.trim()).filter(Boolean).slice(0, 20),
        checklistCompleted: Object.fromEntries(
          Object.entries(item.checklistCompleted ?? {})
            .filter(([key, value]) => key.trim() && typeof value === "boolean")
            .slice(0, 20)
            .map(([key, value]) => [key.trim().slice(0, 160), value])
        ),
        integrationLinks: item.integrationLinks,
        createdAt: item.createdAt ?? existing?.createdAt ?? now,
        teamId: targetTeamId,
        ownerUserId: existing?.ownerUserId ?? (targetTeamId ? userId : item.ownerUserId ?? userId),
        assigneeUserIds,
      };

      if (existing) {
        await ctx.db.patch(existing._id, nextItem);
        await syncClientPortal(ctx, existing, { ...existing, ...nextItem });
        const integrationLinksChanged = JSON.stringify(existing.integrationLinks ?? {}) !== JSON.stringify(item.integrationLinks ?? {});
        const importantDetailChanges = [
          existing.title !== item.title ? "title" : "",
          (existing.client ?? "") !== (item.client ?? "") ? "client" : "",
          existing.workType !== item.workType ? "work type" : "",
          existing.startDate !== item.startDate ? "start date" : "",
          existing.dueDate !== item.dueDate ? "due date" : "",
          existing.earnings !== item.earnings ? "amount" : "",
          (existing.paid ?? false) !== nextItem.paid || (existing.paidDate ?? "") !== nextItem.paidDate ? "payment status" : "",
          existing.templateProjectType !== nextItem.templateProjectType ? "project type" : "",
          JSON.stringify(existing.workflowStages ?? []) !== JSON.stringify(nextItem.workflowStages ?? []) ? "workflow" : "",
          JSON.stringify(existing.templateDeliverables ?? []) !== JSON.stringify(nextItem.templateDeliverables ?? []) ? "deliverables" : "",
          JSON.stringify(existing.checklistItems ?? []) !== JSON.stringify(nextItem.checklistItems ?? []) ? "checklist" : "",
          JSON.stringify(existing.checklistCompleted ?? {}) !== JSON.stringify(nextItem.checklistCompleted ?? {}) ? "checklist progress" : "",
          integrationLinksChanged ? "resource links" : "",
        ].filter(Boolean);
        const assignmentsChanged =
          JSON.stringify(existing.assigneeUserIds ?? []) !== JSON.stringify(nextItem.assigneeUserIds);
        if (
          existing.status !== item.status ||
          existing.notes !== item.notes ||
          importantDetailChanges.length ||
          assignmentsChanged
        ) {
          const updateMessage =
            existing.status !== item.status
              ? `${item.title} status changed from ${existing.status} to ${item.status}.`
              : existing.notes !== item.notes
                ? `${item.title} internal notes were updated.`
                : assignmentsChanged
                  ? `${item.title} assignments were updated.`
                  : `${item.title} details updated: ${importantDetailChanges.join(", ")}.`;
          await recordProjectActivity(ctx, {
            project: { ...existing, ...nextItem },
            actorUserId: userId,
            actorName: identity.name || identity.email || "CutLab user",
            kind: existing.status !== item.status ? "status_changed" : assignmentsChanged ? "assignment_changed" : "project_updated",
            message: updateMessage,
          });
        }
        if (targetTeamId && (existing.status !== item.status || existing.notes !== item.notes || importantDetailChanges.length)) {
          const updateMessage =
            existing.status !== item.status
              ? `${item.title} status changed from ${existing.status} to ${item.status}.`
              : existing.notes !== item.notes
                ? `${item.title} notes were updated.`
                : `${item.title} details updated: ${importantDetailChanges.join(", ")}.`;
          await logProjectActivity(ctx, {
            teamId: targetTeamId,
            actorUserId: userId,
            actorName: identity.name || identity.email || "Team member",
            projectId: item.id,
            message: updateMessage,
          });
          await notifyProjectAssignees(ctx, {
            teamId: targetTeamId,
            senderUserId: userId,
            ownerUserId: nextItem.ownerUserId,
            assigneeUserIds: nextItem.assigneeUserIds,
            projectId: item.id,
            message: updateMessage,
          });
        }
        const newlyAssigned = nextItem.assigneeUserIds.filter(
          (assigneeUserId) => !(existing.assigneeUserIds ?? []).includes(assigneeUserId)
        );
        const removedAssignees = (existing.assigneeUserIds ?? []).filter(
          (assigneeUserId) => !nextItem.assigneeUserIds.includes(assigneeUserId)
        );
        if (targetTeamId && removedAssignees.length) {
          await logProjectActivity(ctx, {
            teamId: targetTeamId,
            actorUserId: userId,
            actorName: identity.name || identity.email || "Team member",
            projectId: item.id,
            message: `${item.title} assignment removed for ${removedAssignees.length} team member${removedAssignees.length === 1 ? "" : "s"}.`,
          });
          await notifyProjectAssignees(ctx, {
            teamId: targetTeamId,
            senderUserId: userId,
            ownerUserId: undefined,
            assigneeUserIds: removedAssignees,
            projectId: item.id,
            message: `You were unassigned from ${item.title}.`,
          });
        }
        if (targetTeamId && (newlyAssigned.length || removedAssignees.length)) {
          await notifyProjectAssignees(ctx, {
            teamId: targetTeamId,
            senderUserId: userId,
            ownerUserId: nextItem.ownerUserId,
            assigneeUserIds: [],
            projectId: item.id,
            message: `${item.title} assignment changed.`,
          });
        }
        if (targetTeamId && newlyAssigned.length) {
          await logProjectActivity(ctx, {
            teamId: targetTeamId,
            actorUserId: userId,
            actorName: identity.name || identity.email || "Team member",
            projectId: item.id,
            message: `${item.title} assignment changed for ${newlyAssigned.length} team member${newlyAssigned.length === 1 ? "" : "s"}.`,
          });
          await notifyProjectAssignees(ctx, {
            teamId: targetTeamId,
            senderUserId: userId,
            ownerUserId: undefined,
            assigneeUserIds: newlyAssigned,
            projectId: item.id,
            message: `You were assigned to ${item.title}.`,
          });
        }
      } else {
        const projectId = await ctx.db.insert("workItems", {
          ...nextItem,
          id: item.id,
          userId,
        });
        const createdProject = await ctx.db.get(projectId);
        if (createdProject) {
          await recordProjectActivity(ctx, {
            project: createdProject,
            actorUserId: userId,
            actorName: identity.name || identity.email || "CutLab user",
            kind: "project_created",
            message: `${item.title} was created.`,
            createdAt: nextItem.createdAt,
          });
        }
        if (targetTeamId) {
          await logProjectActivity(ctx, {
            teamId: targetTeamId,
            actorUserId: userId,
            actorName: identity.name || identity.email || "Team member",
            projectId: item.id,
            message: `${item.title} was created.`,
          });
          await notifyProjectAssignees(ctx, {
            teamId: targetTeamId,
            senderUserId: userId,
            ownerUserId: nextItem.ownerUserId,
            assigneeUserIds: nextItem.assigneeUserIds,
            projectId: item.id,
            message: `You were assigned to ${item.title}.`,
          });
        }
      }
    }

    if (args.deleteMissing !== false) {
      for (const existing of personalExisting) {
        if (!incomingIds.has(existing.id) && !existing.teamId) {
          await deleteClientPortal(ctx, existing.id);
          await deleteProjectActivity(ctx, existing.id);
          await ctx.db.delete(existing._id);
        }
      }
      if (activeMembership && (canEditTeamProjects || canManageTeamProjects)) {
        for (const existing of teamExisting) {
          const canDeleteTeamProject = existing.ownerUserId === userId || canManageTeamProjects;
          if (!incomingIds.has(existing.id) && canDeleteTeamProject) {
            await deleteWorkItem(ctx, {
              project: existing,
              userId,
              actorName: identity.name || identity.email || "Team member",
            });
          }
        }
      }
    }
  },
});

export const deleteOne = mutation({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const project = await ctx.db
      .query("workItems")
      .withIndex("by_workItemId", (q) => q.eq("id", args.projectId))
      .unique();
    if (!project) return null;
    const userId = identity.tokenIdentifier;
    if (!project.teamId) {
      if (project.userId !== userId) throw new Error("Project access required");
    } else {
      const membership = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId_and_userId", (q) =>
          q.eq("teamId", project.teamId as string).eq("userId", userId)
        )
        .unique();
      const canDelete = Boolean(
        membership &&
        membership.status === "active" &&
        membership.permissions.editProjects &&
        (project.ownerUserId === userId || membership.permissions.manageTeam)
      );
      if (!canDelete) throw new Error("You do not have permission to delete this team project");
    }
    await deleteWorkItem(ctx, {
      project,
      userId,
      actorName: identity.name || identity.email || "Team member",
    });
    return null;
  },
});

async function deleteWorkItem(
  ctx: MutationCtx,
  args: { project: Doc<"workItems">; userId: string; actorName: string }
) {
  if (args.project.teamId) {
    await logProjectActivity(ctx, {
      teamId: args.project.teamId,
      actorUserId: args.userId,
      actorName: args.actorName,
      projectId: args.project.id,
      message: `${args.project.title} was deleted.`,
    });
    await notifyProjectAssignees(ctx, {
      teamId: args.project.teamId,
      senderUserId: args.userId,
      ownerUserId: args.project.ownerUserId,
      assigneeUserIds: args.project.assigneeUserIds ?? [],
      projectId: args.project.id,
      message: `${args.project.title} was deleted.`,
    });
    await deleteProjectComments(ctx, {
      teamId: args.project.teamId,
      projectId: args.project.id,
    });
  }
  const projectFiles = await ctx.db
    .query("projectFiles")
    .withIndex("by_projectId_and_createdAt", (q) => q.eq("projectId", args.project.id))
    .take(100);
  const projectVersions = await ctx.db
    .query("projectFileVersions")
    .withIndex("by_projectId_and_uploadedAt", (q) => q.eq("projectId", args.project.id))
    .take(500);
  await Promise.all(
    projectVersions.map(async (version) => {
      if (version.storageId) await ctx.storage.delete(version.storageId);
      if (version.r2Key) await ctx.scheduler.runAfter(0, internal.r2.deleteObject, { key: version.r2Key });
      await ctx.db.delete(version._id);
    })
  );
  await Promise.all(projectFiles.map((file) => ctx.db.delete(file._id)));
  await deleteClientPortal(ctx, args.project.id);
  await deleteProjectActivity(ctx, args.project.id);
  await ctx.db.delete(args.project._id);
}

async function logProjectActivity(
  ctx: MutationCtx,
  args: {
    teamId: string;
    actorUserId: string;
    actorName: string;
    projectId: string;
    message: string;
  }
) {
  await ctx.db.insert("teamActivity", {
    teamId: args.teamId,
    actorUserId: args.actorUserId,
    actorName: args.actorName,
    kind: "project_update",
    projectId: args.projectId,
    message: args.message,
    createdAt: new Date().toISOString(),
  });
}

function portalProgress(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("deliver") || normalized.includes("complete") || normalized === "done") return 100;
  if (normalized.includes("review") || normalized.includes("revision") || normalized.includes("feedback")) return 75;
  if (normalized.includes("progress") || normalized.includes("editing") || normalized.includes("active")) return 45;
  return 15;
}

function portalStage(status: string): ClientPortalStage {
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("deliver") || normalized.includes("complete") || normalized === "done") return "Delivered";
  if (normalized.includes("review") || normalized.includes("revision") || normalized.includes("feedback")) return "Review";
  if (normalized.includes("progress") || normalized.includes("editing") || normalized.includes("active")) return "In Progress";
  return "Planning";
}

function portalMilestone(stage: ClientPortalStage): {
  kind: PortalEventKind;
  title: string;
  body: string;
} {
  if (stage === "In Progress") {
    return { kind: "work_started", title: "Work started", body: "Production work is now underway." };
  }
  if (stage === "Review") {
    return { kind: "review_sent", title: "Review sent", body: "The latest project version is ready for client review." };
  }
  if (stage === "Delivered") {
    return { kind: "delivery_completed", title: "Delivery completed", body: "The project has reached final delivery." };
  }
  return { kind: "status_changed", title: "Project moved to Planning", body: "The project workflow returned to planning." };
}

async function syncClientPortal(
  ctx: MutationCtx,
  previous: Doc<"workItems">,
  next: Pick<Doc<"workItems">, "id" | "title" | "client" | "workType" | "status" | "startDate" | "dueDate">
) {
  const portal = await ctx.db
    .query("clientPortals")
    .withIndex("by_projectId", (q) => q.eq("projectId", next.id))
    .unique();
  if (!portal) return;
  const now = new Date().toISOString();
  await ctx.db.patch(portal._id, {
    title: next.title,
    clientName: next.client ?? "",
    projectType: next.workType,
    ...(previous.status !== next.status ? { status: portalStage(next.status) } : {}),
    sourceStatus: next.status,
    startDate: next.startDate,
    dueDate: next.dueDate,
    ...(previous.status !== next.status ? { progress: portalProgress(next.status) } : {}),
    updatedAt: now,
  });
  if (previous.status === next.status) return;

  const milestone = portalMilestone(portalStage(next.status));
  const events = await ctx.db
    .query("portalEvents")
    .withIndex("by_portalId_and_createdAt", (q) => q.eq("portalId", portal._id))
    .order("desc")
    .take(100);
  if (events.length >= 100) await ctx.db.delete(events[events.length - 1]._id);
  await ctx.db.insert("portalEvents", {
    portalId: portal._id,
    kind: milestone.kind,
    title: milestone.title,
    body: milestone.body,
    createdAt: now,
  });
}

async function deleteClientPortal(ctx: MutationCtx, projectId: string) {
  const portal = await ctx.db
    .query("clientPortals")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .unique();
  if (!portal) return;
  const deliverables = await ctx.db
    .query("portalDeliverables")
    .withIndex("by_portalId_and_createdAt", (q) => q.eq("portalId", portal._id))
    .take(50);
  const revisions = await ctx.db
    .query("portalRevisions")
    .withIndex("by_portalId_and_createdAt", (q) => q.eq("portalId", portal._id))
    .take(100);
  const events = await ctx.db
    .query("portalEvents")
    .withIndex("by_portalId_and_createdAt", (q) => q.eq("portalId", portal._id))
    .take(100);
  await Promise.all([
    ...deliverables.map((item) => ctx.db.delete(item._id)),
    ...revisions.map((item) => ctx.db.delete(item._id)),
    ...events.map((item) => ctx.db.delete(item._id)),
  ]);
  await ctx.db.delete(portal._id);
}

async function deleteProjectComments(
  ctx: MutationCtx,
  args: {
    teamId: string;
    projectId: string;
  }
) {
  while (true) {
    const comments = await ctx.db
      .query("projectComments")
      .withIndex("by_teamId_and_projectId", (q) =>
        q.eq("teamId", args.teamId).eq("projectId", args.projectId)
      )
      .take(100);
    if (comments.length === 0) break;
    await Promise.all(comments.map((comment) => ctx.db.delete(comment._id)));
  }
}

async function notifyProjectAssignees(
  ctx: MutationCtx,
  args: {
    teamId: string;
    senderUserId: string;
    ownerUserId?: string;
    assigneeUserIds: string[];
    projectId: string;
    message: string;
  }
) {
  const recipientIds = [...new Set([args.ownerUserId, ...args.assigneeUserIds])];
  await Promise.all(
    recipientIds
      .filter((assigneeUserId): assigneeUserId is string => Boolean(assigneeUserId && assigneeUserId !== args.senderUserId))
      .slice(0, 5)
      .map((assigneeUserId) =>
        ctx.db.insert("teamNotifications", {
          teamId: args.teamId,
          userId: assigneeUserId,
          kind: "project_update",
          projectId: args.projectId,
          message: args.message,
          read: false,
          createdAt: new Date().toISOString(),
        })
      )
  );
}
