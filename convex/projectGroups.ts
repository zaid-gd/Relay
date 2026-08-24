import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const projectGroupValidator = v.object({
  id: v.string(),
  teamId: v.optional(v.string()),
  clientId: v.string(),
  name: v.string(),
  notes: v.string(),
  archived: v.boolean(),
  createdAt: v.string(),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const personal = await ctx.db
      .query("projectGroups")
      .withIndex("by_userId_and_teamId", (q) => q.eq("userId", identity.tokenIdentifier).eq("teamId", undefined))
      .take(500);
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId_and_status", (q) => q.eq("userId", identity.tokenIdentifier).eq("status", "active"))
      .first();
    const team = membership?.permissions.viewProjects
      ? await ctx.db.query("projectGroups").withIndex("by_teamId", (q) => q.eq("teamId", membership.teamId)).take(500)
      : [];
    return [...personal, ...team].map(({ userId: _userId, _id: _id, _creationTime: _creationTime, ...group }) => group);
  },
});

export const replaceAll = mutation({
  args: { groups: v.array(projectGroupValidator) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId_and_status", (q) => q.eq("userId", userId).eq("status", "active"))
      .first();
    const canManageTeamGroups = Boolean(membership?.permissions.editProjects);
    const personal = await ctx.db
      .query("projectGroups")
      .withIndex("by_userId_and_teamId", (q) => q.eq("userId", userId).eq("teamId", undefined))
      .take(500);
    const team = membership
      ? await ctx.db.query("projectGroups").withIndex("by_teamId", (q) => q.eq("teamId", membership.teamId)).take(500)
      : [];
    const existing = new Map<string, Doc<"projectGroups">>([...personal, ...team].map((group) => [group.id, group]));
    const incomingIds = new Set(args.groups.map((group) => group.id));

    for (const group of args.groups) {
      if (group.teamId && (group.teamId !== membership?.teamId || !canManageTeamGroups)) {
        throw new Error("You do not have permission to manage this Team Project Group");
      }
      const stored = existing.get(group.id);
      if (stored) {
        await ctx.db.patch(stored._id, group);
      } else {
        await ctx.db.insert("projectGroups", { ...group, userId });
      }
    }
    for (const group of existing.values()) {
      if (incomingIds.has(group.id)) continue;
      if (group.teamId && !canManageTeamGroups) throw new Error("You do not have permission to remove this Team Project Group");
      await ctx.db.delete(group._id);
    }
    return null;
  },
});
