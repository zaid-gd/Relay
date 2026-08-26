import type { ProfileConfig } from "./types";

export const DEFAULT_PROFILE_ID = "video-editor";

const videoEditorProfile: ProfileConfig = {
  id: DEFAULT_PROFILE_ID,
  name: "Video Editor",
  headline: "Video Editing Work Tracker",
  summary: "",
  workflow: "",
  titleLabel: "Video title / project",
  unitLabel: "videos",
  itemLabel: "video",
  statusLabel: "Edit status",
  workTypeLabel: "Work type",
  startLabel: "Assigned start date",
  dueLabel: "Due / delivery date",
  earningsLabel: "Earnings",
  notesLabel: "Edit notes",
  notesPlaceholder: "",
  activeLabel: "In progress",
  upcomingLabel: "Upcoming deadlines",
  timelineTitle: "Schedule map",
  conflictTitle: "Scheduling conflicts",
  statusOptions: ["Planned", "In Progress", "Delivered", "Cancelled"],
  typeOptions: [
    { label: "Job / Salary", earningsMode: "batch" },
    { label: "Freelance", earningsMode: "manual" },
    { label: "Personal Channel", earningsMode: "optional" }
  ],
  salaryBatch: true
};

export const profileConfigs: ProfileConfig[] = [videoEditorProfile];

/**
 * Retrieves the profile configuration for the specified profile ID.
 */
export function getProfile(_profileId?: string | null) {
  return videoEditorProfile;
}
