import type { FileCategory, FileStatus } from "./domain-values";
import type { SavedProjectTemplate, WorkItem } from "./types";

export const PROJECT_TEMPLATE_IDS = [
  "youtube-video",
  "instagram-reel",
  "corporate-event-video",
  "product-ad",
  "wedding-film",
  "theme-park-social-campaign",
  "podcast-edit",
  "client-retainer-package",
] as const;

export type ProjectTemplateId = (typeof PROJECT_TEMPLATE_IDS)[number];
export type ProjectTemplateWorkType = "channel" | "freelance";

export type ProjectTemplateDeliverable = {
  title: string;
  category: FileCategory;
  initialStatus: FileStatus;
};

export type ProjectTemplate = SavedProjectTemplate;


const deliverable = (
  title: string,
  category: FileCategory = "Deliverable"
): ProjectTemplateDeliverable => ({
  title,
  category,
  initialStatus: "draft",
});

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "relay-default-workflow",
    name: "Relay Default Workflow",
    description: "A clear production path from planning through delivery.",
    projectType: "Video production",
    workType: "freelance",
    durationDays: 10,
    workflowStages: ["Planned", "Editing", "Client Review", "Revisions", "Approved", "Delivered"],
    deliverables: [deliverable("Final master")],
    checklistItems: ["Confirm brief", "Check export settings", "Confirm client approval"],
  },
  {
    id: "youtube-video",
    name: "YouTube Video",
    description: "Long-form creator edit with review, packaging, and publishing handoff.",
    projectType: "Long-form video",
    workType: "channel",
    durationDays: 10,
    workflowStages: ["Brief", "Assembly", "Rough Cut", "Review", "Final Cut", "Published"],
    deliverables: [
      deliverable("16:9 master"),
      deliverable("Thumbnail source", "Asset"),
      deliverable("Captions"),
    ],
    checklistItems: ["Confirm runtime and audience", "Add chapters or markers", "Check music licensing", "Run final QC"],
  },
  {
    id: "instagram-reel",
    name: "Instagram Reel",
    description: "Fast vertical edit with hook, captions, sound design, and social export.",
    projectType: "Short-form social",
    workType: "freelance",
    durationDays: 4,
    workflowStages: ["Concept", "Selects", "First Cut", "Caption Pass", "Review", "Export"],
    deliverables: [
      deliverable("9:16 master"),
      deliverable("Captioned version"),
      deliverable("Cover frame", "Asset"),
    ],
    checklistItems: ["Hook lands in first three seconds", "Keep text inside safe zones", "Check loop point", "Export platform-ready codec"],
  },
  {
    id: "corporate-event-video",
    name: "Corporate Event Video",
    description: "Event coverage workflow for selects, interviews, highlight film, and archive.",
    projectType: "Event coverage",
    workType: "freelance",
    durationDays: 14,
    workflowStages: ["Ingest", "Sync", "Selects", "Assembly", "Client Review", "Finishing", "Delivery"],
    deliverables: [
      deliverable("Event highlight"),
      deliverable("Speaker cutdowns"),
      deliverable("Clean interview selects", "Reference"),
    ],
    checklistItems: ["Back up all camera cards", "Sync external audio", "Verify names and titles", "Archive project and masters"],
  },
  {
    id: "product-ad",
    name: "Product Ad",
    description: "Commercial edit with claims review, motion graphics, cutdowns, and masters.",
    projectType: "Commercial",
    workType: "freelance",
    durationDays: 12,
    workflowStages: ["Creative Brief", "Selects", "Offline Edit", "Brand Review", "Motion and Sound", "Legal Review", "Masters"],
    deliverables: [
      deliverable("Primary campaign master"),
      deliverable("15-second cutdown"),
      deliverable("6-second bumper"),
      deliverable("Brand assets", "Asset"),
    ],
    checklistItems: ["Confirm product claims", "Match brand guidelines", "Verify end card and CTA", "Export requested aspect ratios"],
  },
  {
    id: "wedding-film",
    name: "Wedding Film",
    description: "Story-led wedding workflow covering ceremony sync, highlight film, and full edits.",
    projectType: "Wedding",
    workType: "freelance",
    durationDays: 30,
    workflowStages: ["Ingest", "Audio Sync", "Story Selects", "Highlight Assembly", "Music and Color", "Couple Review", "Delivery"],
    deliverables: [
      deliverable("Wedding highlight"),
      deliverable("Full ceremony edit"),
      deliverable("Speeches edit"),
      deliverable("Licensed music references", "Reference"),
    ],
    checklistItems: ["Verify names and event order", "Back up vows and speeches", "Confirm licensed tracks", "Prepare archival masters"],
  },
  {
    id: "theme-park-social-campaign",
    name: "Theme Park / Social Campaign",
    description: "Multi-format attraction campaign for energetic social posts and cutdowns.",
    projectType: "Social campaign",
    workType: "freelance",
    durationDays: 10,
    workflowStages: ["Campaign Brief", "Attraction Selects", "Hero Edit", "Cutdowns", "Brand Review", "Platform QC", "Delivery"],
    deliverables: [
      deliverable("Campaign hero"),
      deliverable("Vertical social cutdowns"),
      deliverable("Story variants"),
      deliverable("Park brand kit", "Asset"),
    ],
    checklistItems: ["Confirm attraction names", "Check guest release requirements", "Keep safety messaging intact", "Verify platform safe zones"],
  },
  {
    id: "podcast-edit",
    name: "Podcast Edit",
    description: "Multi-camera episode workflow with audio cleanup, full episode, and clips.",
    projectType: "Podcast",
    workType: "freelance",
    durationDays: 7,
    workflowStages: ["Ingest", "Sync", "Dialogue Edit", "Multicam Cut", "Review", "Clips", "Publish"],
    deliverables: [
      deliverable("Full video episode"),
      deliverable("Audio episode"),
      deliverable("Social clips"),
      deliverable("Show notes", "Reference"),
    ],
    checklistItems: ["Remove false starts and long pauses", "Normalize dialogue loudness", "Add intro and sponsor reads", "Create chapter markers"],
  },
  {
    id: "client-retainer-package",
    name: "Client Retainer Package",
    description: "Repeatable monthly package for a batch of planned edits and approvals.",
    projectType: "Retainer package",
    workType: "freelance",
    durationDays: 30,
    workflowStages: ["Monthly Planning", "Asset Intake", "Batch Production", "Client Review", "Revisions", "Delivery", "Monthly Wrap"],
    deliverables: [
      deliverable("Monthly content batch"),
      deliverable("Platform variants"),
      deliverable("Source asset register", "Reference"),
      deliverable("Reusable brand assets", "Asset"),
    ],
    checklistItems: ["Confirm monthly quantity", "Lock content calendar", "Track revision allowance", "Prepare monthly delivery summary"],
  },
];

export function getProjectTemplate(id: ProjectTemplateId) {
  return PROJECT_TEMPLATES.find((template) => template.id === id);
}

export function templateNotes(template: ProjectTemplate) {
  return [
    `Project type: ${template.projectType}`,
    `Workflow: ${template.workflowStages.join(" -> ")}`,
    `Suggested deliverables:\n${template.deliverables.map((item) => `- ${item.title} [${item.category}]`).join("\n")}`,
    `Checklist:\n${template.checklistItems.map((item) => `- [ ] ${item}`).join("\n")}`,
  ].join("\n\n");
}

export function applyProjectTemplate(
  template: ProjectTemplate,
  options: {
    profileId: string;
    startDate: string;
    dueDate: string;
    workType: string;
    baseNotes?: string;
    teamId?: string;
  }
): Omit<WorkItem, "id"> {
  return {
    profileId: options.profileId,
    title: template.name,
    client: "",
    status: "Planned",
    workType: options.workType,
    startDate: options.startDate,
    dueDate: options.dueDate,
    earnings: 0,
    notes: [templateNotes(template), options.baseNotes].filter(Boolean).join("\n\n"),
    integrationLinks: {},
    teamId: options.teamId,
    assigneeUserIds: [],
    templateId: template.id,
    templateProjectType: template.projectType,
    workflowStages: [...template.workflowStages],
    templateDeliverables: template.deliverables.map((item) => ({ ...item })),
    checklistItems: [...template.checklistItems],
  };
}
