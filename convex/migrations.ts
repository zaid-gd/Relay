import { Migrations } from "@convex-dev/migrations";
import type { MigrationFunctionReference } from "@convex-dev/migrations";
import { makeFunctionReference } from "convex/server";
import { components } from "./_generated/api.js";
import { internalMutation } from "./_generated/server.js";

export const migrations = new Migrations(components.migrations, {
  internalMutation,
});

// Clerk tokenIdentifier includes the Clerk issuer. Existing rows were written
// with subject alone, and some older rows may contain the previous issuer.
export const LEGACY_DEV_TOKEN_PREFIX = "https://relay-dev.cc.cd|";
export const LEGACY_APP_TOKEN_PREFIX = "https://relay-app.cc.cd|";
export const CLERK_SUBJECT_PREFIX = "user_";
export const CANONICAL_TOKEN_PREFIX = "https://clerk.relay-app.cc.cd|";

export function rewriteLegacyIdentity(value: string): string {
  if (value.startsWith(CANONICAL_TOKEN_PREFIX)) {
    return value;
  }
  if (value.startsWith(LEGACY_DEV_TOKEN_PREFIX)) {
    return CANONICAL_TOKEN_PREFIX + value.slice(LEGACY_DEV_TOKEN_PREFIX.length);
  }
  if (value.startsWith(LEGACY_APP_TOKEN_PREFIX)) {
    return CANONICAL_TOKEN_PREFIX + value.slice(LEGACY_APP_TOKEN_PREFIX.length);
  }
  return value.startsWith(CLERK_SUBJECT_PREFIX)
    ? CANONICAL_TOKEN_PREFIX + value
    : value;
}

function rewriteIdentityList(values: string[]): string[] | undefined {
  const rewritten = values.map(rewriteLegacyIdentity);
  return rewritten.some((value, index) => value !== values[index])
    ? rewritten
    : undefined;
}

export const migrateProjectsIdentityV2 = migrations.define({
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

export const migrateProjectSalaryBatchesIdentityV2 = migrations.define({
  table: "projectSalaryBatches",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateSalaryPlansIdentityV2 = migrations.define({
  table: "salaryPlans",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateProjectOutputsIdentityV2 = migrations.define({
  table: "projectOutputs",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateProjectMediaVersionsIdentityV2 = migrations.define({
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

export const migrateProjectPortalsIdentityV2 = migrations.define({
  table: "projectPortals",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateMediaVersionCommentsIdentityV2 = migrations.define({
  table: "mediaVersionComments",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateWorkItemsIdentityV2 = migrations.define({
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

export const migrateProjectGroupsIdentityV2 = migrations.define({
  table: "projectGroups",
  migrateOne: async (ctx, doc) => {
    const userId = rewriteLegacyIdentity(doc.userId);
    if (userId !== doc.userId) {
      await ctx.db.patch(doc._id, { userId });
    }
  },
});

export const migrateClientPortalsIdentityV2 = migrations.define({
  table: "clientPortals",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateProjectActivityIdentityV2 = migrations.define({
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

export const migrateProjectFilesIdentityV2 = migrations.define({
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

export const migrateProjectFileVersionsIdentityV2 = migrations.define({
  table: "projectFileVersions",
  migrateOne: async (ctx, doc) => {
    const uploadedByUserId = rewriteLegacyIdentity(doc.uploadedByUserId);
    if (uploadedByUserId !== doc.uploadedByUserId) {
      await ctx.db.patch(doc._id, { uploadedByUserId });
    }
  },
});

export const migrateR2UploadSessionsIdentityV2 = migrations.define({
  table: "r2UploadSessions",
  migrateOne: async (ctx, doc) => {
    const uploaderUserId = rewriteLegacyIdentity(doc.uploaderUserId);
    if (uploaderUserId !== doc.uploaderUserId) {
      await ctx.db.patch(doc._id, { uploaderUserId });
    }
  },
});

export const migrateWorkspaceStorageReservationsIdentityV2 = migrations.define({
  table: "workspaceStorageReservations",
  migrateOne: async (ctx, doc) => {
    const uploaderUserId = rewriteLegacyIdentity(doc.uploaderUserId);
    if (uploaderUserId !== doc.uploaderUserId) {
      await ctx.db.patch(doc._id, { uploaderUserId });
    }
  },
});

export const migrateTeamWorkspacesIdentityV2 = migrations.define({
  table: "teamWorkspaces",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateTeamMembersIdentityV2 = migrations.define({
  table: "teamMembers",
  migrateOne: async (ctx, doc) => {
    const userId = rewriteLegacyIdentity(doc.userId);
    if (userId !== doc.userId) {
      await ctx.db.patch(doc._id, { userId });
    }
  },
});

export const migrateTeamActivityIdentityV2 = migrations.define({
  table: "teamActivity",
  migrateOne: async (ctx, doc) => {
    const actorUserId = rewriteLegacyIdentity(doc.actorUserId);
    if (actorUserId !== doc.actorUserId) {
      await ctx.db.patch(doc._id, { actorUserId });
    }
  },
});

export const migrateTeamChatMessagesIdentityV2 = migrations.define({
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

export const migrateProjectCommentsIdentityV2 = migrations.define({
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

export const migrateTeamNotificationsIdentityV2 = migrations.define({
  table: "teamNotifications",
  migrateOne: async (ctx, doc) => {
    const userId = rewriteLegacyIdentity(doc.userId);
    if (userId !== doc.userId) {
      await ctx.db.patch(doc._id, { userId });
    }
  },
});

export const migratePublicProfilesIdentityV2 = migrations.define({
  table: "publicProfiles",
  migrateOne: async (ctx, doc) => {
    const ownerUserId = rewriteLegacyIdentity(doc.ownerUserId);
    if (ownerUserId !== doc.ownerUserId) {
      await ctx.db.patch(doc._id, { ownerUserId });
    }
  },
});

export const migrateSettingsIdentityV2 = migrations.define({
  table: "settings",
  migrateOne: async (ctx, doc) => {
    const userId = rewriteLegacyIdentity(doc.userId);
    const canonicalRows = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);

    // Keep a single canonical settings row. Prefer the row with client data so
    // an empty row created after the identity change cannot erase the directory.
    if (userId === doc.userId) {
      if (canonicalRows[0]?._id !== doc._id) {
        await ctx.db.delete(doc._id);
      }
      return;
    }
    if (canonicalRows.length > 0) {
      const canonical = canonicalRows[0];
      const legacyClientCount =
        (doc.clients?.length ?? 0) + (doc.customClients?.length ?? 0);
      const canonicalClientCount =
        (canonical.clients?.length ?? 0) +
        (canonical.customClients?.length ?? 0);
      if (legacyClientCount > canonicalClientCount) {
        await ctx.db.patch(canonical._id, {
          clients: doc.clients,
          customClients: doc.customClients,
        });
      }
      await ctx.db.delete(doc._id);
      return;
    }
    await ctx.db.patch(doc._id, { userId });
  },
});

export const migrateSalaryBatchesIdentityV2 = migrations.define({
  table: "salaryBatches",
  migrateOne: async (ctx, doc) => {
    const userId = rewriteLegacyIdentity(doc.userId);
    if (userId !== doc.userId) {
      await ctx.db.patch(doc._id, { userId });
    }
  },
});

export const migrateResourceLinksIdentityV2 = migrations.define({
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
export const runCanonicalIdentityMigration = migrations.runner([
  migrationRef("migrations:migrateProjectsIdentityV2"),
  migrationRef("migrations:migrateProjectSalaryBatchesIdentityV2"),
  migrationRef("migrations:migrateSalaryPlansIdentityV2"),
  migrationRef("migrations:migrateProjectOutputsIdentityV2"),
  migrationRef("migrations:migrateProjectMediaVersionsIdentityV2"),
  migrationRef("migrations:migrateProjectPortalsIdentityV2"),
  migrationRef("migrations:migrateMediaVersionCommentsIdentityV2"),
  migrationRef("migrations:migrateWorkItemsIdentityV2"),
  migrationRef("migrations:migrateProjectGroupsIdentityV2"),
  migrationRef("migrations:migrateClientPortalsIdentityV2"),
  migrationRef("migrations:migrateProjectActivityIdentityV2"),
  migrationRef("migrations:migrateProjectFilesIdentityV2"),
  migrationRef("migrations:migrateProjectFileVersionsIdentityV2"),
  migrationRef("migrations:migrateR2UploadSessionsIdentityV2"),
  migrationRef("migrations:migrateWorkspaceStorageReservationsIdentityV2"),
  migrationRef("migrations:migrateTeamWorkspacesIdentityV2"),
  migrationRef("migrations:migrateTeamMembersIdentityV2"),
  migrationRef("migrations:migrateTeamActivityIdentityV2"),
  migrationRef("migrations:migrateTeamChatMessagesIdentityV2"),
  migrationRef("migrations:migrateProjectCommentsIdentityV2"),
  migrationRef("migrations:migrateTeamNotificationsIdentityV2"),
  migrationRef("migrations:migratePublicProfilesIdentityV2"),
  migrationRef("migrations:migrateSettingsIdentityV2"),
  migrationRef("migrations:migrateSalaryBatchesIdentityV2"),
  migrationRef("migrations:migrateResourceLinksIdentityV2"),
]);
