import {
  clientValidator,
  readWorkspaceClients,
  saveWorkspaceClient,
} from "./workspaceClients";
import schema from "./schema";
import { normalizeClientRecords } from "../src/lib/clients";
import { type Infer, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  fileCategoryValidator,
  fileStatusValidator,
  settingsTeamRoleValidator,
  storedTeamRoleValidator,
  workflowStageValidator,
} from "./domainValidators";
import { requireCurrentWorkspaceCapability } from "./workspaceSubscriptions";

const teamMemberSchema = v.object({
  id: v.string(),
  name: v.string(),
  role: storedTeamRoleValidator,
  email: v.string(),
});

const customProjectTemplateValidator = v.object({
  id: v.string(),
  name: v.string(),
  description: v.string(),
  projectType: v.string(),
  workType: v.union(v.literal("channel"), v.literal("freelance")),
  durationDays: v.number(),
  workflowStages: v.array(v.union(v.string(), workflowStageValidator)),
  deliverables: v.array(
    v.object({
      title: v.string(),
      category: fileCategoryValidator,
      initialStatus: fileStatusValidator,
    })
  ),
  checklistItems: v.array(v.string()),
  custom: v.optional(v.boolean()),
  archived: v.optional(v.boolean()),
  updatedAt: v.optional(v.string()),
});

type CustomProjectTemplate = Infer<typeof customProjectTemplateValidator>;

function normalizeCustomProjectTemplate(
  template: CustomProjectTemplate
): CustomProjectTemplate {
  const workflowStages: CustomProjectTemplate["workflowStages"] = [];
  for (const stage of template.workflowStages) {
    if (typeof stage === "string") {
      if (stage.trim()) workflowStages.push(stage.trim());
      continue;
    }
    const id = stage.id.trim().slice(0, 80);
    const label = stage.label.trim().slice(0, 80);
    if (id && label) workflowStages.push({ ...stage, id, label });
  }
  return {
    id: template.id.trim().slice(0, 80),
    name: template.name.trim().slice(0, 120),
    description: template.description.trim().slice(0, 500),
    projectType: template.projectType.trim().slice(0, 80),
    workType: template.workType,
    durationDays: Math.max(1, Math.min(365, template.durationDays)),
    workflowStages: workflowStages.slice(0, 12),
    deliverables: template.deliverables
      .map((deliverable) => ({
        ...deliverable,
        title: deliverable.title.trim().slice(0, 120),
      }))
      .filter((deliverable) => deliverable.title)
      .slice(0, 12),
    checklistItems: template.checklistItems
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20),
    custom: template.custom ?? true,
    archived: template.archived ?? false,
    updatedAt:
      typeof template.updatedAt === "string"
        ? template.updatedAt
        : new Date().toISOString(),
  };
}
const integrationLinkValidator = v.record(
  v.string(),
  v.object({
    url: v.string(),
    label: v.string(),
    notes: v.string(),
    updatedAt: v.string(),
  })
);

function identityKeys(identity: {
  tokenIdentifier: string;
  subject: string;
}): string[] {
  const keys = [
    identity.tokenIdentifier,
    identity.subject,
    `https://relay-dev.cc.cd|${identity.subject}`,
    `https://relay-app.cc.cd|${identity.subject}`,
    `https://clerk.relay-app.cc.cd|${identity.subject}`,
  ];
  return [...new Set(keys)];
}

export const get = query({
  args: {},
  returns: v.union(v.null(), schema.doc("settings")),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const rows = (
      await Promise.all(
        identityKeys(identity).map((userId) =>
          ctx.db
            .query("settings")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .order("desc")
            .take(10)
        )
      )
    ).flat();

    const selected =
      rows.sort((a, b) => {
        const aCanonical = a.userId === identity.tokenIdentifier ? 1 : 0;
        const bCanonical = b.userId === identity.tokenIdentifier ? 1 : 0;
        return bCanonical - aCanonical || b._creationTime - a._creationTime;
      })[0] ?? null;
    if (!selected) return null;
    const clients = await readWorkspaceClients(
      ctx,
      identity.tokenIdentifier,
      normalizeClientRecords(selected.clients, selected.customClients)
    );
    return {
      ...selected,
      clients,
      customClients: clients
        .filter((client) => !client.archived)
        .map((client) => client.name),
    };
  },
});

const settingsInputValidator = v.object({
  studioName: v.string(),
  profileName: v.string(),
  profileUsername: v.string(),
  profileTitle: v.string(),
  profileBio: v.string(),
  profileLocation: v.string(),
  profileImageUrl: v.string(),
  publicActiveProjects: v.optional(v.number()),
  publicDeliveredEdits: v.optional(v.number()),
  publicTurnaroundDays: v.optional(v.number()),
  timeZone: v.string(),
  dateFormat: v.string(),
  weekStart: v.string(),
  currencyCode: v.string(),
  customClients: v.optional(v.array(v.string())),
  clients: v.optional(v.array(clientValidator)),
  customProjectTemplates: v.optional(v.array(customProjectTemplateValidator)),
  projectTags: v.array(v.string()),
  salaryWorkType: v.string(),
  salaryBatchSize: v.number(),
  salaryBatchAmount: v.number(),
  projectStages: v.array(v.string()),
  notifications: v.record(v.string(), v.boolean()),
  integrationLinks: v.optional(integrationLinkValidator),
  teamRole: settingsTeamRoleValidator,
  teamMembers: v.array(teamMemberSchema),
  rolePermissions: v.record(v.string(), v.record(v.string(), v.boolean())),
  integrationConfigs: v.record(
    v.string(),
    v.object({
      connected: v.boolean(),
      account: v.string(),
      folder: v.string(),
      channel: v.string(),
      workspace: v.string(),
      webhookUrl: v.string(),
      connectedAt: v.string(),
      lastSyncAt: v.string(),
    })
  ),
  theme: v.string(),
  accentColor: v.string(),
  density: v.string(),
});

export const upsert = mutation({
  args: settingsInputValidator.fields,
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;
    const { clients, customClients, ...preferences } = args;
    for (const client of clients ??
      normalizeClientRecords(undefined, customClients)) {
      await saveWorkspaceClient(ctx, userId, client);
    }
    const normalizedArgs = {
      ...preferences,
      // Client records now live separately; do not recreate old names on later reads.
      ...(clients !== undefined || customClients !== undefined
        ? { clients: undefined, customClients: undefined }
        : {}),
      customProjectTemplates: args.customProjectTemplates?.map(
        normalizeCustomProjectTemplate
      ),
    };
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(10);
    const [primary, ...duplicates] = existing;
    const templatesChanged =
      args.customProjectTemplates !== undefined &&
      JSON.stringify(primary?.customProjectTemplates ?? []) !==
        JSON.stringify(normalizedArgs.customProjectTemplates ?? []);
    if (templatesChanged) {
      await requireCurrentWorkspaceCapability(
        ctx,
        identity.tokenIdentifier,
        "customWorkflowTemplates"
      );
    }
    if (primary) {
      await ctx.db.patch(primary._id, normalizedArgs);
      await Promise.all(duplicates.map((row) => ctx.db.delete(row._id)));
    } else {
      await ctx.db.insert("settings", { ...normalizedArgs, userId });
    }
    return null;
  },
});

export const patch = mutation({
  args: {
    changes: settingsInputValidator.omit("clients", "customClients").partial(),
    clients: v.optional(v.array(clientValidator)),
  },
  returns: v.null(),
  handler: async (ctx, { changes, clients }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    let stored = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (!stored) {
      for (const userId of identityKeys(identity)) {
        const legacy = await ctx.db
          .query("settings")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .first();
        if (!legacy) continue;
        const { _id, _creationTime, ...preferences } = legacy;
        const id = await ctx.db.insert("settings", {
          ...preferences,
          userId: identity.tokenIdentifier,
        });
        stored = await ctx.db.get(id);
        break;
      }
    }
    if (!stored) throw new Error("Settings must be initialized before editing");
    if (
      changes.customProjectTemplates !== undefined &&
      JSON.stringify(changes.customProjectTemplates) !==
        JSON.stringify(stored.customProjectTemplates ?? [])
    ) {
      await requireCurrentWorkspaceCapability(
        ctx,
        identity.tokenIdentifier,
        "customWorkflowTemplates"
      );
      changes.customProjectTemplates = changes.customProjectTemplates.map(
        normalizeCustomProjectTemplate
      );
    }
    for (const client of clients ?? [])
      await saveWorkspaceClient(ctx, identity.tokenIdentifier, client);
    // An edit to one preference never submits unrelated fields from a stale tab.
    if (Object.keys(changes).length) await ctx.db.patch(stored._id, changes);
    return null;
  },
});
