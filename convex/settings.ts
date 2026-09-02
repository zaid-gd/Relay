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

const clientValidator = v.object({
  id: v.string(),
  name: v.string(),
  company: v.string(),
  contactName: v.string(),
  email: v.string(),
  phone: v.string(),
  notes: v.string(),
  archived: v.boolean(),
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

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .take(1);
    return settings[0] ?? null;
  },
});

export const upsert = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;
    const normalizedArgs = {
      ...args,
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
  },
});
