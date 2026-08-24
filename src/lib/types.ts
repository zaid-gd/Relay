import type { IntegrationLinks } from "./integrations";
import type {
  FileCategory,
  FileStatus,
  SettingsTeamRole,
  StoredProjectStatus,
  StoredTeamRole,
} from "./domain-values";

export type EarningsMode = "manual" | "optional" | "batch" | "none";

export type WorkTypeConfig = {
  label: string;
  earningsMode: EarningsMode;
};

export type ProfileConfig = {
  id: string;
  name: string;
  headline: string;
  summary: string;
  workflow: string;
  titleLabel: string;
  unitLabel: string;
  itemLabel: string;
  statusLabel: string;
  workTypeLabel: string;
  startLabel: string;
  dueLabel: string;
  earningsLabel: string;
  notesLabel: string;
  notesPlaceholder: string;
  activeLabel: string;
  upcomingLabel: string;
  timelineTitle: string;
  conflictTitle: string;
  statusOptions: string[];
  typeOptions: WorkTypeConfig[];
  salaryBatch?: boolean;
  moneyLabel?: string;
};

export type WorkItem = {
  id: string;
  teamId?: string;
  ownerUserId?: string;
  assigneeUserIds?: string[];
  profileId: string;
  createdAt?: string;
  title: string;
  client?: string;
  clientId?: string;
  status: StoredProjectStatus;
  workType: string;
  startDate: string;
  dueDate: string;
  earnings: number;
  paid?: boolean;
  paidDate?: string;
  notes: string;
  integrationLinks?: IntegrationLinks;
  templateId?: string;
  templateProjectType?: string;
  workflowStages?: string[];
  templateDeliverables?: Array<{
    title: string;
    category: FileCategory;
    initialStatus: FileStatus;
  }>;
  checklistItems?: string[];
  checklistCompleted?: Record<string, boolean>;
};

export type Client = {
  id: string;
  name: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
  archived: boolean;
};

export type SavedProjectTemplate = {
  id: string;
  name: string;
  description: string;
  projectType: string;
  workType: "channel" | "freelance";
  durationDays: number;
  workflowStages: string[];
  deliverables: Array<{
    title: string;
    category: FileCategory;
    initialStatus: FileStatus;
  }>;
  checklistItems: string[];
  custom?: boolean;
  archived?: boolean;
  updatedAt?: string;
};

export type ResourceLink = {
  id: string;
  title: string;
  url: string;
  category: string;
  projectId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type SalaryBatch = {
  id: string;
  number: number;
  completedDate: string;
  archived: boolean;
  archivedDate: string;
  amount?: number;
  paid?: boolean;
  paidDate?: string;
};

export type SalaryState = {
  batches: SalaryBatch[];
};

export type Filters = {
  status: string;
  workType: string;
  from: string;
  to: string;
  earningsSort: "none" | "high" | "low";
  colorMode: "status" | "workType";
};

export type TeamMember = {
  id: string;
  name: string;
  role: StoredTeamRole;
  email: string;
};

export type IntegrationConfig = {
  connected: boolean;
  account: string;
  folder: string;
  channel: string;
  workspace: string;
  webhookUrl: string;
  connectedAt: string;
  lastSyncAt: string;
};

export type SettingsState = {
  studioName: string;
  profileName: string;
  profileUsername: string;
  profileTitle: string;
  profileBio: string;
  profileLocation: string;
  profileImageUrl: string;
  publicActiveProjects: number;
  publicDeliveredEdits: number;
  publicTurnaroundDays: number;
  timeZone: string;
  dateFormat: string;
  weekStart: string;
  currencyCode: string;
  customClients: string[];
  clients: Client[];
  customProjectTemplates: SavedProjectTemplate[];
  projectTags: string[];
  salaryWorkType: string;
  salaryBatchSize: number;
  salaryBatchAmount: number;
  projectStages: string[];
  notifications: Record<string, boolean>;
  integrations: Record<string, boolean>;
  integrationAccounts: Record<string, string>;
  integrationConfigs: Record<string, IntegrationConfig>;
  integrationLinks: IntegrationLinks;
  teamRole: SettingsTeamRole;
  teamMembers: TeamMember[];
  editorPermissions: Record<string, boolean>;
  rolePermissions: Record<string, Record<string, boolean>>;
  theme: string;
  accentColor: string;
  density: string;
};
