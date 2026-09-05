import { getWorkspaceClient } from "./workspaceClients";
import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  requireWorkspaceCapability,
  resolveWorkspaceEntitlements,
} from "./workspaceSubscriptions";

async function requireOwner(ctx: MutationCtx | QueryCtx) {
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

export const getOwnerSettings = query({
  args: { projectId: v.optional(v.string()) },
  returns: v.object({
    available: v.boolean(),
    published: v.boolean(),
    brandName: v.string(),
    accentColor: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const membership = identity
      ? await ctx.db
          .query("teamMembers")
          .withIndex("by_userId_and_status", (q) =>
            q.eq("userId", identity.tokenIdentifier).eq("status", "active")
          )
          .unique()
      : null;
    const workspaceId = membership
      ? ctx.db.normalizeId("teamWorkspaces", membership.teamId)
      : null;
    if (!workspaceId || membership?.role !== "Owner")
      return {
        available: false,
        published: false,
        brandName: "Relay",
        accentColor: "#f59e0b",
      };
    const access = await resolveWorkspaceEntitlements(ctx, workspaceId);
    if (!access.capabilities.clientHub)
      return {
        available: false,
        published: false,
        brandName: "Relay",
        accentColor: "#f59e0b",
      };
    const workspace = await ctx.db.get(workspaceId);
    const publication = args.projectId
      ? await ctx.db
          .query("clientHubProjects")
          .withIndex("by_workspaceId_and_projectId", (q) =>
            q.eq("workspaceId", workspaceId).eq("projectId", args.projectId!)
          )
          .unique()
      : null;
    return {
      available: true,
      published: Boolean(publication),
      brandName: workspace?.portalBrandName ?? "Relay",
      accentColor: workspace?.portalAccentColor ?? "#f59e0b",
    };
  },
});

export const setBranding = mutation({
  args: { brandName: v.string(), accentColor: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspaceId } = await requireOwner(ctx);
    await requireWorkspaceCapability(ctx, workspaceId, "customPortalBranding");
    const brandName = args.brandName.trim().slice(0, 80);
    const accentColor = args.accentColor.trim().toLowerCase();
    if (!brandName) throw new Error("Brand name is required");
    if (!/^#[0-9a-f]{6}$/.test(accentColor))
      throw new Error("Use a six-digit hex color");
    await ctx.db.patch(workspaceId, {
      portalBrandName: brandName,
      portalAccentColor: accentColor,
    });
    return null;
  },
});

export const addContact = mutation({
  args: { clientId: v.string(), email: v.string(), name: v.string() },
  returns: v.id("clientContacts"),
  handler: async (ctx, args) => {
    const { identity, workspaceId } = await requireOwner(ctx);
    const workspace = await ctx.db.get(workspaceId);
    if (!workspace) throw new Error("Workspace not found");
    if (!(await getWorkspaceClient(ctx, workspace.ownerUserId, args.clientId)))
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
      const access = await resolveWorkspaceEntitlements(
        ctx,
        contact.workspaceId
      );
      if (!access.capabilities.clientHub) continue;
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
