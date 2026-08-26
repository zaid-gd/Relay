export const PROJECT_STATUS_VALUES = [
  "Planned",
  "In Progress",
  "Review",
  "Revision",
  "Delivered",
  "Cancelled",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];

export const LEGACY_PROJECT_STATUS_VALUES = ["Client Review"] as const;
export type LegacyProjectStatus = (typeof LEGACY_PROJECT_STATUS_VALUES)[number];
export type StoredProjectStatus = ProjectStatus | LegacyProjectStatus;

const STORED_PROJECT_STATUS_VALUES = [
  ...PROJECT_STATUS_VALUES,
  ...LEGACY_PROJECT_STATUS_VALUES,
] as const;

export function isStoredProjectStatus(
  value: unknown
): value is StoredProjectStatus {
  return (
    typeof value === "string" &&
    (STORED_PROJECT_STATUS_VALUES as readonly string[]).includes(value)
  );
}

export function normalizeStoredProjectStatus(
  value: unknown
): StoredProjectStatus {
  const normalized = typeof value === "string" ? value.trim() : "";
  return isStoredProjectStatus(normalized) ? normalized : "Planned";
}

export const FILE_CATEGORY_VALUES = [
  "Deliverable",
  "Reference",
  "Asset",
] as const;
export type FileCategory = (typeof FILE_CATEGORY_VALUES)[number];

export const APPROVAL_STATUS_VALUES = [
  "draft",
  "sent_to_client",
  "changes_requested",
  "approved",
  "final_delivered",
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUS_VALUES)[number];

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  draft: "Draft",
  sent_to_client: "Sent to Client",
  changes_requested: "Changes Requested",
  approved: "Approved",
  final_delivered: "Final Delivered",
};

export const FILE_STATUS_VALUES = APPROVAL_STATUS_VALUES;
export type FileStatus = (typeof FILE_STATUS_VALUES)[number];

export const LEGACY_FILE_STATUS_VALUES = [
  "Working",
  "In Review",
  "Approved",
  "Delivered",
] as const;
export type LegacyFileStatus = (typeof LEGACY_FILE_STATUS_VALUES)[number];
export type StoredFileStatus = FileStatus | LegacyFileStatus;

export function normalizeFileStatus(value: unknown): FileStatus {
  if (typeof value !== "string") return "draft";
  if ((FILE_STATUS_VALUES as readonly string[]).includes(value)) {
    return value as FileStatus;
  }
  if (value === "In Review") return "sent_to_client";
  if (value === "Approved") return "approved";
  if (value === "Delivered") return "final_delivered";
  return "draft";
}

export function approvalStatusLabel(value: unknown) {
  return APPROVAL_STATUS_LABELS[normalizeFileStatus(value)];
}

export function isClientSafeApprovalStatus(value: unknown) {
  return normalizeFileStatus(value) !== "draft";
}

export const FILE_PROVIDER_VALUES = [
  "convex",
  "r2",
  "external",
  "google_drive",
  "dropbox",
  "frame_io",
] as const;
export type FileProvider = (typeof FILE_PROVIDER_VALUES)[number];

export const TEAM_ROLE_VALUES = ["Owner", "Editor", "Reviewer"] as const;
export type TeamRole = (typeof TEAM_ROLE_VALUES)[number];

export const LEGACY_TEAM_ROLE_VALUES = ["Client"] as const;
export type LegacyTeamRole = (typeof LEGACY_TEAM_ROLE_VALUES)[number];
export type StoredTeamRole = TeamRole | LegacyTeamRole;
export type SettingsTeamRole = StoredTeamRole | "";

export const MEMBER_STATUS_VALUES = ["invited", "active"] as const;
export type MemberStatus = (typeof MEMBER_STATUS_VALUES)[number];

export const CLIENT_PORTAL_STAGE_VALUES = [
  "Planning",
  "In Progress",
  "Review",
  "Delivered",
] as const;
export type ClientPortalStage = (typeof CLIENT_PORTAL_STAGE_VALUES)[number];

export const DELIVERABLE_STATUS_VALUES = APPROVAL_STATUS_VALUES;
export type DeliverableStatus = (typeof DELIVERABLE_STATUS_VALUES)[number];

export const LEGACY_DELIVERABLE_STATUS_VALUES = [
  "Pending",
  "In Progress",
  "Ready",
  "Delivered",
] as const;
export type LegacyDeliverableStatus =
  (typeof LEGACY_DELIVERABLE_STATUS_VALUES)[number];
export type StoredDeliverableStatus =
  DeliverableStatus | LegacyDeliverableStatus;

export function normalizeDeliverableStatus(value: unknown): DeliverableStatus {
  if (typeof value !== "string") return "draft";
  if ((DELIVERABLE_STATUS_VALUES as readonly string[]).includes(value)) {
    return value as DeliverableStatus;
  }
  if (value === "In Progress") return "draft";
  if (value === "Ready") return "approved";
  if (value === "Delivered") return "final_delivered";
  return "draft";
}

export const REVISION_STATUS_VALUES = [
  "Submitted",
  "In Review",
  "Resolved",
] as const;
export type RevisionStatus = (typeof REVISION_STATUS_VALUES)[number];

export const NOTIFICATION_KIND_VALUES = [
  "mention",
  "project_mention",
  "project_comment",
  "project_update",
  "member_joined",
  "member_left",
  "role_updated",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KIND_VALUES)[number];

export const TEAM_ACTIVITY_KIND_VALUES = [
  "workspace_created",
  "member_invited",
  "member_joined",
  "member_role_updated",
  "legacy_roles_normalized",
  "member_removed",
  "member_left",
  "chat_message",
  "project_comment",
  "project_update",
  "project_file_added",
  "project_file_version_added",
  "project_file_updated",
  "project_file_removed",
] as const;
export type TeamActivityKind = (typeof TEAM_ACTIVITY_KIND_VALUES)[number];

export const PROJECT_ACTIVITY_KIND_VALUES = [
  "project_update",
  "project_created",
  "project_updated",
  "status_changed",
  "assignment_changed",
  "team_note_added",
  "client_stage_changed",
  "client_portal_updated",
  "client_portal_published",
  "client_portal_unpublished",
  "client_portal_enabled",
  "client_portal_disabled",
  "client_portal_token_regenerated",
  "deliverable_added",
  "deliverable_removed",
  "deliverable_status_changed",
  "revision_requested",
  "revision_status_changed",
  "project_file_added",
  "project_file_version_added",
  "project_file_updated",
  "project_file_removed",
] as const;
export type ProjectActivityKind = (typeof PROJECT_ACTIVITY_KIND_VALUES)[number];

export const PORTAL_EVENT_KIND_VALUES = [
  "project_created",
  "portal_published",
  "work_started",
  "review_sent",
  "delivery_completed",
  "status_changed",
  "deliverable_added",
  "deliverable_updated",
  "revision_requested",
  "revision_completed",
] as const;
export type PortalEventKind = (typeof PORTAL_EVENT_KIND_VALUES)[number];
