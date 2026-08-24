import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  clientPortalStageValidator,
  fileCategoryValidator,
  fileProviderValidator,
  fileStatusValidator,
  memberStatusValidator,
  mediaSourceValidator,
  notificationKindValidator,
  portalEventKindValidator,
  projectActivityKindValidator,
  projectOutputReviewStateValidator,
  projectPortalStatusValidator,
  revisionStatusValidator,
  settingsTeamRoleValidator,
  storedDeliverableStatusValidator,
  storedFileStatusValidator,
  storedProjectStatusValidator,
  storedTeamRoleValidator,
  teamActivityKindValidator,
  workflowStageValidator,
} from "./domainValidators";

export default defineSchema({
  projects: defineTable({
    ownerUserId: v.string(),
    id: v.string(),
    teamId: v.optional(v.string()),
    assigneeUserIds: v.array(v.string()),
    profileId: v.string(),
    title: v.string(),
    clientId: v.string(),
    salaryPlanId: v.optional(v.id("salaryPlans")),
    projectGroupId: v.optional(v.string()),
    archived: v.boolean(),
    status: storedProjectStatusValidator,
    workflowStageId: v.string(),
    workflowStages: v.array(workflowStageValidator),
    workType: v.string(),
    startDate: v.string(),
    dueDate: v.string(),
    earnings: v.number(),
    paid: v.boolean(),
    paidDate: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    notes: v.string(),
    templateId: v.optional(v.string()),
    templateProjectType: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_ownerUserId_and_teamId", ["ownerUserId", "teamId"])
    .index("by_ownerUserId_and_id", ["ownerUserId", "id"])
    .index("by_projectId", ["id"])
    .index("by_teamId", ["teamId"])
    .index("by_teamId_and_id", ["teamId", "id"]),

  projectSalaryBatches: defineTable({
    ownerUserId: v.string(),
    id: v.string(),
    number: v.number(),
    workType: v.string(),
    requiredProjectCount: v.number(),
    amount: v.number(),
    projectIds: v.array(v.string()),
    salaryPlanId: v.optional(v.id("salaryPlans")),
    clientId: v.optional(v.string()),
    clientName: v.optional(v.string()),
    planStartDate: v.optional(v.string()),
    planNotes: v.optional(v.string()),
    completedAt: v.string(),
    paid: v.boolean(),
    paidAt: v.optional(v.string()),
    received: v.optional(v.boolean()),
    receivedAt: v.optional(v.string()),
    correctionNote: v.optional(v.string()),
  })
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_ownerUserId_and_id", ["ownerUserId", "id"])
    .index("by_ownerUserId_and_workType", ["ownerUserId", "workType"]),

  salaryPlans: defineTable({
    ownerUserId: v.string(),
    clientId: v.string(),
    requiredProjectCount: v.number(),
    amount: v.number(),
    startDate: v.string(),
    notes: v.string(),
    archived: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_ownerUserId_and_archived", ["ownerUserId", "archived"])
    .index("by_ownerUserId_and_clientId", ["ownerUserId", "clientId"]),

  projectOutputs: defineTable({
    ownerUserId: v.string(),
    projectId: v.string(),
    teamId: v.optional(v.string()),
    id: v.string(),
    title: v.string(),
    description: v.string(),
    category: fileCategoryValidator,
    reviewState: projectOutputReviewStateValidator,
    dueDate: v.optional(v.string()),
    archived: v.boolean(),
    currentMediaVersionId: v.optional(v.id("projectMediaVersions")),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_outputId", ["id"])
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_archived", ["projectId", "archived"]),

  projectMediaVersions: defineTable({
    ownerUserId: v.string(),
    projectId: v.string(),
    outputId: v.id("projectOutputs"),
    id: v.string(),
    versionNumber: v.number(),
    source: mediaSourceValidator,
    title: v.string(),
    notes: v.string(),
    createdByUserId: v.string(),
    createdAt: v.string(),
  })
    .index("by_versionId", ["id"])
    .index("by_outputId_and_versionNumber", ["outputId", "versionNumber"]),

  projectPortals: defineTable({
    ownerUserId: v.string(),
    projectId: v.string(),
    teamId: v.optional(v.string()),
    tokenHash: v.string(),
    status: projectPortalStatusValidator,
    pinHash: v.optional(v.string()),
    pinSalt: v.optional(v.string()),
    pinIterations: v.optional(v.number()),
    expiresAt: v.optional(v.string()),
    publicNotes: v.string(),
    showStartDate: v.boolean(),
    showDueDate: v.boolean(),
    selectedOutputIds: v.array(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_tokenHash", ["tokenHash"]),

  mediaVersionComments: defineTable({
    ownerUserId: v.string(),
    projectId: v.string(),
    outputId: v.id("projectOutputs"),
    mediaVersionId: v.id("projectMediaVersions"),
    authorName: v.string(),
    body: v.string(),
    resolved: v.boolean(),
    createdAt: v.string(),
    resolvedAt: v.optional(v.string()),
  })
    .index("by_mediaVersionId", ["mediaVersionId"])
    .index("by_outputId_and_resolved", ["outputId", "resolved"]),

  workItems: defineTable({
    userId: v.string(),
    id: v.string(),
    teamId: v.optional(v.string()),
    ownerUserId: v.optional(v.string()),
    assigneeUserIds: v.optional(v.array(v.string())),
    profileId: v.string(),
    title: v.string(),
    client: v.optional(v.string()),
    clientId: v.optional(v.string()),
    projectGroupId: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    status: storedProjectStatusValidator,
    workType: v.string(),
    startDate: v.string(),
    dueDate: v.string(),
    earnings: v.number(),
    paid: v.optional(v.boolean()),
    paidDate: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    notes: v.string(),
    templateId: v.optional(v.string()),
    templateProjectType: v.optional(v.string()),
    workflowStages: v.optional(v.array(v.string())),
    templateDeliverables: v.optional(v.array(v.object({
      title: v.string(),
      category: fileCategoryValidator,
      initialStatus: fileStatusValidator,
    }))),
    checklistItems: v.optional(v.array(v.string())),
    checklistCompleted: v.optional(v.record(v.string(), v.boolean())),
    integrationLinks: v.optional(v.record(
      v.string(),
      v.object({
        url: v.string(),
        label: v.string(),
        notes: v.string(),
        updatedAt: v.string(),
      })
    )),
    createdAt: v.optional(v.string()),
  })
    .index("by_userId_and_teamId", ["userId", "teamId"])
    .index("by_workItemId", ["id"])
    .index("by_teamId", ["teamId"])
    .index("by_teamId_and_id", ["teamId", "id"]),

  projectGroups: defineTable({
    userId: v.string(),
    id: v.string(),
    teamId: v.optional(v.string()),
    clientId: v.string(),
    name: v.string(),
    notes: v.string(),
    archived: v.boolean(),
    createdAt: v.string(),
  })
    .index("by_userId_and_teamId", ["userId", "teamId"])
    .index("by_userId_and_id", ["userId", "id"])
    .index("by_teamId", ["teamId"])
    .index("by_teamId_and_id", ["teamId", "id"]),

  clientPortals: defineTable({
    ownerUserId: v.string(),
    projectId: v.string(),
    token: v.string(),
    title: v.string(),
    clientName: v.string(),
    projectType: v.string(),
    status: clientPortalStageValidator,
    sourceStatus: storedProjectStatusValidator,
    startDate: v.string(),
    dueDate: v.string(),
    progress: v.number(),
    clientSummary: v.string(),
    clientNotes: v.string(),
    estimatedCompletion: v.string(),
    revisionLimit: v.number(),
    published: v.boolean(),
    // Optional during the compatibility window. Legacy portals derive access from published.
    enabled: v.optional(v.boolean()),
    expiresAt: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    passwordSalt: v.optional(v.string()),
    passwordIterations: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_token", ["token"]),

  portalDeliverables: defineTable({
    portalId: v.id("clientPortals"),
    title: v.string(),
    detail: v.string(),
    url: v.string(),
    status: storedDeliverableStatusValidator,
    downloadable: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_portalId_and_createdAt", ["portalId", "createdAt"]),

  portalRevisions: defineTable({
    portalId: v.id("clientPortals"),
    clientName: v.string(),
    message: v.string(),
    timecode: v.optional(v.string()),
    status: revisionStatusValidator,
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_portalId_and_createdAt", ["portalId", "createdAt"]),

  portalEvents: defineTable({
    portalId: v.id("clientPortals"),
    kind: portalEventKindValidator,
    title: v.string(),
    body: v.string(),
    createdAt: v.string(),
  }).index("by_portalId_and_createdAt", ["portalId", "createdAt"]),

  projectActivity: defineTable({
    projectId: v.string(),
    ownerUserId: v.string(),
    teamId: v.optional(v.string()),
    actorUserId: v.string(),
    actorName: v.string(),
    kind: projectActivityKindValidator,
    message: v.string(),
    detail: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_projectId_and_createdAt", ["projectId", "createdAt"]),

  projectFiles: defineTable({
    projectId: v.string(),
    projectOutputId: v.optional(v.id("projectOutputs")),
    ownerUserId: v.string(),
    teamId: v.optional(v.string()),
    category: fileCategoryValidator,
    title: v.string(),
    description: v.string(),
    status: storedFileStatusValidator,
    clientVisible: v.boolean(),
    downloadable: v.boolean(),
    archived: v.optional(v.boolean()),
    createdByUserId: v.string(),
    createdByName: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_projectId_and_createdAt", ["projectId", "createdAt"])
    .index("by_projectId_and_category_and_clientVisible_and_createdAt", [
      "projectId",
      "category",
      "clientVisible",
      "createdAt",
    ]),

  projectFileVersions: defineTable({
    projectId: v.string(),
    projectFileId: v.id("projectFiles"),
    versionNumber: v.number(),
    status: v.optional(fileStatusValidator),
    provider: fileProviderValidator,
    storageId: v.optional(v.id("_storage")),
    r2Key: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
    externalId: v.optional(v.string()),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    uploadedByUserId: v.string(),
    uploadedByName: v.string(),
    uploadedAt: v.string(),
    notes: v.string(),
  })
    .index("by_projectFileId_and_versionNumber", ["projectFileId", "versionNumber"])
    .index("by_projectId_and_uploadedAt", ["projectId", "uploadedAt"])
    .index("by_storageId", ["storageId"])
    .index("by_r2Key", ["r2Key"]),

  r2UploadSessions: defineTable({
    projectId: v.string(),
    projectFileId: v.optional(v.id("projectFiles")),
    key: v.string(),
    uploaderUserId: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed")),
    createdAt: v.string(),
    expiresAt: v.number(),
  }).index("by_key", ["key"]),

  teamWorkspaces: defineTable({
    ownerUserId: v.string(),
    name: v.string(),
    inviteCode: v.string(),
    createdAt: v.string(),
    allowAllTeamProjects: v.optional(v.boolean()),
    currencyCode: v.optional(v.string()),
    timeZone: v.optional(v.string()),
    defaultWorkflowTemplateId: v.optional(v.string()),
  })
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_inviteCode", ["inviteCode"]),

  teamMembers: defineTable({
    teamId: v.string(),
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    role: storedTeamRoleValidator,
    status: memberStatusValidator,
    permissions: v.record(v.string(), v.boolean()),
    createdAt: v.string(),
    joinedAt: v.optional(v.string()),
  })
    .index("by_teamId", ["teamId"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_teamId_and_userId", ["teamId", "userId"])
    .index("by_teamId_and_email", ["teamId", "email"]),

  teamActivity: defineTable({
    teamId: v.string(),
    actorUserId: v.string(),
    actorName: v.string(),
    kind: teamActivityKindValidator,
    projectId: v.optional(v.string()),
    message: v.string(),
    createdAt: v.string(),
  }).index("by_teamId_and_createdAt", ["teamId", "createdAt"]),

  teamChatMessages: defineTable({
    teamId: v.string(),
    authorUserId: v.string(),
    authorName: v.string(),
    body: v.string(),
    mentions: v.array(v.string()),
    createdAt: v.string(),
  }).index("by_teamId_and_createdAt", ["teamId", "createdAt"]),

  projectComments: defineTable({
    teamId: v.string(),
    projectId: v.string(),
    authorUserId: v.string(),
    authorName: v.string(),
    body: v.string(),
    timecode: v.optional(v.string()),
    mentions: v.array(v.string()),
    createdAt: v.string(),
  })
    .index("by_teamId_and_projectId", ["teamId", "projectId"])
    .index("by_teamId_and_createdAt", ["teamId", "createdAt"]),

  teamNotifications: defineTable({
    teamId: v.string(),
    userId: v.string(),
    kind: notificationKindValidator,
    projectId: v.optional(v.string()),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.string(),
  })
    .index("by_teamId_and_userId_and_createdAt", ["teamId", "userId", "createdAt"])
    .index("by_teamId_and_userId_and_read_and_createdAt", ["teamId", "userId", "read", "createdAt"]),

  publicProfiles: defineTable({
    ownerUserId: v.string(),
    slug: v.string(),
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
    activeProjects: v.number(),
    deliveredEdits: v.number(),
    avgTurnaroundDays: v.number(),
    projects: v.array(v.object({
      title: v.string(),
      status: storedProjectStatusValidator,
      workType: v.string(),
      dueDate: v.string(),
    })),
    updatedAt: v.string(),
  })
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_slug", ["slug"]),

  settings: defineTable({
    userId: v.string(),
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
    clients: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      company: v.string(),
      contactName: v.string(),
      email: v.string(),
      phone: v.string(),
      notes: v.string(),
      archived: v.boolean(),
    }))),
    customProjectTemplates: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.string(),
      projectType: v.string(),
      workType: v.union(v.literal("channel"), v.literal("freelance")),
      durationDays: v.number(),
      workflowStages: v.array(v.union(v.string(), workflowStageValidator)),
      deliverables: v.array(v.object({
        title: v.string(),
        category: fileCategoryValidator,
        initialStatus: fileStatusValidator,
      })),
      checklistItems: v.array(v.string()),
      custom: v.optional(v.boolean()),
      archived: v.optional(v.boolean()),
      updatedAt: v.optional(v.string()),
    }))),
    projectTags: v.optional(v.array(v.string())),
    salaryWorkType: v.optional(v.string()),
    salaryBatchSize: v.optional(v.number()),
    salaryBatchAmount: v.optional(v.number()),
    projectStages: v.array(v.string()),
    notifications: v.record(v.string(), v.boolean()),
    integrations: v.record(v.string(), v.boolean()),
    integrationAccounts: v.record(v.string(), v.string()),
    integrationLinks: v.optional(v.record(
      v.string(),
      v.object({
        url: v.string(),
        label: v.string(),
        notes: v.string(),
        updatedAt: v.string(),
      })
    )),
    teamRole: settingsTeamRoleValidator,
    teamMembers: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        role: storedTeamRoleValidator,
        email: v.string(),
      })
    ),
    editorPermissions: v.record(v.string(), v.boolean()),
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
  }).index("by_userId", ["userId"]),

  salaryBatches: defineTable({
    userId: v.string(),
    id: v.string(),
    number: v.number(),
    completedDate: v.string(),
    archived: v.boolean(),
    archivedDate: v.string(),
    amount: v.optional(v.number()),
    paid: v.optional(v.boolean()),
    paidDate: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  resourceLinks: defineTable({
    userId: v.string(),
    id: v.string(),
    title: v.string(),
    url: v.string(),
    category: v.string(),
    projectId: v.string(),
    notes: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_userId", ["userId"]),
});
