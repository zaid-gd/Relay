import { Migrations } from "@convex-dev/migrations";
import type { MigrationFunctionReference } from "@convex-dev/migrations";
import { makeFunctionReference } from "convex/server";
import { components } from "./_generated/api.js";
import { internalMutation } from "./_generated/server.js";

export const migrations = new Migrations(components.migrations, {
  internalMutation,
});

// Clerk tokenIdentifier includes the Clerk issuer. Production moved from the
// relay-dev site to relay-app, so existing rows need their issuer rewritten.
export const LEGACY_TOKEN_PREFIX = "https://relay-dev.cc.cd|";
export const CURRENT_TOKEN_PREFIX = "https://relay-app.cc.cd|";

export function rewriteLegacyIdentity(value: string): string {
  return value.startsWith(LEGACY_TOKEN_PREFIX)
    ? CURRENT_TOKEN_PREFIX + value.slice(LEGACY_TOKEN_PREFIX.length)
    : value;
}

function rewriteIdentityList(values: string[]): string[] | undefined {
  const rewritten = values.map(rewriteLegacyIdentity);
  return rewritten.some((value, index) => value !== values[index])
    ? rewritten
    : undefined;
}

export const migrateProjectsIdentity = migrations.define({
  table: "projects",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    const assigneeUserIds = rewriteIdentityList(doc.assigneeUserIds);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
    if (assigneeUserIds) {
      await ctx.db.patch(doc._id, { assigneeUserIds });
    }
  },
});

export const migrateProjectSalaryBatchesIdentity = migrations.define({
  table: "projectSalaryBatches",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateSalaryPlansIdentity = migrations.define({
  table: "salaryPlans",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateProjectOutputsIdentity = migrations.define({
  table: "projectOutputs",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateProjectMediaVersionsIdentity = migrations.define({
  table: "projectMediaVersions",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    const createdByUserId = rewriteLegacyIdentity(doc.createdByUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
    if (createdByUserId !== doc.createdByUserId) {
      await ctx.db.patch(doc._id, { createdByUserId });
    }
  },
});

export const migrateProjectPortalsIdentity = migrations.define({
  table: "projectPortals",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateMediaVersionCommentsIdentity = migrations.define({
  table: "mediaVersionComments",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateWorkItemsIdentity = migrations.define({
  table: "workItems",
  migrateOne: async (ctx, doc) => {
    const userId = rewriteLegacyIdentity(doc.userId);
    const ownerUserId = doc.ownerUserId
      ? rewriteLegacyIdentity(doc.ownerUserId)
      : undefined;
    const assigneeUserIds = doc.assigneeUserIds
      ? rewriteIdentityList(doc.assigneeUserIds)
      : undefined;
    if (userId !== doc.userId) {
      await ctx.db.patch(doc._id, { userId });
    }
    if (ownerUserId !== undefined && ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
    if (assigneeUserIds) {
      await ctx.db.patch(doc._id, { assigneeUserIds });
    }
  },
});

export const migrateProjectGroupsIdentity = migrations.define({
  table: "projectGroups",
  migrateOne: async (ctx, doc) => {
    const userId = rewriteLegacyIdentity(doc.userId);
    if (userId !== doc.userId) {
      await ctx.db.patch(doc._id, { userId });
    }
  },
});

export const migrateClientPortalsIdentity = migrations.define({
  table: "clientPortals",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateProjectActivityIdentity = migrations.define({
  table: "projectActivity",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    const actorUserId = rewriteLegacyIdentity(doc.actorUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
    if (actorUserId !== doc.actorUserId) {
      await ctx.db.patch(doc._id, { actorUserId });
    }
  },
});

export const migrateProjectFilesIdentity = migrations.define({
  table: "projectFiles",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    const createdByUserId = rewriteLegacyIdentity(doc.createdByUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
    if (createdByUserId !== doc.createdByUserId) {
      await ctx.db.patch(doc._id, { createdByUserId });
    }
  },
});

export const migrateProjectFileVersionsIdentity = migrations.define({
  table: "projectFileVersions",
  migrateOne: async (ctx, doc) => {
    const uploadedByUserId = rewriteLegacyIdentity(doc.uploadedByUserId);
    if (uploadedByUserId !== doc.uploadedByUserId) {
      await ctx.db.patch(doc._id, { uploadedByUserId });
    }
  },
});

export const migrateR2UploadSessionsIdentity = migrations.define({
  table: "r2UploadSessions",
  migrateOne: async (ctx, doc) => {
    const uploaderUserId = rewriteLegacyIdentity(doc.uploaderUserId);
    if (uploaderUserId !== doc.uploaderUserId) {
      await ctx.db.patch(doc._id, { uploaderUserId });
    }
  },
});

export const migrateWorkspaceStorageReservationsIdentity = migrations.define({
  table: "workspaceStorageReservations",
  migrateOne: async (ctx, doc) => {
    const uploaderUserId = rewriteLegacyIdentity(doc.uploaderUserId);
    if (uploaderUserId !== doc.uploaderUserId) {
      await ctx.db.patch(doc._id, { uploaderUserId });
    }
  },
});

export const migrateTeamWorkspacesIdentity = migrations.define({
  table: "teamWorkspaces",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateTeamMembersIdentity = migrations.define({
  table: "teamMembers",
  migrateOne: async (ctx, doc) => {
    const userId = rewriteLegacyIdentity(doc.userId);
    if (userId !== doc.userId) {
      await ctx.db.patch(doc._id, { userId });
    }
  },
});

export const migrateTeamActivityIdentity = migrations.define({
  table: "teamActivity",
  migrateOne: async (ctx, doc) => {
    const actorUserId = rewriteLegacyIdentity(doc.actorUserId);
    if (actorUserId !== doc.actorUserId) {
      await ctx.db.patch(doc._id, { actorUserId });
    }
  },
});

export const migrateTeamChatMessagesIdentity = migrations.define({
  table: "teamChatMessages",
  migrateOne: async (ctx, doc) => {
    const authorUserId = rewriteLegacyIdentity(doc.authorUserId);
    const mentions = rewriteIdentityList(doc.mentions);
    if (authorUserId !== doc.authorUserId) {
      await ctx.db.patch(doc._id, { authorUserId });
    }
    if (mentions) {
      await ctx.db.patch(doc._id, { mentions });
    }
  },
});

export const migrateProjectCommentsIdentity = migrations.define({
  table: "projectComments",
  migrateOne: async (ctx, doc) => {
    const authorUserId = rewriteLegacyIdentity(doc.authorUserId);
    const mentions = rewriteIdentityList(doc.mentions);
    if (authorUserId !== doc.authorUserId) {
      await ctx.db.patch(doc._id, { authorUserId });
    }
    if (mentions) {
      await ctx.db.patch(doc._id, { mentions });
    }
  },
});

export const migrateTeamNotificationsIdentity = migrations.define({
  table: "teamNotifications",
  migrateOne: async (ctx, doc) => {
    const userId = rewriteLegacyIdentity(doc.userId);
    if (userId !== doc.userId) {
      await ctx.db.patch(doc._id, { userId });
    }
  },
});

export const migratePublicProfilesIdentity = migrations.define({
  table: "publicProfiles",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateSettingsIdentity = migrations.define({
  table: "settings",
  migrateOne: async (ctx, doc) => {
    const userId = rewriteLegacyIdentity(doc.userId);
    if (userId !== doc.userId) {
      await ctx.db.patch(doc._id, { userId });
    }
  },
});

export const migrateSalaryBatchesIdentity = migrations.define({
  table: "salaryBatches",
  migrateOne: async (ctx, doc) => {
    const userId = rewriteLegacyIdentity(doc.userId);
    if (userId !== doc.userId) {
      await ctx.db.patch(doc._id, { userId });
    }
  },
});

export const migrateResourceLinksIdentity = migrations.define({
  table: "resourceLinks",
  migrateOne: async (ctx, doc) => {
    const userId = rewriteLegacyIdentity(doc.userId);
    if (userId !== doc.userId) {
      await ctx.db.patch(doc._id, { userId });
    }
  },
});

function migrationRef(name: string): MigrationFunctionReference {
  return makeFunctionReference<"mutation">(
    name
  ) as unknown as MigrationFunctionReference;
}

// Run every identity migration in order. The component resumes each table if a
// batch fails or the deployment restarts.
export const runIdentityMigration = migrations.runner([
  migrationRef("migrations:migrateProjectsIdentity"),
  migrationRef("migrations:migrateProjectSalaryBatchesIdentity"),
  migrationRef("migrations:migrateSalaryPlansIdentity"),
  migrationRef("migrations:migrateProjectOutputsIdentity"),
  migrationRef("migrations:migrateProjectMediaVersionsIdentity"),
  migrationRef("migrations:migrateProjectPortalsIdentity"),
  migrationRef("migrations:migrateMediaVersionCommentsIdentity"),
  migrationRef("migrations:migrateWorkItemsIdentity"),
  migrationRef("migrations:migrateProjectGroupsIdentity"),
  migrationRef("migrations:migrateClientPortalsIdentity"),
  migrationRef("migrations:migrateProjectActivityIdentity"),
  migrationRef("migrations:migrateProjectFilesIdentity"),
  migrationRef("migrations:migrateProjectFileVersionsIdentity"),
  migrationRef("migrations:migrateR2UploadSessionsIdentity"),
  migrationRef("migrations:migrateWorkspaceStorageReservationsIdentity"),
  migrationRef("migrations:migrateTeamWorkspacesIdentity"),
  migrationRef("migrations:migrateTeamMembersIdentity"),
  migrationRef("migrations:migrateTeamActivityIdentity"),
  migrationRef("migrations:migrateTeamChatMessagesIdentity"),
  migrationRef("migrations:migrateProjectCommentsIdentity"),
  migrationRef("migrations:migrateTeamNotificationsIdentity"),
  migrationRef("migrations:migratePublicProfilesIdentity"),
  migrationRef("migrations:migrateSettingsIdentity"),
  migrationRef("migrations:migrateSalaryBatchesIdentity"),
  migrationRef("migrations:migrateResourceLinksIdentity"),
]);
