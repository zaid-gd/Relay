import { v } from "convex/values";

export const projectStatusValidator = v.union(
  v.literal("Planned"),
  v.literal("In Progress"),
  v.literal("Review"),
  v.literal("Revision"),
  v.literal("Delivered"),
  v.literal("Cancelled")
);

export const storedProjectStatusValidator = v.union(
  projectStatusValidator,
  v.literal("Client Review")
);

export const workflowStagePurposeValidator = v.union(
  v.literal("planned"),
  v.literal("editing"),
  v.literal("client_review"),
  v.literal("revisions"),
  v.literal("approved"),
  v.literal("delivered")
);

export const workflowStageValidator = v.object({
  id: v.string(),
  label: v.string(),
  purpose: workflowStagePurposeValidator,
});

export const projectOutputReviewStateValidator = v.union(
  v.literal("draft"),
  v.literal("sent_to_client"),
  v.literal("changes_requested"),
  v.literal("approved"),
  v.literal("final_delivered")
);

export const projectPortalStatusValidator = v.union(
  v.literal("draft"),
  v.literal("open"),
  v.literal("closed")
);

export const mediaSourceValidator = v.union(
  v.object({ kind: v.literal("youtube"), url: v.string(), videoId: v.string() }),
  v.object({ kind: v.literal("vimeo"), url: v.string(), videoId: v.string() }),
  v.object({ kind: v.literal("link"), url: v.string() })
);

export const fileCategoryValidator = v.union(
  v.literal("Deliverable"),
  v.literal("Reference"),
  v.literal("Asset")
);

export const fileStatusValidator = v.union(
  v.literal("draft"),
  v.literal("sent_to_client"),
  v.literal("changes_requested"),
  v.literal("approved"),
  v.literal("final_delivered")
);

export const storedFileStatusValidator = v.union(
  fileStatusValidator,
  v.literal("Working"),
  v.literal("In Review"),
  v.literal("Approved"),
  v.literal("Delivered")
);

export const fileProviderValidator = v.union(
  v.literal("convex"),
  v.literal("r2"),
  v.literal("external"),
  v.literal("google_drive"),
  v.literal("dropbox"),
  v.literal("frame_io")
);

export const teamRoleValidator = v.union(
  v.literal("Owner"),
  v.literal("Editor"),
  v.literal("Reviewer")
);

export const storedTeamRoleValidator = v.union(
  teamRoleValidator,
  v.literal("Client")
);

export const settingsTeamRoleValidator = v.union(
  storedTeamRoleValidator,
  v.literal("")
);

export const memberStatusValidator = v.union(
  v.literal("invited"),
  v.literal("active")
);

export const clientPortalStageValidator = v.union(
  v.literal("Planning"),
  v.literal("In Progress"),
  v.literal("Review"),
  v.literal("Delivered")
);

export const deliverableStatusValidator = v.union(
  v.literal("draft"),
  v.literal("sent_to_client"),
  v.literal("changes_requested"),
  v.literal("approved"),
  v.literal("final_delivered")
);

export const storedDeliverableStatusValidator = v.union(
  deliverableStatusValidator,
  v.literal("Pending"),
  v.literal("In Progress"),
  v.literal("Ready"),
  v.literal("Delivered")
);

export const revisionStatusValidator = v.union(
  v.literal("Submitted"),
  v.literal("In Review"),
  v.literal("Resolved")
);

export const notificationKindValidator = v.union(
  v.literal("mention"),
  v.literal("project_mention"),
  v.literal("project_comment"),
  v.literal("project_update"),
  v.literal("member_joined"),
  v.literal("member_left"),
  v.literal("role_updated")
);

export const teamActivityKindValidator = v.union(
  v.literal("workspace_created"),
  v.literal("member_invited"),
  v.literal("member_joined"),
  v.literal("member_role_updated"),
  v.literal("legacy_roles_normalized"),
  v.literal("member_removed"),
  v.literal("member_left"),
  v.literal("chat_message"),
  v.literal("project_comment"),
  v.literal("project_update"),
  v.literal("project_file_added"),
  v.literal("project_file_version_added"),
  v.literal("project_file_updated"),
  v.literal("project_file_removed")
);

export const projectActivityKindValidator = v.union(
  v.literal("project_update"),
  v.literal("project_created"),
  v.literal("project_updated"),
  v.literal("status_changed"),
  v.literal("assignment_changed"),
  v.literal("team_note_added"),
  v.literal("client_stage_changed"),
  v.literal("client_portal_updated"),
  v.literal("client_portal_published"),
  v.literal("client_portal_unpublished"),
  v.literal("client_portal_enabled"),
  v.literal("client_portal_disabled"),
  v.literal("client_portal_token_regenerated"),
  v.literal("deliverable_added"),
  v.literal("deliverable_removed"),
  v.literal("deliverable_status_changed"),
  v.literal("revision_requested"),
  v.literal("revision_status_changed"),
  v.literal("project_file_added"),
  v.literal("project_file_version_added"),
  v.literal("project_file_updated"),
  v.literal("project_file_removed")
);

export const portalEventKindValidator = v.union(
  v.literal("project_created"),
  v.literal("portal_published"),
  v.literal("work_started"),
  v.literal("review_sent"),
  v.literal("delivery_completed"),
  v.literal("status_changed"),
  v.literal("deliverable_added"),
  v.literal("deliverable_updated"),
  v.literal("revision_requested"),
  v.literal("revision_completed")
);
