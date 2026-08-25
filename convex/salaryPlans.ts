import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

type FunctionCtx = QueryCtx | MutationCtx;

const planFields = {
  clientId: v.string(),
  requiredProjectCount: v.number(),
  amount: v.number(),
  startDate: v.string(),
  notes: v.string(),
};

async function requireIdentity(ctx: FunctionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

async function requireClient(ctx: FunctionCtx, ownerUserId: string, clientId: string) {
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_userId", (q) => q.eq("userId", ownerUserId))
    .unique();
  if (!settings?.clients?.some((client) => client.id === clientId && !client.archived)) {
    throw new Error("Salary Plan Client must belong to this Workspace");
  }
}

function validateTerms(requiredProjectCount: number, amount: number, startDate: string, notes: string) {
  if (!Number.isFinite(requiredProjectCount) || !Number.isInteger(requiredProjectCount) || requiredProjectCount < 1 || requiredProjectCount > 500) {
    throw new Error("Salary Plan Project count must be a whole number from 1 to 500");
  }
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Salary Plan amount must be zero or higher");
  if (!startDate.trim()) throw new Error("Salary Plan start date is required");
  if (notes.length > 4000) throw new Error("Salary Plan notes are too long");
}

async function getOwnedPlan(ctx: FunctionCtx, planId: Doc<"salaryPlans">["_id"], ownerUserId: string) {
  const plan = await ctx.db.get("salaryPlans", planId);
  if (!plan || plan.ownerUserId !== ownerUserId) throw new Error("Salary Plan not found");
  return plan;
}

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    if (args.includeArchived) {
      return await ctx.db
        .query("salaryPlans")
        .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", identity.tokenIdentifier))
        .take(500);
    }
    return await ctx.db
      .query("salaryPlans")
      .withIndex("by_ownerUserId_and_archived", (q) => q.eq("ownerUserId", identity.tokenIdentifier).eq("archived", false))
      .take(500);
  },
});

export const create = mutation({
  args: planFields,
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    validateTerms(args.requiredProjectCount, args.amount, args.startDate, args.notes);
    await requireClient(ctx, identity.tokenIdentifier, args.clientId);
    const now = new Date().toISOString();
    return await ctx.db.insert("salaryPlans", {
      ownerUserId: identity.tokenIdentifier,
      clientId: args.clientId,
      requiredProjectCount: args.requiredProjectCount,
      amount: args.amount,
      startDate: args.startDate.trim(),
      notes: args.notes.trim().slice(0, 4000),
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { planId: v.id("salaryPlans"), changes: v.object({ ...planFields, archived: v.optional(v.boolean()) }) },
  handler: async (ctx, { planId, changes }) => {
    const identity = await requireIdentity(ctx);
    await getOwnedPlan(ctx, planId, identity.tokenIdentifier);
    validateTerms(changes.requiredProjectCount, changes.amount, changes.startDate, changes.notes);
    await requireClient(ctx, identity.tokenIdentifier, changes.clientId);
    await ctx.db.patch(planId, {
      clientId: changes.clientId,
      requiredProjectCount: changes.requiredProjectCount,
      amount: changes.amount,
      startDate: changes.startDate.trim(),
      notes: changes.notes.trim().slice(0, 4000),
      ...(changes.archived === undefined ? {} : { archived: changes.archived }),
      updatedAt: new Date().toISOString(),
    });
    return null;
  },
});

export const setArchived = mutation({
  args: { planId: v.id("salaryPlans"), archived: v.boolean() },
  handler: async (ctx, { planId, archived }) => {
    const identity = await requireIdentity(ctx);
    await getOwnedPlan(ctx, planId, identity.tokenIdentifier);
    await ctx.db.patch(planId, { archived, updatedAt: new Date().toISOString() });
    return null;
  },
});

export const listBatches = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("projectSalaryBatches")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", identity.tokenIdentifier))
      .take(500);
  },
});

export const setReceived = mutation({
  args: { batchId: v.id("projectSalaryBatches"), received: v.boolean(), correctionNote: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const batch = await getOwnedBatch(ctx, args.batchId, identity.tokenIdentifier);
    if (args.correctionNote !== undefined && args.correctionNote.length > 4000) throw new Error("Correction note is too long");
    const receivedAt = args.received ? batch.receivedAt ?? new Date().toISOString() : undefined;
    await ctx.db.patch(batch._id, {
      received: args.received,
      receivedAt,
      paid: args.received,
      paidAt: args.received ? batch.paidAt ?? receivedAt : undefined,
      ...(args.correctionNote === undefined ? {} : { correctionNote: args.correctionNote.trim().slice(0, 4000) }),
    });
    return null;
  },
});

export const setCorrectionNote = mutation({
  args: { batchId: v.id("projectSalaryBatches"), correctionNote: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const batch = await getOwnedBatch(ctx, args.batchId, identity.tokenIdentifier);
    if (args.correctionNote.length > 4000) throw new Error("Correction note is too long");
    await ctx.db.patch(batch._id, { correctionNote: args.correctionNote.trim().slice(0, 4000) });
    return null;
  },
});

async function getOwnedBatch(ctx: FunctionCtx, batchId: Doc<"projectSalaryBatches">["_id"], ownerUserId: string) {
  const batch = await ctx.db.get("projectSalaryBatches", batchId);
  if (!batch || batch.ownerUserId !== ownerUserId) throw new Error("Salary Batch not found");
  return batch;
}
