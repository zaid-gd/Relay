import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireWorkspaceCapability } from "./workspaceSubscriptions";

async function requireOwner(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_userId_and_status", (q) =>
      q.eq("userId", identity.tokenIdentifier).eq("status", "active")
    )
    .unique();
  if (!membership || membership.role !== "Owner")
    throw new Error("Workspace Owner required");
  const workspaceId = ctx.db.normalizeId("teamWorkspaces", membership.teamId);
  if (!workspaceId) throw new Error("Workspace not found");
  await requireWorkspaceCapability(ctx, workspaceId, "clientHub");
  return { identity, workspaceId };
}

export const addContact = mutation({
  args: { clientId: v.string(), email: v.string(), name: v.string() },
  returns: v.id("clientContacts"),
  handler: async (ctx, args) => {
    const { identity, workspaceId } = await requireOwner(ctx);
    const workspace = await ctx.db.get(workspaceId);
    if (!workspace) throw new Error("Workspace not found");
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", workspace.ownerUserId))
      .unique();
    if (!settings?.clients?.some((client) => client.id === args.clientId))
      throw new Error("Client not found");
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("Enter a valid email address");
    const existing = await ctx.db
      .query("clientContacts")
      .withIndex("by_workspaceId_and_clientId", (q) =>
        q.eq("workspaceId", workspaceId).eq("clientId", args.clientId)
      )
      .take(100);
    if (existing.some((contact) => contact.email === email))
      throw new Error("This contact already has access");
    return await ctx.db.insert("clientContacts", {
      workspaceId,
      clientId: args.clientId,
      email,
      name: args.name.trim().slice(0, 120) || identity.name || email,
      active: true,
      createdAt: new Date().toISOString(),
    });
  },
});

export const setProjectPublished = mutation({
  args: { projectId: v.string(), published: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspaceId } = await requireOwner(ctx);
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("id", args.projectId))
      .unique();
    if (!project || project.teamId !== workspaceId)
      throw new Error("Project not found");
    const existing = await ctx.db
      .query("clientHubProjects")
      .withIndex("by_workspaceId_and_projectId", (q) =>
        q.eq("workspaceId", workspaceId).eq("projectId", project.id)
      )
      .unique();
    if (args.published && !existing) {
      await ctx.db.insert("clientHubProjects", {
        workspaceId,
        clientId: project.clientId,
        projectId: project.id,
        publishedAt: new Date().toISOString(),
      });
    } else if (!args.published && existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

const projectValidator = v.object({
  id: v.string(),
  title: v.string(),
  status: v.string(),
  dueDate: v.string(),
  progress: v.number(),
});

export const getMine = query({
  args: {},
  returns: v.object({
    contactName: v.string(),
    projects: v.array(projectValidator),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const email = identity?.email?.trim().toLowerCase();
    if (!identity || !email) throw new Error("Not authenticated");
    const contacts = await ctx.db
      .query("clientContacts")
      .withIndex("by_email_and_active", (q) =>
        q.eq("email", email).eq("active", true)
      )
      .take(20);
    const projects = [];
    for (const contact of contacts) {
      const publications = await ctx.db
        .query("clientHubProjects")
        .withIndex("by_workspaceId_and_clientId", (q) =>
          q
            .eq("workspaceId", contact.workspaceId)
            .eq("clientId", contact.clientId)
        )
        .take(100);
      for (const publication of publications) {
        const project = await ctx.db
          .query("projects")
          .withIndex("by_projectId", (q) => q.eq("id", publication.projectId))
          .unique();
        if (
          !project ||
          project.archived ||
          project.clientId !== contact.clientId
        )
          continue;
        const stageIndex = project.workflowStages.findIndex(
          (stage) => stage.id === project.workflowStageId
        );
        projects.push({
          id: project.id,
          title: project.title,
          status: project.status,
          dueDate: project.dueDate,
          progress:
            stageIndex < 0
              ? 0
              : Math.round(
                  ((stageIndex + 1) / project.workflowStages.length) * 100
                ),
        });
      }
    }
    return {
      contactName: contacts[0]?.name ?? identity.name ?? "Client",
      projects,
    };
  },
});
