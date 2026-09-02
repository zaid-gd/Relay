import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  billingPeriodValidator,
  reconciliationStateValidator,
  subscriptionPlanValidator,
  subscriptionStatusValidator,
} from "./domainValidators";

export const FREE_STORAGE_QUOTA_BYTES = 0;
export const CREATOR_STORAGE_QUOTA_BYTES = 5_000_000_000;
export const TEAM_BASE_STORAGE_QUOTA_BYTES = 15_000_000_000;

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
  free_org: "free",
  free_user: "free",
  creator: "creator",
  creator_plan: "creator",
  team: "team",
  team_plan: "team",
} as const;

function relayPlanForClerkId(clerkPlanId: string) {
  if (
    clerkPlanId === "free" ||
    clerkPlanId === "free_org" ||
    clerkPlanId === "free_user"
  ) {
    return CLERK_PLAN_ID_TO_RELAY_PLAN[clerkPlanId];
  }
  if (clerkPlanId === "creator" || clerkPlanId === "creator_plan") {
    return CLERK_PLAN_ID_TO_RELAY_PLAN[clerkPlanId];
  }
  if (clerkPlanId === "team" || clerkPlanId === "team_plan") {
    return CLERK_PLAN_ID_TO_RELAY_PLAN[clerkPlanId];
  }
  throw new Error("Unknown Clerk plan identifier");
}

type SubscriptionPlan = Doc<"workspaceSubscriptions">["plan"];
type SubscriptionProjection = Omit<
  Doc<"workspaceSubscriptions">,
  "_id" | "_creationTime"
>;

interface ConfirmedSubscription {
  clerkUserId?: string;
  clerkOrganizationId?: string;
  clerkSubscriptionId?: string;
  clerkPlanId: string;
  billingPeriod: Doc<"workspaceSubscriptions">["billingPeriod"];
  subscriptionStatus: Doc<"workspaceSubscriptions">["subscriptionStatus"];
  trialStartsAt?: string;
  trialEndsAt?: string;
  confirmedEditorQuantity: number;
  includedEditorSeatQuantity: number;
  purchasedExtraEditorSeatQuantity: number;
  storageAddonQuantity: number;
  clerkEventAt: string;
}

export function pendingFreeProjection(
  workspaceId: Id<"teamWorkspaces">,
  clerkUserId?: string
): SubscriptionProjection {
  return {
    workspaceId,
    clerkUserId,
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
  workspaceId: Id<"teamWorkspaces">,
  clerkUserId?: string
) {
  const existing = await projectionForWorkspace(ctx, workspaceId);
  if (existing) return existing._id;
  return await ctx.db.insert(
    "workspaceSubscriptions",
    pendingFreeProjection(workspaceId, clerkUserId)
  );
}

async function currentWorkspace(ctx: QueryCtx | MutationCtx, userId: string) {
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

async function confirmProjection(
  ctx: MutationCtx,
  projection: Doc<"workspaceSubscriptions">,
  confirmation: ConfirmedSubscription
) {
  if (
    projection.lastClerkEventAt &&
    projection.lastClerkEventAt > confirmation.clerkEventAt
  ) {
    return;
  }
  const quantities = [
    confirmation.confirmedEditorQuantity,
    confirmation.includedEditorSeatQuantity,
    confirmation.purchasedExtraEditorSeatQuantity,
    confirmation.storageAddonQuantity,
  ];
  if (
    quantities.some(
      (quantity) => !Number.isSafeInteger(quantity) || quantity < 0
    )
  ) {
    throw new Error("Billing quantities must be non-negative integers");
  }
  const { clerkEventAt, ...confirmed } = confirmation;
  await ctx.db.patch(projection._id, {
    ...confirmed,
    plan: relayPlanForClerkId(confirmation.clerkPlanId),
    lastClerkEventAt: clerkEventAt,
    reconciliationState: "synced",
    updatedAt: new Date().toISOString(),
  });
}

function storageQuotaBytes(
  projection: SubscriptionProjection,
  plan: SubscriptionPlan
) {
  const base =
    plan === "creator"
      ? CREATOR_STORAGE_QUOTA_BYTES
      : plan === "team"
        ? TEAM_BASE_STORAGE_QUOTA_BYTES
        : FREE_STORAGE_QUOTA_BYTES;
  const editorSeatStorage =
    plan === "team"
      ? projection.purchasedExtraEditorSeatQuantity * 2_000_000_000
      : 0;
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

type WorkspaceCapability = keyof ReturnType<
  typeof entitlements
>["capabilities"];

const capabilityErrors: Record<WorkspaceCapability, string> = {
  fileUploads:
    "File uploads require a Creator or Team plan. External links remain available on Free.",
  customWorkflowTemplates:
    "Custom Workflow Templates require a Creator or Team plan.",
  advancedReports: "Advanced reports require a Creator or Team plan.",
  salaryPlans: "Salary Plans require a Creator or Team plan.",
  customPortalBranding:
    "Custom portal branding requires a Creator or Team plan.",
  clientHub: "Client Hub requires a Creator or Team plan.",
  teamFeatures: "Team features require a Team plan.",
};

export async function requireWorkspaceCapability(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"teamWorkspaces">,
  capability: WorkspaceCapability
) {
  const resolved = await resolveWorkspaceEntitlements(ctx, workspaceId);
  if (!resolved.capabilities[capability]) {
    throw new Error(capabilityErrors[capability]);
  }
  return resolved;
}

export async function resolveWorkspaceEntitlements(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"teamWorkspaces">
) {
  const projection = await projectionForWorkspace(ctx, workspaceId);
  return entitlements(
    projection ?? {
      ...pendingFreeProjection(workspaceId),
      reconciliationState: "repair",
    }
  );
}

export async function requireCurrentWorkspaceCapability(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  capability: WorkspaceCapability
) {
  const current = await currentWorkspace(ctx, userId);
  if (!current) throw new Error("Workspace required");
  return await requireWorkspaceCapability(
    ctx,
    current.workspace._id,
    capability
  );
}

export const getCurrent = query({
  args: {},
  returns: v.union(entitlementValidator, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const current = await currentWorkspace(ctx, identity.tokenIdentifier);
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
    const current = await currentWorkspace(ctx, identity.tokenIdentifier);
    if (!current || current.membership.role !== "Owner")
      throw new Error("Only the Workspace Owner can repair billing");
    const existing = await projectionForWorkspace(ctx, current.workspace._id);
    const projectionId =
      existing?._id ??
      (await insertPendingFreeProjection(
        ctx,
        current.workspace._id,
        identity.subject
      ));
    if (existing?.clerkUserId !== identity.subject) {
      await ctx.db.patch(projectionId, {
        clerkUserId: identity.subject,
        updatedAt: new Date().toISOString(),
      });
    }
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
    clerkUserId: v.optional(v.string()),
    clerkOrganizationId: v.optional(v.string()),
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
    const { workspaceId: _, ...confirmation } = args;
    await confirmProjection(ctx, projection, confirmation);
    return null;
  },
});

export const confirmForClerkUser = internalMutation({
  args: {
    clerkUserId: v.string(),
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
    const projection = await ctx.db
      .query("workspaceSubscriptions")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();
    if (!projection) throw new Error("Clerk user subscription missing");
    await confirmProjection(ctx, projection, args);
    return null;
  },
});
