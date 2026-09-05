import { getWorkspaceClient } from "./workspaceClients";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
      .withIndex("by_userId_and_teamId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("teamId", undefined)
      )
      .take(500);
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("status", "active")
      )
      .first();
    const team = membership?.permissions.viewProjects
      ? await ctx.db
          .query("projectGroups")
          .withIndex("by_teamId", (q) => q.eq("teamId", membership.teamId))
          .take(500)
      : [];
    return [...personal, ...team].map(
      ({ userId: _userId, _id: _id, _creationTime: _creationTime, ...group }) =>
        group
    );
  },
});

export const upsert = mutation({
  args: { group: projectGroupValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", userId).eq("status", "active")
      )
      .first();
    const group = args.group;
    if (
      group.teamId &&
      (group.teamId !== membership?.teamId ||
        !membership.permissions.editProjects)
    ) {
      throw new Error(
        "You do not have permission to manage this Team Project Group"
      );
    }

    const client = await getWorkspaceClient(ctx, userId, group.clientId);
    if (!client || client.archived) {
      throw new Error("Project Group Client must belong to this Workspace");
    }

    const stored = group.teamId
      ? await ctx.db
          .query("projectGroups")
          .withIndex("by_teamId_and_id", (q) =>
            q.eq("teamId", group.teamId).eq("id", group.id)
          )
          .unique()
      : await ctx.db
          .query("projectGroups")
          .withIndex("by_userId_and_id", (q) =>
            q.eq("userId", userId).eq("id", group.id)
          )
          .unique();
    if (stored) await ctx.db.patch(stored._id, group);
    else await ctx.db.insert("projectGroups", { ...group, userId });
    return null;
  },
});
