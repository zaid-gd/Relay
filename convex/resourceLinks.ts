import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const RESOURCE_LINK_LIMIT = 500;

const resourceLinkSchema = v.object({
  id: v.string(),
  title: v.string(),
  url: v.string(),
  category: v.string(),
  projectId: v.string(),
  notes: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("resourceLinks")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(RESOURCE_LINK_LIMIT);
  },
});

export const replaceAll = mutation({
  args: {
    resources: v.array(resourceLinkSchema),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;
    const existing = await ctx.db
      .query("resourceLinks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(RESOURCE_LINK_LIMIT);
    const nextResources = args.resources.slice(0, RESOURCE_LINK_LIMIT);

    await Promise.all(existing.map((resource) => ctx.db.delete(resource._id)));
    await Promise.all(nextResources.map((resource) => ctx.db.insert("resourceLinks", { ...resource, userId })));
  },
});
