import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import {
  billingPeriodValidator,
  reconciliationStateValidator,
  subscriptionPlanValidator,
  subscriptionStatusValidator,
} from "./domainValidators";

const GIB = 1024 ** 3;

const capabilityValidator = v.object({
  fileUploads: v.boolean(),
  customWorkflowTemplates: v.boolean(),
  advancedReports: v.boolean(),
  salaryPlans: v.boolean(),
  customPortalBranding: v.boolean(),
  clientHub: v.boolean(),
  teamFeatures: v.boolean(),
});

const entitlementValidator = v.object({
  clerkOrganizationId: v.union(v.string(), v.null()),
  plan: subscriptionPlanValidator,
  billingPeriod: billingPeriodValidator,
  subscriptionStatus: subscriptionStatusValidator,
  trialEndsAt: v.union(v.string(), v.null()),
  reconciliationState: reconciliationStateValidator,
  editorSeatAllowance: v.number(),
  storageQuotaBytes: v.number(),
  billingHealthy: v.boolean(),
  blockedReasons: v.array(
    v.union(v.literal("payment_past_due"), v.literal("subscription_canceled"))
  ),
  capabilities: capabilityValidator,
  canManageBilling: v.boolean(),
});

const CLERK_PLAN_ID_TO_RELAY_PLAN = {
  free: "free",
  creator: "creator",
  team: "team",
} as const;

function relayPlanForClerkId(clerkPlanId: string) {
  if (clerkPlanId === "free") return CLERK_PLAN_ID_TO_RELAY_PLAN.free;
  if (clerkPlanId === "creator") return CLERK_PLAN_ID_TO_RELAY_PLAN.creator;
  if (clerkPlanId === "team") return CLERK_PLAN_ID_TO_RELAY_PLAN.team;
  throw new Error("Unknown Clerk plan identifier");
}

type SubscriptionPlan = Doc<"workspaceSubscriptions">["plan"];
type SubscriptionProjection = Omit<
  Doc<"workspaceSubscriptions">,
  "_id" | "_creationTime"
>;

export function pendingFreeProjection(
  workspaceId: Id<"teamWorkspaces">
): SubscriptionProjection {
  return {
    workspaceId,
    plan: "free",
    billingPeriod: null,
    subscriptionStatus: "free",
    confirmedEditorQuantity: 1,
    includedEditorSeatQuantity: 1,
    purchasedExtraEditorSeatQuantity: 0,
    storageAddonQuantity: 0,
    reconciliationState: "pending",
    updatedAt: new Date().toISOString(),
  };
}

export async function insertPendingFreeProjection(
  ctx: MutationCtx,
  workspaceId: Id<"teamWorkspaces">
) {
  const existing = await projectionForWorkspace(ctx, workspaceId);
  if (existing) return existing._id;
  return await ctx.db.insert(
    "workspaceSubscriptions",
    pendingFreeProjection(workspaceId)
  );
}

async function currentWorkspace(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  clerkOrganizationId: unknown
) {
  if (typeof clerkOrganizationId === "string") {
    const projection = await ctx.db
      .query("workspaceSubscriptions")
      .withIndex("by_clerkOrganizationId", (q) =>
        q.eq("clerkOrganizationId", clerkOrganizationId)
      )
      .unique();
    if (projection) {
      const membership = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId_and_userId", (q) =>
          q.eq("teamId", projection.workspaceId).eq("userId", userId)
        )
        .unique();
      const workspace = await ctx.db.get(projection.workspaceId);
      if (membership?.status === "active" && workspace)
        return { membership, workspace };
    }
  }
  const memberships = await ctx.db
    .query("teamMembers")
    .withIndex("by_userId_and_status", (q) =>
      q.eq("userId", userId).eq("status", "active")
    )
    .take(2);
  if (memberships.length > 1)
    throw new Error("Select an active Workspace before viewing billing");
  const membership = memberships[0];
  if (!membership) return null;
  const workspaceId = ctx.db.normalizeId("teamWorkspaces", membership.teamId);
  if (!workspaceId) return null;
  const workspace = await ctx.db.get(workspaceId);
  return workspace ? { membership, workspace } : null;
}

async function projectionForWorkspace(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"teamWorkspaces">
) {
  return await ctx.db
    .query("workspaceSubscriptions")
    .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
    .unique();
}

function storageQuotaBytes(
  projection: SubscriptionProjection,
  plan: SubscriptionPlan
) {
  const base = plan === "creator" ? 5 * GIB : plan === "team" ? 15 * GIB : 0;
  const editorSeatStorage =
    plan === "team" ? projection.purchasedExtraEditorSeatQuantity * 2 * GIB : 0;
  // Storage Add-ons remain disabled until ticket 08 records cost approval.
  return base + editorSeatStorage;
}

function entitlements(projection: SubscriptionProjection) {
  const paid =
    (projection.subscriptionStatus === "active" ||
      projection.subscriptionStatus === "trialing") &&
    projection.plan !== "free";
  const plan: SubscriptionPlan = paid ? projection.plan : "free";
  const blockedReasons: ("payment_past_due" | "subscription_canceled")[] = [];
  if (projection.subscriptionStatus === "past_due")
    blockedReasons.push("payment_past_due");
  if (projection.subscriptionStatus === "canceled")
    blockedReasons.push("subscription_canceled");
  return {
    clerkOrganizationId: projection.clerkOrganizationId ?? null,
    plan,
    billingPeriod: paid ? projection.billingPeriod : null,
    subscriptionStatus: projection.subscriptionStatus,
    trialEndsAt: projection.trialEndsAt ?? null,
    reconciliationState: projection.reconciliationState,
    editorSeatAllowance:
      plan === "team"
        ? projection.includedEditorSeatQuantity +
          projection.purchasedExtraEditorSeatQuantity
        : 1,
    storageQuotaBytes: storageQuotaBytes(projection, plan),
    billingHealthy: ["free", "active", "trialing"].includes(
      projection.subscriptionStatus
    ),
    blockedReasons,
    capabilities: {
      fileUploads: plan !== "free",
      customWorkflowTemplates: plan !== "free",
      advancedReports: plan !== "free",
      salaryPlans: plan !== "free",
      customPortalBranding: plan !== "free",
      clientHub: plan !== "free",
      teamFeatures: plan === "team",
    },
  };
}

export const getCurrent = query({
  args: {},
  returns: v.union(entitlementValidator, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const current = await currentWorkspace(
      ctx,
      identity.tokenIdentifier,
      identity.org_id
    );
    if (!current) return null;
    const projection = await projectionForWorkspace(ctx, current.workspace._id);
    return {
      ...entitlements(
        projection ?? {
          ...pendingFreeProjection(current.workspace._id),
          reconciliationState: "repair",
        }
      ),
      canManageBilling: current.membership.role === "Owner",
    };
  },
});

export const repairCurrent = mutation({
  args: {},
  returns: v.id("workspaceSubscriptions"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const current = await currentWorkspace(
      ctx,
      identity.tokenIdentifier,
      identity.org_id
    );
    if (!current || current.membership.role !== "Owner")
      throw new Error("Only the Workspace Owner can repair billing");
    const existing = await projectionForWorkspace(ctx, current.workspace._id);
    const projectionId =
      existing?._id ??
      (await insertPendingFreeProjection(ctx, current.workspace._id));
    await ctx.scheduler.runAfter(
      0,
      internal.workspaceSubscriptionProvisioning.provision,
      {
        workspaceId: current.workspace._id,
        workspaceName: current.workspace.name,
        clerkUserId: identity.subject,
      }
    );
    return projectionId;
  },
});

export const linkClerkOrganization = internalMutation({
  args: {
    workspaceId: v.id("teamWorkspaces"),
    clerkOrganizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const projection = await projectionForWorkspace(ctx, args.workspaceId);
    if (!projection) throw new Error("Workspace subscription missing");
    const duplicate = await ctx.db
      .query("workspaceSubscriptions")
      .withIndex("by_clerkOrganizationId", (q) =>
        q.eq("clerkOrganizationId", args.clerkOrganizationId)
      )
      .unique();
    if (duplicate && duplicate.workspaceId !== args.workspaceId)
      throw new Error("Clerk Organization already belongs to a Workspace");
    await ctx.db.patch(projection._id, {
      clerkOrganizationId: args.clerkOrganizationId,
      reconciliationState: "synced",
      updatedAt: new Date().toISOString(),
    });
    return null;
  },
});

export const markRepairRequired = internalMutation({
  args: { workspaceId: v.id("teamWorkspaces") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const projection = await projectionForWorkspace(ctx, args.workspaceId);
    if (projection) {
      await ctx.db.patch(projection._id, {
        reconciliationState: "repair",
        updatedAt: new Date().toISOString(),
      });
    }
    return null;
  },
});

export const confirm = internalMutation({
  args: {
    workspaceId: v.id("teamWorkspaces"),
    clerkOrganizationId: v.string(),
    clerkSubscriptionId: v.optional(v.string()),
    clerkPlanId: v.string(),
    billingPeriod: billingPeriodValidator,
    subscriptionStatus: subscriptionStatusValidator,
    trialStartsAt: v.optional(v.string()),
    trialEndsAt: v.optional(v.string()),
    confirmedEditorQuantity: v.number(),
    includedEditorSeatQuantity: v.number(),
    purchasedExtraEditorSeatQuantity: v.number(),
    storageAddonQuantity: v.number(),
    clerkEventAt: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const projection = await projectionForWorkspace(ctx, args.workspaceId);
    if (!projection) throw new Error("Workspace subscription missing");
    if (
      projection.lastClerkEventAt &&
      projection.lastClerkEventAt > args.clerkEventAt
    ) {
      return null;
    }
    const plan = relayPlanForClerkId(args.clerkPlanId);
    const quantities = [
      args.confirmedEditorQuantity,
      args.includedEditorSeatQuantity,
      args.purchasedExtraEditorSeatQuantity,
      args.storageAddonQuantity,
    ];
    if (
      quantities.some(
        (quantity) => !Number.isSafeInteger(quantity) || quantity < 0
      )
    )
      throw new Error("Billing quantities must be non-negative integers");
    const { clerkEventAt, ...confirmed } = args;
    await ctx.db.patch(projection._id, {
      ...confirmed,
      plan,
      lastClerkEventAt: clerkEventAt,
      reconciliationState: "synced",
      updatedAt: new Date().toISOString(),
    });
    return null;
  },
});
