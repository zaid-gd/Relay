"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { UserProfile, useAuth } from "@clerk/nextjs";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import {
  useData,
  useProjectGroups,
  useProjectWorkflow,
} from "@/lib/data-context";
import { useOptionalAuth } from "@/lib/optional-auth";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_PROFILE_ID, getProfile } from "@/lib/profiles";
import { useHydratedReducedMotion } from "@/lib/motion";
import type {
  Client,
  WorkItem,
  WorkTypeConfig,
  IntegrationConfig,
  ResourceLink,
  SavedProjectTemplate,
} from "@/lib/types";
import {
  useProjectController,
  useProjectCreationController,
} from "@/features/projects/project-controller";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { ProjectGroupsDialog } from "@/components/project-groups-dialog";
import { mergeClientRecords } from "@/lib/clients";
import {
  validateWorkflowStages,
  workflowStagesFromLabels,
} from "@/lib/workflow-templates";
import {
  APPROVAL_STATUS_LABELS,
  CLIENT_PORTAL_STAGE_VALUES,
  DELIVERABLE_STATUS_VALUES,
  FILE_CATEGORY_VALUES,
  FILE_STATUS_VALUES,
  PROJECT_STATUS_VALUES,
  REVISION_STATUS_VALUES,
  TEAM_ROLE_VALUES,
  type ClientPortalStage,
  type DeliverableStatus,
  type FileCategory,
  type FileStatus,
  type ProjectStatus,
  type RevisionStatus,
  type SettingsTeamRole,
  type StoredTeamRole,
  approvalStatusLabel,
} from "@/lib/domain-values";
import type {
  IntegrationLink,
  IntegrationLinks,
  IntegrationServiceId,
} from "@/lib/integrations";
import {
  PROJECT_TEMPLATES,
  type ProjectTemplate,
} from "@/lib/project-templates";
import {
  normalizeOptionalTimecode,
  TIMECODE_FORMAT_HINT,
} from "@/lib/timecode";
import {
  configuredIntegrationCount,
  emptyIntegrationLink,
  hasIntegrationLink,
  integrationDisplayText,
  integrationServices,
  integrationStatusLabel,
  isIntegrationServiceId,
  isValidIntegrationUrl,
  normalizeIntegrationLink,
} from "@/lib/integrations";
import { cutlab } from "./design-system";
import { CutLabLockup } from "./cutlab-brand";
import { emptyStateAssetFor, emptyStateAssets } from "./brand-assets";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  ContentSection,
  FillViewport,
  MasterDetail,
  MetricItem,
  MetricStrip,
  PageContent,
  PageEmptyState,
  PageHeader,
  PageToolbar,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";
import { PrecisionDashboard } from "@/components/precision-dashboard";
import { PrecisionProjects } from "@/components/precision-projects";
import { ProjectWorkspace } from "@/features/projects/project-workspace";
import {
  DeleteProjectDialog,
  ProjectDialog,
} from "@/features/projects/project-dialogs";
import { createProjectPort } from "@/features/projects/project-port";
import {
  canDeleteProject as projectCanBeDeleted,
  resolveProjectPermissions,
} from "@/features/projects/project-permissions";
import {
  projectHref,
  type ProjectActivityEvent,
} from "@/features/projects/project-view";
import {
  useProjectsApplicationState,
  type DueFilter,
  type ProjectDashboardActivity as DashboardActivity,
} from "@/features/projects/use-projects-application-state";
import {
  PrecisionCalendar,
  PrecisionTimeline,
} from "@/components/precision-schedule";
import { PrecisionFiles } from "@/components/precision-files";
import {
  PrecisionClients,
  PrecisionFeedback,
  PrecisionReports,
} from "@/components/precision-workspaces";
import { PrecisionMedia } from "@/components/precision-media";
import { ProjectOutputsPanel } from "@/components/project-outputs-panel";
import { ProjectPortalPanel } from "@/components/project-portal-panel";
import { SalaryPlansPanel } from "@/components/salary-plans-panel";
import { FirstRunChecklist } from "@/components/first-run-checklist";
import { SampleModeBar } from "@/components/sample-mode-bar";
import { ClerkPricingPlans } from "@/components/subscription-plans";
import {
  resolveOnboardingVariant,
  trackOnboardingEvent,
  type OnboardingVariant,
} from "@/lib/onboarding";
import { buildPayoutReport } from "@/lib/payout-reporting";
import {
  buildWorkspaceSearchIndex,
  type WorkspaceFile,
  type WorkspaceOutput,
} from "@/features/workspace-discovery/workspace-discovery";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  trackOptionalEvent,
  type AnalyticsConsent,
} from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { projectStatusTone } from "@/lib/project-status-style";
import {
  AlertDialog as OwnedAlertDialog,
  AlertDialogAction as OwnedAlertDialogAction,
  AlertDialogCancel as OwnedAlertDialogCancel,
  AlertDialogContent as OwnedAlertDialogContent,
  AlertDialogDescription as OwnedAlertDialogDescription,
  AlertDialogFooter as OwnedAlertDialogFooter,
  AlertDialogHeader as OwnedAlertDialogHeader,
  AlertDialogTitle as OwnedAlertDialogTitle,
} from "@/components/ui/alert-dialog";

const teamApi = {
  updateWorkspaceSettings: makeFunctionReference<
    "mutation",
    {
      teamId: string;
      name: string;
      currencyCode: string;
      timeZone: string;
      defaultWorkflowTemplateId?: string;
      allowAllTeamProjects: boolean;
    },
    null
  >("team:updateWorkspaceSettings"),
  updateMemberPermissions: makeFunctionReference<
    "mutation",
    {
      teamId: string;
      memberId: string;
      permissions: Record<string, boolean>;
    },
    null
  >("team:updateMemberPermissions"),
  transferOwnership: makeFunctionReference<
    "mutation",
    { teamId: string; memberId: string },
    null
  >("team:transferOwnership"),
};
const workspaceDiscoveryApi = {
  list: makeFunctionReference<
    "query",
    { includeArchived?: boolean },
    { outputs: WorkspaceOutput[]; files: WorkspaceFile[] }
  >("workspaceDiscovery:list"),
};
import {
  Accordion as OwnedAccordion,
  AccordionContent as OwnedAccordionContent,
  AccordionItem as OwnedAccordionItem,
  AccordionTrigger as OwnedAccordionTrigger,
} from "@/components/ui/accordion";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import {
  Command as OwnedCommand,
  CommandEmpty as OwnedCommandEmpty,
  CommandGroup as OwnedCommandGroup,
  CommandInput as OwnedCommandInput,
  CommandItem as OwnedCommandItem,
  CommandList as OwnedCommandList,
} from "@/components/ui/command";
import {
  Dialog as OwnedDialog,
  DialogContent as OwnedDialogContent,
  DialogDescription as OwnedDialogDescription,
  DialogFooter as OwnedDialogFooter,
  DialogHeader as OwnedDialogHeader,
  DialogTitle as OwnedDialogTitle,
} from "@/components/ui/dialog";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input as OwnedInput } from "@/components/ui/input";
import {
  Popover as OwnedPopover,
  PopoverContent as OwnedPopoverContent,
  PopoverTrigger as OwnedPopoverTrigger,
} from "@/components/ui/popover";
import { Progress as OwnedProgress } from "@/components/ui/progress";
import {
  Select as OwnedSelect,
  SelectContent as OwnedSelectContent,
  SelectItem as OwnedSelectItem,
  SelectTrigger as OwnedSelectTrigger,
  SelectValue as OwnedSelectValue,
} from "@/components/ui/select";
import { Skeleton as OwnedSkeleton } from "@/components/ui/skeleton";
import { Switch as OwnedSwitch } from "@/components/ui/switch";
import { Textarea as OwnedTextarea } from "@/components/ui/textarea";
import {
  BadgeDollarSign,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CircleCheckBig,
  ChevronsUpDown,
  Clock3,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  Globe2,
  History,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  MessageSquare,
  Palette,
  Pencil,
  Play,
  Plug,
  Plus,
  RefreshCw,
  Send,
  Share2,
  SlidersHorizontal,
  Trash2,
  Unplug,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { ProjectSelect } from "@/features/projects/project-select";

const defaultProjectTags = ["Job / Salary", "Freelance", "Personal Channel"];
const defaultSalaryWorkType = "Job / Salary";
const defaultSalaryBatchSize = 20;
const defaultSalaryBatchAmount = 10000;
const AUTH_MODE_STORAGE_KEY = "cutlab-studio:auth-mode:v1";
const TEAM_WORKSPACE_NAME_LIMIT = 80;
const TEAM_CHAT_MESSAGE_LIMIT = 800;
const TEAM_PROJECT_COMMENT_LIMIT = 1000;
const TEAM_INVITE_CODE_PATTERN = /^[A-Z0-9]{6}$/;
const TEAM_MEMBER_PERMISSION_LABELS = [
  ["viewProjects", "View Projects"],
  ["editProjects", "Edit Projects"],
  ["reviewProjects", "Reviews"],
  ["managePortal", "Client Portals"],
  ["manageFinance", "Finance"],
] as const;
const MIN_PUBLIC_SLUG_LENGTH = 2;
const LOCAL_PROJECT_ACTIVITY_STORAGE_KEY = "cutlab-studio:project-activity:v1";
const headingFont = cutlab.font.heading;
const defaultAccent = cutlab.color.teal;
const accent = `var(--app-accent, ${cutlab.color.teal})`;
const ink = `var(--app-ink, ${cutlab.color.softWhite})`;
const muted = "var(--app-muted)";
const border = "var(--app-border)";
const panel = `var(--app-panel, ${cutlab.color.graphite})`;
const canvas = `var(--app-canvas, ${cutlab.color.charcoal})`;
const activeBg = "var(--app-active, rgba(45,140,151,0.18))";
const avatarSurface = `var(--app-avatar-surface, ${cutlab.color.slate})`;
const successColor = `var(--app-success, ${cutlab.color.success})`;
const warningColor = `var(--app-warning, ${cutlab.color.warning})`;

type PageKey =
  | "dashboard"
  | "projects"
  | "project"
  | "clients"
  | "timeline"
  | "calendar"
  | "files"
  | "media"
  | "resources"
  | "feedback"
  | "templates"
  | "reports"
  | "integrations"
  | "team"
  | "team-chat"
  | "settings"
  | "account"
  | "subscription"
  | "profile"
  | "profile-edit"
  | "organization-profile";
type TeamMember = {
  id: string;
  name: string;
  role: StoredTeamRole;
  email: string;
};
type TeamWorkspaceContract = {
  _id: string;
  ownerUserId: string;
  name: string;
  inviteCode: string;
  allowAllTeamProjects?: boolean;
  currencyCode?: string;
  timeZone?: string;
  defaultWorkflowTemplateId?: string;
};
type SettingsState = {
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
  integrationConfigs: Record<string, IntegrationConfig>;
  integrationLinks: IntegrationLinks;
  teamRole: SettingsTeamRole;
  teamMembers: TeamMember[];
  rolePermissions: Record<string, Record<string, boolean>>;
  theme: string;
  accentColor: string;
};
type ToastState = {
  message: string;
  tone: "success" | "info" | "warning";
};

const profile = getProfile(DEFAULT_PROFILE_ID);

const statusOptions: ProjectStatus[] = [...PROJECT_STATUS_VALUES];
// Upcoming capability: keep R2 disabled until the storage release is approved.
const R2_STORAGE_ENABLED = false;
const MAX_SAFE_PROJECT_FILE_BYTES = 20 * 1024 * 1024;

const teamRoleOptions = [...TEAM_ROLE_VALUES];
const currencyOptions = ["USD", "EUR", "GBP", "INR", "AED", "SAR"];
const currencyLabels: Record<string, string> = {
  USD: "USD ($)",
  EUR: "EUR (€)",
  GBP: "GBP (£)",
  INR: "INR (Rs)",
  AED: "AED (Dh)",
  SAR: "SAR (SR)",
};
const resourceCategories = [
  "Asset Folder",
  "Raw Footage",
  "Music / SFX",
  "Brand Assets",
  "Review Link",
  "Reference",
  "Other",
];

const permissionKeys = [
  "Create and edit projects",
  "Upload media and assets",
  "Manage project stages",
  "Invite team members",
  "Manage app settings",
];

const defaultRolePermissions: Record<string, Record<string, boolean>> = {
  Owner: Object.fromEntries(permissionKeys.map((k) => [k, true])),
  Editor: Object.fromEntries(
    permissionKeys.map((k) => [
      k,
      ["Create and edit projects", "Upload media and assets"].includes(k),
    ])
  ),
  Reviewer: Object.fromEntries(permissionKeys.map((k) => [k, false])),
};

const emptyIntegrationConfig: IntegrationConfig = {
  connected: false,
  account: "",
  folder: "",
  channel: "",
  workspace: "",
  webhookUrl: "",
  connectedAt: "",
  lastSyncAt: "",
};

const integrationNames = ["Google Drive", "Dropbox", "Slack", "Frame.io"];

const defaultIntegrationConfigs: Record<string, IntegrationConfig> =
  Object.fromEntries(
    integrationNames.map((name) => [name, { ...emptyIntegrationConfig }])
  );

const integrationDescriptions: Record<string, string> = {
  "Google Drive": "Save Google Drive folder and file links for project assets.",
  Dropbox: "Save Dropbox folder and delivery package links.",
  Slack: "Save Slack channel or message links for project discussion.",
  "Frame.io": "Save Frame.io review links and approval pages.",
};

const integrationIcons: Record<string, string> = {
  "Google Drive": "G",
  Dropbox: "D",
  Slack: "S",
  "Frame.io": "F",
};

const integrationColors: Record<string, string> = {
  "Google Drive": "var(--brand-google-drive)",
  Dropbox: "var(--brand-dropbox)",
  Slack: "var(--brand-slack)",
  "Frame.io": "var(--brand-frame-io)",
};

const defaultSettings: SettingsState = {
  studioName: "",
  profileName: "",
  profileUsername: "",
  profileTitle: "",
  profileBio: "",
  profileLocation: "",
  profileImageUrl: "",
  publicActiveProjects: 0,
  publicDeliveredEdits: 0,
  publicTurnaroundDays: 3,
  timeZone: "UTC",
  dateFormat: "Month Day, Year",
  weekStart: "Mon",
  currencyCode: "USD",
  customClients: [],
  clients: [],
  customProjectTemplates: [],
  projectTags: [...defaultProjectTags],
  salaryWorkType: defaultSalaryWorkType,
  salaryBatchSize: defaultSalaryBatchSize,
  salaryBatchAmount: defaultSalaryBatchAmount,
  projectStages: ["Planned", "In Progress", "Client Review", "Delivered"],
  notifications: {
    "Project updates": false,
    "Feedback received": false,
    "Upcoming deadlines": false,
    Mentions: false,
    "Weekly summary": false,
  },
  integrationConfigs: JSON.parse(JSON.stringify(defaultIntegrationConfigs)),
  integrationLinks: {},
  teamRole: "",
  teamMembers: [],
  rolePermissions: JSON.parse(JSON.stringify(defaultRolePermissions)),
  theme: "Dark",
  accentColor: defaultAccent,
};

const SettingsContext = createContext<SettingsState>(defaultSettings);

function useTrackerSettings() {
  return useContext(SettingsContext);
}

const emptyForm = (): WorkItem => ({
  id: "",
  profileId: profile.id,
  title: "",
  client: "",
  status: "Planned",
  workType: "Freelance",
  startDate: iso(todayDate()),
  dueDate: iso(todayDate()),
  earnings: 0,
  notes: "",
  integrationLinks: {},
});

export function TrackerApp({
  page,
  projectId,
  projectView,
  experienceMode = "workspace",
}: {
  page: PageKey;
  projectId?: string;
  projectView?: string;
  experienceMode?: "workspace" | "sample";
}) {
  const {
    items,
    setItems,
    settings,
    setSettings,
    resourceLinks,
    setResourceLinks,
    salaryBatches,
    salaryPlans,
    isAuthEnabled,
    isSignedIn,
    isAuthLoaded,
    toast,
    setToast,
    updateSalaryBatchPayment,
  } = useData();
  const workflow = useProjectWorkflow();
  const projectPort = useMemo(() => createProjectPort(setItems), [setItems]);
  const {
    groups: projectGroups,
    saveGroup: saveProjectGroup,
    setGroupArchived,
  } = useProjectGroups();
  const router = useRouter();
  const { openSignIn, openSignUp } = useOptionalAuth();
  const isSample = experienceMode === "sample";
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth();
  const shouldLoadTeamPermissions = Boolean(
    isSignedIn && isConvexAuthenticated
  );
  const teamData = useQuery(
    api.team.getMyWorkspace,
    shouldLoadTeamPermissions ? {} : "skip"
  );
  const workspaceDiscovery = useQuery(
    workspaceDiscoveryApi.list,
    shouldLoadTeamPermissions ? {} : "skip"
  );
  const {
    activeProjectView,
    setActiveProjectView,
    dialogOpen,
    setDialogOpen,
    newProjectOpen,
    setNewProjectOpen,
    newProjectTemplateId,
    setNewProjectTemplateId,
    projectGroupsOpen,
    setProjectGroupsOpen,
    projectGroupsScope,
    setProjectGroupsScope,
    projectStartScope,
    setProjectStartScope,
    editingId,
    setEditingId,
    detailProjectId,
    setDetailProjectId,
    deleteTarget,
    setDeleteTarget,
    form,
    setForm,
    formError,
    setFormError,
    projectLauncherTriggerRef,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    kindFilter,
    setKindFilter,
    clientFilter,
    setClientFilter,
    dueFilter,
    setDueFilter,
    billingFilter,
    setBillingFilter,
    sortKey,
    setSortKey,
    dashboardActivity,
    setDashboardActivity,
    localProjectActivity,
    setLocalProjectActivity,
  } = useProjectsApplicationState({
    projectId,
    projectView,
    sample: isSample,
    activityStorageKey: LOCAL_PROJECT_ACTIVITY_STORAGE_KEY,
    createEmptyForm: emptyForm,
  });
  const [authChoiceOpen, setAuthChoiceOpen] = useState(false);
  const [analyticsConsentOpen, setAnalyticsConsentOpen] = useState(false);
  const [onboardingVariant, setOnboardingVariant] =
    useState<OnboardingVariant>("v2");
  const onboardingStartedAt = useRef(Date.now());
  useEffect(() => {
    applyRootThemeVariables(settings);
  }, [settings]);

  useEffect(() => {
    if (isSample) {
      setOnboardingVariant("v2");
      trackOnboardingEvent("sample_studio_opened", {
        variant: "v2",
        entrySource: "first_run_dialog",
      });
      return;
    }
    setOnboardingVariant(resolveOnboardingVariant());
  }, [isSample]);

  useEffect(() => {
    if (typeof window === "undefined" || !isAuthLoaded || isSample) return;
    if (isSignedIn) {
      window.localStorage.setItem(AUTH_MODE_STORAGE_KEY, "account");
      setAuthChoiceOpen(false);
      return;
    }

    const savedMode = window.localStorage.getItem(AUTH_MODE_STORAGE_KEY);
    setAuthChoiceOpen(!savedMode);
  }, [isAuthLoaded, isSample, isSignedIn]);

  useEffect(() => {
    if (!authChoiceOpen) return;
    trackOnboardingEvent("onboarding_dialog_viewed", {
      variant: onboardingVariant,
      entrySource: "workspace_root",
    });
  }, [authChoiceOpen, onboardingVariant]);

  useEffect(() => {
    trackOptionalEvent("weekly_return", {
      mode: isSignedIn ? "account" : "local",
    });
  }, [isSignedIn]);

  const projects = useMemo(
    () =>
      items.filter(
        (item) => (item.profileId || DEFAULT_PROFILE_ID) === profile.id
      ),
    [items]
  );
  const personalProjects = useMemo(
    () => projects.filter((item) => !item.teamId),
    [projects]
  );

  const activeTeamMembers = useMemo(
    () =>
      teamData?.members.filter((member) => member.status === "active") ?? [],
    [teamData]
  );
  const teamDataLoading = Boolean(
    isSignedIn &&
    (isConvexAuthLoading || (isConvexAuthenticated && teamData === undefined))
  );
  const teamSyncUnavailable = Boolean(
    isSignedIn && !isConvexAuthLoading && !isConvexAuthenticated
  );
  const currentTeamId = teamData?.workspace?._id;
  const teamProjects = useMemo(
    () =>
      currentTeamId
        ? projects.filter((project) => project.teamId === currentTeamId)
        : [],
    [currentTeamId, projects]
  );
  const teamWorkspace = teamData?.workspace as
    TeamWorkspaceContract | undefined;
  const teamStats = useMemo(() => {
    const deliveredProjects = teamProjects.filter((project) =>
      isDoneStatus(project.status)
    );
    return {
      active: teamProjects.length - deliveredProjects.length,
      delivered: deliveredProjects.length,
      earned: deliveredProjects.reduce(
        (total, project) => total + safeMoneyValue(project.earnings),
        0
      ),
      salaryEdits: deliveredProjects.filter((project) =>
        isSalaryWorkType(project.workType, settings)
      ).length,
    };
  }, [settings, teamProjects]);
  const {
    canCreateTeamProjects,
    canCreateProjects,
    canEditProjects,
    canUpdateProjectStatus,
    canCommentProjects,
    canManagePortals,
    canManageFinance,
    canManageTeamProjects,
  } = resolveProjectPermissions({
    sample: isSample,
    teamConnected: Boolean(teamData),
    loading: teamDataLoading,
    unavailable: teamSyncUnavailable,
    role: teamData?.currentMember.role,
    permissions: teamData?.currentMember.permissions,
  });

  useEffect(() => {
    if (!teamWorkspace) return;
    const next = {
      ...settings,
      studioName: teamWorkspace.name,
      currencyCode: teamWorkspace.currencyCode || settings.currencyCode,
      timeZone: teamWorkspace.timeZone || settings.timeZone,
    };
    if (
      next.studioName === settings.studioName &&
      next.currencyCode === settings.currencyCode &&
      next.timeZone === settings.timeZone
    )
      return;
    setSettings((current) => ({
      ...current,
      studioName: next.studioName,
      currencyCode: next.currencyCode,
      timeZone: next.timeZone,
    }));
  }, [
    setSettings,
    settings.currencyCode,
    settings.studioName,
    settings.timeZone,
    teamWorkspace,
  ]);
  const detailProject = useMemo(
    () => items.find((item) => item.id === detailProjectId) ?? null,
    [detailProjectId, items]
  );
  const projectTagOptions = useMemo(
    () => projectWorkTypeOptions(settings, projects),
    [projects, settings]
  );
  const filterProjectTagOptions = useMemo(
    () => ["ALL", ...projectTagOptions],
    [projectTagOptions]
  );
  const clientRecords = useMemo(
    () =>
      mergeClientRecords(settings.clients, [
        ...settings.customClients,
        ...projects.flatMap((project) =>
          project.client ? [project.client] : []
        ),
      ]),
    [projects, settings.clients, settings.customClients]
  );
  const clientOptions = useMemo(
    () =>
      clientRecords
        .filter((client) => !client.archived)
        .map((client) => client.name),
    [clientRecords]
  );
  const clientFilterOptions = useMemo(
    () => ["ALL", ...clientOptions],
    [clientOptions]
  );
  const workflowTemplates = useMemo(
    () => [...PROJECT_TEMPLATES, ...settings.customProjectTemplates],
    [settings.customProjectTemplates]
  );
  const workspaceSearchRecords = useMemo(
    () =>
      buildWorkspaceSearchIndex({
        clients: clientRecords,
        groups: projectGroups,
        projects,
        outputs: workspaceDiscovery?.outputs ?? [],
        files: workspaceDiscovery?.files ?? [],
      }),
    [
      clientRecords,
      projectGroups,
      projects,
      workspaceDiscovery?.files,
      workspaceDiscovery?.outputs,
    ]
  );

  useEffect(() => {
    if (!teamWorkspace?.defaultWorkflowTemplateId) return;
    if (
      workflowTemplates.some(
        (template) => template.id === teamWorkspace.defaultWorkflowTemplateId
      )
    ) {
      setNewProjectTemplateId(teamWorkspace.defaultWorkflowTemplateId);
    }
  }, [teamWorkspace?.defaultWorkflowTemplateId, workflowTemplates]);

  useEffect(() => {
    if (JSON.stringify(settings.clients) === JSON.stringify(clientRecords))
      return;
    setSettings((current) => ({ ...current, clients: clientRecords }));
  }, [clientRecords, setSettings, settings.clients]);
  const isClientBillableProject = useCallback(
    (item: WorkItem) =>
      !isSalaryWorkType(item.workType, settings) &&
      isDoneStatus(item.status) &&
      safeMoneyValue(item.earnings) > 0,
    [settings]
  );
  const isProjectPaid = useCallback(
    (item: WorkItem) => isClientBillableProject(item) && Boolean(item.paid),
    [isClientBillableProject]
  );
  const isProjectUnpaid = useCallback(
    (item: WorkItem) => isClientBillableProject(item) && !item.paid,
    [isClientBillableProject]
  );
  const filteredProjects = useMemo(() => {
    const searched = projects.filter((item) => {
      const haystack =
        `${item.title} ${item.client || ""} ${item.notes} ${item.workType}`.toLowerCase();
      const matchesSearch =
        !query.trim() || haystack.includes(query.trim().toLowerCase());
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;
      const matchesKind =
        kindFilter === "ALL" ||
        item.workType.trim().toLowerCase() === kindFilter.toLowerCase();
      const matchesClient =
        clientFilter === "ALL" ||
        item.client?.trim().toLowerCase() === clientFilter.toLowerCase();
      const matchesDue = dueFilter === "ALL" || dueBucket(item) === dueFilter;
      const isPaid = isProjectPaid(item);
      const isUnpaid = isProjectUnpaid(item);
      const matchesBilling =
        billingFilter === "ALL" ||
        (billingFilter === "Paid" && isPaid) ||
        (billingFilter === "Unpaid" && isUnpaid);
      return (
        matchesSearch &&
        matchesStatus &&
        matchesKind &&
        matchesClient &&
        matchesDue &&
        matchesBilling
      );
    });

    return [...searched].sort((a, b) => {
      if (sortKey === "createdAt_asc") return createdTime(a) - createdTime(b);
      if (sortKey === "dueDate_asc")
        return (
          dateTime(a.dueDate || "9999-12-31") -
          dateTime(b.dueDate || "9999-12-31")
        );
      if (sortKey === "earnings_desc")
        return safeMoneyValue(b.earnings) - safeMoneyValue(a.earnings);
      if (sortKey === "earnings_asc")
        return safeMoneyValue(a.earnings) - safeMoneyValue(b.earnings);
      return createdTime(b) - createdTime(a);
    });
  }, [
    billingFilter,
    clientFilter,
    dueFilter,
    isProjectPaid,
    isProjectUnpaid,
    kindFilter,
    projects,
    query,
    sortKey,
    statusFilter,
  ]);

  const stats = useMemo(() => {
    const moneyReport = buildPayoutReport({
      projects: personalProjects,
      salaryBatches,
      salaryWorkType: settings.salaryWorkType,
      salaryBatchAmount: normalizedSalaryBatchAmount(
        settings.salaryBatchAmount
      ),
      profileName: settings.profileName,
      period: "all",
    });
    const unpaid = personalProjects.filter((item) =>
      isProjectUnpaid(item)
    ).length;
    const active = personalProjects.filter(
      (item) => !isDoneStatus(item.status)
    ).length;
    const salaryBatchSize = normalizedSalaryBatchSize(settings.salaryBatchSize);
    const deliveredSalaryProjects = personalProjects.filter(
      (item) =>
        isSalaryWorkType(item.workType, settings) && isDoneStatus(item.status)
    );
    const settledProjectIds = new Set(
      salaryBatches.flatMap((batch) => batch.projectIds ?? [])
    );
    const unsettledSalaryProjects = deliveredSalaryProjects
      .filter((project) => !settledProjectIds.has(project.id));
    const salaryEdits = deliveredSalaryProjects.length;
    const delivered = personalProjects.filter((item) =>
      isDoneStatus(item.status)
    );
    const avgTurnaroundDays = delivered.length
      ? Math.round(
          delivered.reduce(
            (total, item) => total + daysBetween(item.startDate, item.dueDate),
            0
          ) / delivered.length
        )
      : 0;
    return {
      total: personalProjects.length,
      active,
      unpaid,
      earned: moneyReport.earned,
      collected: moneyReport.collected,
      outstanding: moneyReport.outstanding,
      salaryEdits,
      salaryBatchProgress: unsettledSalaryProjects.length % salaryBatchSize,
      delivered: delivered.length,
      avgTurnaroundDays,
    };
  }, [
    isProjectUnpaid,
    personalProjects,
    salaryBatches,
    settings.profileName,
    settings.salaryBatchAmount,
    settings.salaryBatchSize,
    settings.salaryWorkType,
  ]);

  function rememberProjectLauncherTrigger() {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      projectLauncherTriggerRef.current = document.activeElement;
    }
  }

  function openNewProject(scope: "personal" | "team" = "personal") {
    if (scope === "team" && !canCreateTeamProjects) {
      notify("Your team role cannot create projects.", "warning");
      return;
    }
    if (scope === "team" && !currentTeamId) {
      notify(
        "Create or join a team workspace before adding team projects.",
        "warning"
      );
      return;
    }
    rememberProjectLauncherTrigger();
    setProjectStartScope(scope);
    setNewProjectTemplateId("relay-default-workflow");
    setNewProjectOpen(true);
  }

  function openBlankProject(scope: "personal" | "team" = projectStartScope) {
    rememberProjectLauncherTrigger();
    setProjectStartScope(scope);
    setNewProjectTemplateId("");
    setNewProjectOpen(true);
  }

  function notify(message: string, tone: ToastState["tone"] = "success") {
    setToast({ message, tone });
  }

  function logLocalProjectActivity(
    event: Omit<ProjectActivityEvent, "id" | "actorName" | "createdAt"> & {
      actorName?: string;
      createdAt?: string;
    }
  ) {
    setLocalProjectActivity((current) =>
      [
        {
          ...event,
          id: createId(),
          actorName: event.actorName ?? (settings.profileName || "Local user"),
          createdAt: event.createdAt ?? new Date().toISOString(),
        },
        ...current,
      ].slice(0, 500)
    );
  }

  function chooseLocalMode() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTH_MODE_STORAGE_KEY, "local");
    }
    setAuthChoiceOpen(false);
    if (getAnalyticsConsent() === "unknown") setAnalyticsConsentOpen(true);
    trackOnboardingEvent("workspace_mode_selected", {
      variant: onboardingVariant,
      mode: "local",
      elapsedMs: Date.now() - onboardingStartedAt.current,
    });
    notify("Using local mode on this device.", "info");
  }

  function launchAccountFlow(mode: "sign-up" | "sign-in") {
    if (!isAuthEnabled) {
      setAuthChoiceOpen(false);
      notify(
        "Sign-in is unavailable until Clerk and Convex are configured.",
        "warning"
      );
      return;
    }
    setAuthChoiceOpen(false);
    trackOnboardingEvent("workspace_mode_selected", {
      variant: onboardingVariant,
      mode: "account",
      elapsedMs: Date.now() - onboardingStartedAt.current,
    });
    if (mode === "sign-up") {
      openSignUp();
      return;
    }
    openSignIn();
  }

  function openTemplateProject(
    template: ProjectTemplate,
    scope: "personal" | "team" = projectStartScope
  ) {
    if (!canCreateProjects) {
      notify("Your team role cannot create projects.", "warning");
      return;
    }
    if (scope === "team" && (!canCreateTeamProjects || !currentTeamId)) {
      notify(
        "Your team role cannot create projects in this workspace.",
        "warning"
      );
      return;
    }
    rememberProjectLauncherTrigger();
    setProjectStartScope(scope);
    setNewProjectTemplateId(template.id);
    setNewProjectOpen(true);
  }

  function openEditProject(item: WorkItem) {
    if (item.teamId && !canEditProjects) {
      notify("Your team role cannot edit team projects.", "warning");
      return;
    }
    setEditingId(item.id);
    setForm(item);
    setFormError("");
    setDialogOpen(true);
  }

  function openProjectDetails(item: WorkItem) {
    if (isSample) {
      trackOnboardingEvent("sample_project_opened", {
        variant: "v2",
        entrySource: "sample_dashboard",
      });
    }
    router.push(projectHref({ projectId: item.id, sample: isSample }));
  }

  function canDeleteProject(project: WorkItem | null) {
    return projectCanBeDeleted({
      project,
      currentUserId: teamData?.currentMember.userId,
      canEdit: canEditProjects,
      canManageTeam: canManageTeamProjects,
    });
  }

  function requestDeleteProject(id: string) {
    const target = items.find((item) => item.id === id);
    if (target && !canDeleteProject(target)) {
      notify(
        "Only the project owner or a team owner can delete this team project.",
        "warning"
      );
      return;
    }
    if (target) setDeleteTarget(target);
  }

  const { archiveProject, updateProjectStatus } = useProjectController({
    projects: projectPort,
    canEditTeamProjects: canEditProjects,
    canUpdateTeamStatus: canUpdateProjectStatus,
    salaryWorkType: settings.salaryWorkType,
    currencyCode: settings.currencyCode,
    workflow,
    confirmDelivery: (message) => window.confirm(message),
    notify,
    onStatusChanged: (project, previousStatus) => {
      const status = project.status;
      if (isDoneStatus(status) && !isDoneStatus(previousStatus)) {
        trackOptionalEvent("project_delivered", {
          mode: isSignedIn ? "account" : "local",
        });
      }
      setDashboardActivity((current) => {
        const activity: DashboardActivity = {
          id: createId(),
          kind: isDoneStatus(status) ? "delivered" : "status",
          message: isDoneStatus(status)
            ? `${project.title} was delivered`
            : `${project.title} moved to ${status}`,
          projectId: project.id,
          createdAt: new Date().toISOString(),
        };
        return [activity, ...current].slice(0, 20);
      });
      logLocalProjectActivity({
        projectId: project.id,
        kind: "status_changed",
        message: `${project.title} status changed from ${previousStatus} to ${status}.`,
      });
    },
  });

  const createProject = useProjectCreationController({
    clients: clientRecords,
    projectGroups,
    workflowTemplates,
    salaryPlans,
    projectTags: settings.projectTags,
    salaryWorkType: settings.salaryWorkType,
    profileId: profile.id,
    baseNotes: defaultProjectNotes(settings),
    scope: projectStartScope,
    teamId: currentTeamId,
    ownerUserId: teamData?.currentMember.userId,
    projects: projectPort,
    notify,
    onCreated: (project) => {
      const activity: DashboardActivity = {
        id: createId(),
        kind: "created",
        message: `${project.title} was created`,
        projectId: project.id,
        createdAt: project.createdAt,
      };
      setDashboardActivity((current) => [activity, ...current].slice(0, 20));
      logLocalProjectActivity({
        projectId: project.id,
        kind: "project_created",
        message: `${project.title} was created.`,
        createdAt: project.createdAt,
      });
      trackOnboardingEvent("first_project_created", {
        variant: onboardingVariant,
        mode: isSignedIn ? "account" : "local",
        elapsedMs: Date.now() - onboardingStartedAt.current,
      });
      setNewProjectOpen(false);
      notify("Project created.");
      router.push(projectHref({ projectId: project.id }));
    },
  });

  function updateProjectPayment(project: WorkItem, paid: boolean) {
    if (project.teamId && !canManageFinance) {
      notify("Your team role cannot manage project payments.", "warning");
      return;
    }
    if (!isClientBillableProject(project)) {
      notify(
        "Only delivered billable client projects can be marked paid.",
        "warning"
      );
      return;
    }
    const paidDate = paid ? new Date().toISOString() : "";
    projectPort.update(project.id, (item) => ({ ...item, paid, paidDate }));
    logLocalProjectActivity({
      projectId: project.id,
      kind: "project_updated",
      message: `${project.title} was marked ${paid ? "paid" : "unpaid"}.`,
    });
    notify(`${project.title} marked ${paid ? "paid" : "unpaid"}.`);
  }

  function confirmDeleteProject() {
    if (!deleteTarget) return;
    projectPort.remove(deleteTarget.id);
    setLocalProjectActivity((current) =>
      current.filter((event) => event.projectId !== deleteTarget.id)
    );
    if (detailProjectId === deleteTarget.id) setDetailProjectId("");
    setDeleteTarget(null);
    notify("Project deleted.", "warning");
  }

  function saveProject() {
    const canonicalClient = canonicalClientName(
      form.client || "",
      clientOptions
    );
    const clientRecord =
      clientRecords.find(
        (client) => client.name.toLowerCase() === canonicalClient.toLowerCase()
      ) ?? mergeClientRecords([], [canonicalClient])[0];
    const normalizedWorkType = canonicalWorkType(
      form.workType,
      projectTagOptions
    );
    const normalizedForm = {
      ...form,
      client: canonicalClient,
      workType: normalizedWorkType,
      integrationLinks: normalizeProjectIntegrationLinks(form.integrationLinks),
    };
    const typeConfig = getTypeConfig(normalizedForm.workType, settings);
    const error = validateProject(
      normalizedForm,
      typeConfig,
      projectTagOptions
    );
    if (error) {
      setFormError(error);
      return;
    }
    const payload: WorkItem = {
      ...normalizedForm,
      title: normalizedForm.title.trim(),
      id: editingId || createId(),
      teamId: normalizedForm.teamId,
      ownerUserId:
        normalizedForm.ownerUserId ??
        (!editingId && normalizedForm.teamId
          ? teamData?.currentMember.userId
          : undefined),
      assigneeUserIds: normalizedForm.assigneeUserIds ?? [],
      createdAt: form.createdAt || new Date().toISOString(),
      profileId: profile.id,
      client: normalizedForm.client?.trim() || "",
      clientId: clientRecord?.id,
      notes: normalizedForm.notes.trim(),
      earnings:
        typeConfig.earningsMode === "batch"
          ? 0
          : safeMoneyValue(normalizedForm.earnings),
      paid:
        typeConfig.earningsMode === "batch"
          ? false
          : Boolean(normalizedForm.paid),
      paidDate:
        typeConfig.earningsMode === "batch" || !normalizedForm.paid
          ? ""
          : normalizedForm.paidDate || new Date().toISOString(),
      checklistCompleted: normalizeChecklistCompleted(
        normalizedForm.checklistItems,
        normalizedForm.checklistCompleted
      ),
      integrationLinks: normalizedForm.integrationLinks,
    };
    if (
      clientRecord &&
      !settings.clients.some((client) => client.id === clientRecord.id)
    ) {
      setSettings((current) => ({
        ...current,
        customClients: [...current.customClients, clientRecord.name],
        clients: [...current.clients, clientRecord],
      }));
    }
    if (editingId) projectPort.replace(payload);
    else projectPort.add(payload);
    if (!editingId) {
      trackOnboardingEvent("first_project_created", {
        variant: onboardingVariant,
        mode: isSignedIn ? "account" : "local",
        elapsedMs: Date.now() - onboardingStartedAt.current,
      });
    }
    setDashboardActivity((current) => {
      const activity: DashboardActivity = {
        id: createId(),
        kind: editingId ? "updated" : "created",
        message: editingId
          ? `${payload.title} was updated`
          : `${payload.title} was created`,
        projectId: payload.id,
        createdAt: new Date().toISOString(),
      };
      return [activity, ...current].slice(0, 20);
    });
    logLocalProjectActivity({
      projectId: payload.id,
      kind: editingId ? "project_updated" : "project_created",
      message: editingId
        ? `${payload.title} was updated.`
        : `${payload.title} was created.`,
      createdAt: editingId ? undefined : payload.createdAt,
    });
    setDialogOpen(false);
    setEditingId("");
    setForm(emptyForm());
    notify(editingId ? "Project updated." : "Project created.");
    if (!editingId) router.push(projectHref({ projectId: payload.id }));
  }

  function handleAddClient(
    client: Omit<Client, "id" | "archived">
  ): Client | null {
    const canonical = canonicalClientName(client.name, clientOptions, false);
    if (!canonical) return null;
    const existing = clientRecords.find(
      (record) => record.name.toLowerCase() === canonical.toLowerCase()
    );
    if (existing) return existing;
    const record = {
      ...mergeClientRecords([], [canonical])[0],
      ...client,
      name: canonical,
    };
    setSettings((current) => {
      if (current.clients.some((item) => item.id === record.id)) return current;
      return {
        ...current,
        customClients: [...current.customClients, canonical],
        clients: [...current.clients, record],
      };
    });
    notify(`Client "${canonical}" added.`);
    return record;
  }

  function handleUpdateClient(client: Client) {
    setSettings((current) => ({
      ...current,
      clients: current.clients.map((record) =>
        record.id === client.id ? client : record
      ),
    }));
    projectPort.renameClient(client.id, client.name);
    notify(
      client.archived
        ? `Client "${client.name}" archived.`
        : `Client "${client.name}" updated.`
    );
  }

  const pageContent =
    page === "project" ? (
      detailProject ? (
        <ProjectWorkspace
          project={detailProject}
          projectGroup={projectGroups.find(
            (group) => group.id === detailProject.projectGroupId
          )}
          settings={settings}
          view={activeProjectView}
          canEdit={!isSample && (canEditProjects || !detailProject.teamId)}
          canManagePayment={
            !isSample && (canManageFinance || !detailProject.teamId)
          }
          canManagePortal={
            !isSample && (canManagePortals || !detailProject.teamId)
          }
          canDelete={canDeleteProject(detailProject)}
          canUpdateStatus={
            !isSample &&
            (canUpdateProjectStatus || canEditProjects || !detailProject.teamId)
          }
          canComment={!isSample && canCommentProjects}
          teamMembers={activeTeamMembers}
          localActivity={localProjectActivity.filter(
            (event) => event.projectId === detailProject.id
          )}
          onBack={() => router.push(isSample ? "/sample-studio" : "/projects")}
          onViewChange={(view) => {
            setActiveProjectView(view);
            window.localStorage.setItem(
              "relay:last-project-workspace-view",
              view
            );
            router.replace(
              projectHref({
                projectId: detailProject.id,
                view,
                sample: isSample,
              })
            );
          }}
          onEdit={openEditProject}
          onDelete={(project) => requestDeleteProject(project.id)}
          onStatusChange={updateProjectStatus}
          onPaymentChange={updateProjectPayment}
        />
      ) : (
        <PageEmptyState
          icon={<FolderKanban />}
          title="Project not found"
          description="This Project does not exist or you cannot access it."
        />
      )
    ) : page === "dashboard" && personalProjects.length === 0 && !isSample ? (
      <FirstRunChecklist
        mode={isSignedIn ? "account" : "local"}
        onCreateProject={() => openNewProject("personal")}
      />
    ) : page === "dashboard" ? (
      <PrecisionDashboard
        settings={settings}
        stats={stats}
        projects={personalProjects}
        visibleProjects={filteredProjects.filter((project) => !project.teamId)}
        salaryBatches={salaryBatches}
        sessionActivity={dashboardActivity}
        teamActivity={teamData?.activity ?? []}
        teamName={teamData?.workspace?.name}
        teamLoading={teamDataLoading}
        query={query}
        setQuery={setQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        kindFilter={kindFilter}
        setKindFilter={setKindFilter}
        clientFilter={clientFilter}
        setClientFilter={setClientFilter}
        clientOptions={clientOptions}
        projectTagOptions={filterProjectTagOptions}
        dueFilter={dueFilter}
        setDueFilter={setDueFilter}
        billingFilter={billingFilter}
        setBillingFilter={setBillingFilter}
        sortKey={sortKey}
        setSortKey={setSortKey}
        onNewProject={() => openNewProject("personal")}
        onViewProject={openProjectDetails}
        onEditProject={openEditProject}
        onDeleteProject={requestDeleteProject}
        onMarkSalaryPayment={(batchId) => {
          updateSalaryBatchPayment(batchId, true);
          if (!isSample) notify("Salary payment marked as received.");
        }}
        canCreateProjects={canCreateProjects}
        canEditProjects={canEditProjects}
        canDeleteProject={canDeleteProject}
      />
    ) : page === "projects" ? (
      <PrecisionProjects
        settings={settings}
        personalProjects={personalProjects}
        teamProjects={teamProjects}
        teamName={teamData?.workspace?.name}
        currentUserId={teamData?.currentMember.userId ?? ""}
        currentUserRole={teamData?.currentMember.role}
        teamMembers={activeTeamMembers.map((member) => ({
          userId: member.userId,
          name: member.name,
        }))}
        allowAllTeamProjects={teamData?.workspace.allowAllTeamProjects ?? false}
        loading={!isAuthLoaded}
        error={
          teamSyncUnavailable
            ? "Team Projects are unavailable until cloud authentication reconnects."
            : undefined
        }
        onNewProject={openNewProject}
        onViewProject={openProjectDetails}
        onEditProject={openEditProject}
        onDeleteProject={requestDeleteProject}
        onArchiveProject={archiveProject}
        onUpdateProjectStatus={updateProjectStatus}
        canCreateProjects={canCreateProjects}
        canCreateTeamProjects={canCreateTeamProjects}
        canEditProjects={canEditProjects}
        canUpdateProjectStatus={canUpdateProjectStatus || canEditProjects}
        canDeleteProject={canDeleteProject}
        onManageProjectGroups={(scope) => {
          setProjectGroupsScope(scope);
          setProjectGroupsOpen(true);
        }}
      />
    ) : page === "clients" ? (
      <PrecisionClients
        projects={personalProjects}
        settings={settings}
        onAddClient={handleAddClient}
        onUpdateClient={handleUpdateClient}
        onViewProject={openProjectDetails}
      />
    ) : page === "timeline" ? (
      <PrecisionTimeline
        projects={personalProjects}
        onViewProject={openProjectDetails}
      />
    ) : page === "calendar" ? (
      <PrecisionCalendar
        projects={personalProjects}
        outputs={workspaceDiscovery?.outputs ?? []}
        settings={settings}
        onViewProject={openProjectDetails}
      />
    ) : page === "files" ? (
      <PrecisionFiles
        files={workspaceDiscovery?.files ?? []}
        projectTitles={Object.fromEntries(
          projects.map((project) => [project.id, project.title])
        )}
        loading={Boolean(isSignedIn && workspaceDiscovery === undefined)}
        onOpenProject={(projectId) => {
          const project = projects.find((item) => item.id === projectId);
          if (project) openProjectDetails(project);
        }}
      />
    ) : page === "media" ? (
      <PrecisionMedia
        projects={personalProjects}
        onViewProject={openProjectDetails}
      />
    ) : page === "resources" ? (
      <ResourcesDesignPage
        resources={resourceLinks}
        projects={personalProjects}
        setResources={setResourceLinks}
        notify={notify}
      />
    ) : page === "feedback" ? (
      <PrecisionFeedback
        projects={personalProjects}
        onViewProject={openProjectDetails}
      />
    ) : page === "templates" ? (
      <TemplatesDesignPage
        onUseBlank={() => openBlankProject("personal")}
        onUseTemplate={(template) => openTemplateProject(template, "personal")}
        canManageTemplates={!teamData || canManageTeamProjects}
      />
    ) : page === "reports" ? (
      <div className="grid gap-4">
        <PrecisionReports
          projects={projects}
          salaryBatches={salaryBatches}
          settings={settings}
          editors={activeTeamMembers.map((member) => ({
            userId: member.userId,
            name: member.name,
          }))}
          currentUserId={teamData?.currentMember.userId}
          canManageFinance={canManageFinance}
          onUpdateBatchPayment={updateSalaryBatchPayment}
        />
        {!teamData || teamData.currentMember.role === "Owner" ? (
          <SalaryPlansPanel
            settings={settings}
            projects={personalProjects}
            isOwner
          />
        ) : null}
      </div>
    ) : page === "integrations" ? (
      <IntegrationsDesignPage
        projects={personalProjects}
        settings={settings}
        setSettings={setSettings}
        notify={notify}
        onEditProject={openEditProject}
      />
    ) : page === "team" ? (
      <TeamDesignPage
        projects={projects}
        settings={settings}
        setSettings={setSettings}
      />
    ) : page === "team-chat" ? (
      <TeamChatPage />
    ) : page === "settings" ? (
      <SettingsDesignPage
        settings={settings}
        setSettings={setSettings}
        notify={notify}
        teamWorkspace={teamWorkspace}
        canManageWorkspace={Boolean(teamData?.currentMember.role === "Owner")}
      />
    ) : page === "account" ? (
      <AccountSettingsPage />
    ) : page === "subscription" ? (
      <SubscriptionPage />
    ) : page === "profile" ? (
      <ProfileDesignPage
        projects={personalProjects}
        stats={stats}
        settings={settings}
      />
    ) : page === "profile-edit" ? (
      <ProfileEditPage settings={settings} setSettings={setSettings} />
    ) : (
      <OrganizationProfilePage
        projects={teamProjects}
        settings={settings}
        stats={teamStats}
      />
    );

  const projectDialog = (
    <>
      <NewProjectDialog
        open={newProjectOpen}
        clients={clientRecords}
        projectGroups={projectGroups.filter(
          (group) =>
            group.teamId ===
            (projectStartScope === "team" ? currentTeamId : undefined)
        )}
        workflowTemplates={workflowTemplates}
        initialTemplateId={newProjectTemplateId}
        salaryPlanLabel={`${settings.salaryWorkType} Plan`}
        salaryPlans={
          isSignedIn
            ? projectStartScope === "team"
              ? []
              : salaryPlans
            : undefined
        }
        currencyCode={settings.currencyCode}
        returnFocusRef={projectLauncherTriggerRef}
        onCreateClient={(client) =>
          handleAddClient({ ...client, contactName: "", phone: "", notes: "" })
        }
        onClose={() => setNewProjectOpen(false)}
        onCreate={createProject}
      />
      <ProjectGroupsDialog
        open={projectGroupsOpen}
        teamId={projectGroupsScope === "team" ? currentTeamId : undefined}
        clients={clientRecords}
        groups={projectGroups}
        projects={
          projectGroupsScope === "team" ? teamProjects : personalProjects
        }
        currency={settings.currencyCode}
        onClose={() => setProjectGroupsOpen(false)}
        onSave={saveProjectGroup}
        onArchive={setGroupArchived}
      />
      <ProjectDialog
        open={dialogOpen}
        editing={Boolean(editingId)}
        returnFocusRef={projectLauncherTriggerRef}
        form={form}
        onFormChange={(next) => {
          setForm(next);
          if (formError) setFormError("");
        }}
        clientOptions={clientOptions}
        workTypeOptions={projectTagOptions}
        settings={settings}
        teamMembers={activeTeamMembers}
        integrationEditor={
          <IntegrationLinkManager
            title="Project Integrations"
            subtitle="Attach service links that belong only to this project."
            links={form.integrationLinks}
            emptyTitle="No project links"
            emptyBody="Add links to this project's folders, reviews, channels, or calendar events."
            onChange={(integrationLinks) =>
              setForm({ ...form, integrationLinks })
            }
          />
        }
        formError={formError}
        onClose={() => setDialogOpen(false)}
        onSave={saveProject}
      />
    </>
  );
  const deleteDialog = (
    <DeleteProjectDialog
      project={deleteTarget}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={confirmDeleteProject}
    />
  );
  const loadingStatus = !isAuthLoaded ? <AppLoadingStatus /> : null;

  if (page === "profile") {
    return (
      <div
        className="motion-enter min-h-dvh transition-colors"
        style={{ backgroundColor: canvas, color: ink }}
      >
        <SettingsContext.Provider value={settings}>
          {pageContent}
        </SettingsContext.Provider>
        {projectDialog}
        {deleteDialog}
        {loadingStatus}
        <WelcomeChoiceDialog
          open={authChoiceOpen}
          variant={onboardingVariant}
          onChooseLocal={chooseLocalMode}
          onCreateAccount={() => launchAccountFlow("sign-up")}
          onSignIn={() => launchAccountFlow("sign-in")}
        />
        <AnalyticsConsentDialog
          open={analyticsConsentOpen}
          onChoose={(consent) => {
            setAnalyticsConsent(consent);
            setAnalyticsConsentOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <>
      <WorkspaceShell
        page={page === "project" ? "projects" : page}
        settings={settings}
        onNewProject={() => openNewProject("personal")}
        canCreateProject={canCreateProjects}
        starterNavigation={!isSample && personalProjects.length === 0}
        showTeamNavigation={
          activeTeamMembers.length > 1 ||
          Boolean(
            teamData?.members.some((member) => member.status === "invited")
          ) ||
          settings.teamMembers.length > 0
        }
        searchRecords={workspaceSearchRecords}
        notificationSlot={<NotificationBell settings={settings} />}
      >
        {isSample ? <SampleModeBar /> : null}
        <div
          className="min-h-full transition-colors lg:h-full"
          style={{ backgroundColor: canvas, color: ink }}
        >
          <SettingsContext.Provider value={settings}>
            {pageContent}
          </SettingsContext.Provider>
        </div>
      </WorkspaceShell>
      <AppToast toast={toast} onClose={() => setToast(null)} />
      {projectDialog}
      {deleteDialog}
      {loadingStatus}
      <WelcomeChoiceDialog
        open={authChoiceOpen}
        variant={onboardingVariant}
        onChooseLocal={chooseLocalMode}
        onCreateAccount={() => launchAccountFlow("sign-up")}
        onSignIn={() => launchAccountFlow("sign-in")}
      />
      <AnalyticsConsentDialog
        open={analyticsConsentOpen}
        onChoose={(consent) => {
          setAnalyticsConsent(consent);
          setAnalyticsConsentOpen(false);
        }}
      />
    </>
  );
}

function AccountSettingsPage() {
  const { isAuthEnabled } = useData();
  const { isSignedIn, isLoaded, openSignIn, openSignUp } = useOptionalAuth();

  return (
    <WorkspacePage
      family="administration"
      className="[&_[data-slot=content-section]]:shadow-[var(--app-shadow-1)]"
    >
      <PageHeader
        eyebrow="Workspace / Account"
        title="Account Settings"
        description="Manage your private login details separately from your public Relay profile."
        actions={
          <PageToolbar
            primary={
              <OwnedBadge variant={isSignedIn ? "default" : "secondary"}>
                {isSignedIn ? "Signed in" : "Local mode"}
              </OwnedBadge>
            }
            secondary={
              isSignedIn ? (
                <OwnedButton asChild variant="outline">
                  <Link href="/profile/edit">
                    <Pencil aria-hidden="true" />
                    Edit public profile
                  </Link>
                </OwnedButton>
              ) : null
            }
          />
        }
      />
      <PageContent
        data-family-region="account-administration"
        className="space-y-5"
      >
        <ContentSection
          title="Private account"
          description="Authentication and account controls stay inside this signed-in area."
          bodyMode="flush"
          className="scroll-mt-6"
        >
          {!isLoaded ? (
            <div
              role="status"
              className="grid min-h-[220px] place-items-center p-6"
            >
              <div className="flex flex-col items-center gap-3 text-sm text-[var(--app-muted)]">
                <LoaderCircle
                  aria-hidden="true"
                  className="size-7 animate-spin text-[var(--app-accent)]"
                />
                <span>Loading account controls...</span>
              </div>
            </div>
          ) : !isSignedIn ? (
            <div
              className="grid max-w-[620px] gap-4 p-5 md:p-6"
              aria-labelledby="account-required-title"
            >
              <h2
                id="account-required-title"
                className="text-xl font-semibold text-foreground"
              >
                Account required
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Local mode does not have an account record, email, password, or
                connected login provider. Sign in or create an account to manage
                private account settings.
              </p>
              {isAuthEnabled ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <OwnedButton type="button" onClick={() => openSignUp()}>
                    Create account
                  </OwnedButton>
                  <OwnedButton
                    type="button"
                    variant="outline"
                    onClick={() => openSignIn()}
                  >
                    Sign in
                  </OwnedButton>
                </div>
              ) : (
                <p role="status" className="text-sm text-muted-foreground">
                  Account sync is not configured for this deployment. Use local
                  mode, or add the Clerk and Convex public settings to enable
                  accounts.
                </p>
              )}
            </div>
          ) : (
            <div className="max-h-[min(720px,calc(100dvh-13rem))] overflow-y-auto p-2.5 overscroll-contain md:p-3.5">
              <div>
                <UserProfile
                  routing="hash"
                  appearance={{
                    variables: { borderRadius: "6px" },
                    elements: {
                      rootBox: "w-full",
                      cardBox:
                        "w-full max-w-none rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] shadow-none",
                      card: "shadow-none",
                      navbar: "border-[var(--app-border)]",
                      pageScrollBox: "py-1",
                    },
                  }}
                />
              </div>
            </div>
          )}
        </ContentSection>

        <ContentSection
          title="Public profile"
          description="Keep the profile you share with clients separate from private authentication settings."
        >
          <div className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold">
                Profile visibility and presentation
              </p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Update your public name, handle, bio, location, and published
                work from the profile editor.
              </p>
            </div>
            {isSignedIn ? (
              <OwnedButton asChild variant="outline" className="shrink-0">
                <Link href="/profile/edit">
                  <Pencil aria-hidden="true" />
                  Edit public profile
                </Link>
              </OwnedButton>
            ) : isAuthEnabled ? (
              <OwnedButton
                type="button"
                variant="outline"
                onClick={() => openSignIn()}
                className="shrink-0"
              >
                Sign in to edit
              </OwnedButton>
            ) : (
              <span className="text-sm text-muted-foreground">
                Account sign-in is not configured.
              </span>
            )}
          </div>
        </ContentSection>
      </PageContent>
    </WorkspacePage>
  );
}

function AppToast({
  toast,
  onClose,
}: {
  toast: ToastState | null;
  onClose: () => void;
}) {
  const reduceMotion = useHydratedReducedMotion();
  const palette =
    toast?.tone === "warning"
      ? {
          bg: "var(--app-warning-bg, rgba(245,166,35,0.14))",
          fg: warningColor,
          border,
        }
      : toast?.tone === "info"
        ? { bg: activeBg, fg: accent, border }
        : {
            bg: "var(--app-success-bg, rgba(35,181,142,0.14))",
            fg: successColor,
            border,
          };

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast.message}
          initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }
          }
          transition={{
            duration: reduceMotion ? 0 : 0.18,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="app-toast-position fixed right-4 z-50 w-[min(360px,calc(100vw-32px))]"
        >
          <div
            role="status"
            className="flex max-w-[360px] items-center gap-3 rounded-md border px-3 py-2.5 shadow-[var(--app-shadow-2)]"
            style={{
              backgroundColor: palette.bg,
              borderColor: palette.border,
              color: palette.fg,
            }}
          >
            <p className="min-w-0 flex-1 text-[13px] font-semibold">
              {toast.message}
            </p>
            <OwnedButton
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Dismiss notification"
              onClick={onClose}
              className="shrink-0 hover:bg-current/10"
              style={{ color: palette.fg }}
            >
              <X aria-hidden="true" className="size-4" />
            </OwnedButton>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function AppLoadingStatus() {
  const reduceMotion = useHydratedReducedMotion();

  return (
    <div
      role="progressbar"
      aria-label="Loading application"
      aria-live="polite"
      className="fixed top-[86px] right-0 left-0 z-[1450] h-0.5 overflow-hidden bg-transparent lg:top-0 lg:left-[76px]"
    >
      <motion.span
        className="block h-full w-1/2 bg-[var(--app-accent)]"
        initial={reduceMotion ? false : { x: "-100%" }}
        animate={reduceMotion ? { x: "50%" } : { x: ["-100%", "200%"] }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 1.1, ease: "easeInOut", repeat: Infinity }
        }
      />
    </div>
  );
}

function WelcomeChoiceDialog({
  open,
  onChooseLocal,
  onCreateAccount,
  onSignIn,
}: {
  open: boolean;
  variant: OnboardingVariant;
  onChooseLocal: () => void;
  onCreateAccount: () => void;
  onSignIn: () => void;
}) {
  return (
    <OwnedDialog open={open} onOpenChange={() => {}}>
      <OwnedDialogContent
        showCloseButton={false}
        data-testid="welcome-choice-dialog"
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-[var(--app-border)] bg-[var(--app-panel)] p-5 text-[var(--app-ink)] sm:max-w-[880px] sm:p-6"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <OwnedDialogHeader>
          <OwnedDialogTitle className="text-2xl leading-tight sm:text-[28px]">
            Choose how to use Relay
          </OwnedDialogTitle>
          <OwnedDialogDescription>
            Keep work on this device, sync an account, or explore a read-only
            sample.
          </OwnedDialogDescription>
        </OwnedDialogHeader>
        <div className="grid gap-3 md:grid-cols-3">
          <section className="flex flex-col rounded-md bg-[var(--app-soft-panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Local Mode
            </p>
            <h3 className="mt-2 text-lg font-semibold">Work on this device</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Fast solo workspace with no account.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-[var(--app-warning)]">
              Stored in this browser. Clearing site data can remove your work.
            </p>
            <OwnedButton
              type="button"
              onClick={onChooseLocal}
              className="mt-4 w-full"
            >
              Use Local Mode
            </OwnedButton>
          </section>

          <section className="flex flex-col rounded-md bg-[var(--app-soft-panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Account
            </p>
            <h3 className="mt-2 text-lg font-semibold">Sync your workspace</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Create an account for supported cloud and Team features.
            </p>
            <OwnedButton
              type="button"
              variant="outline"
              onClick={onCreateAccount}
              className="mt-4 w-full"
            >
              Create account
            </OwnedButton>
          </section>

          <section className="flex flex-col rounded-md bg-[var(--app-soft-panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Sample Workspace
            </p>
            <h3 className="mt-2 text-lg font-semibold">
              Explore a real workflow
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Open realistic read-only projects, reviews, activity, and delivery
              data.
            </p>
            <OwnedButton asChild variant="outline" className="mt-4 w-full">
              <Link href="/sample-studio">Open Sample Workspace</Link>
            </OwnedButton>
          </section>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-sm text-muted-foreground">
          <p>Already have an account?</p>
          <OwnedButton type="button" variant="ghost" onClick={onSignIn}>
            Sign in
          </OwnedButton>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Account sync covers supported workspace records. Integrations store
          links and settings only. Read the{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms
          </Link>
          .
        </p>
      </OwnedDialogContent>
    </OwnedDialog>
  );
}

function ResourcesDesignPage({
  resources,
  projects,
  setResources,
  notify,
}: {
  resources: ResourceLink[];
  projects: WorkItem[];
  setResources: React.Dispatch<React.SetStateAction<ResourceLink[]>>;
  notify: (message: string, tone?: ToastState["tone"]) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<ResourceLink>(() => emptyResourceForm());
  const [error, setError] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceCategory, setResourceCategory] = useState("all");
  const sortedResources = [...resources].sort(
    (a, b) =>
      Date.parse(b.updatedAt || b.createdAt) -
      Date.parse(a.updatedAt || a.createdAt)
  );
  const visibleResources = sortedResources.filter((resource) => {
    const query = resourceSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [
        resource.title,
        resource.url,
        resource.notes,
        resource.category,
        projectName(resource.projectId),
      ].some((value) => value.toLowerCase().includes(query));
    const matchesCategory =
      resourceCategory === "all" || resource.category === resourceCategory;
    return matchesSearch && matchesCategory;
  });
  const linkedToProjects = resources.filter(
    (resource) => resource.projectId
  ).length;
  const projectOptions = ["General", ...projects.map((project) => project.id)];
  const projectLabels = Object.fromEntries(
    projects.map((project) => [project.id, project.title])
  );
  const projectSelectValue = form.projectId || "General";
  const safeProjectOptions =
    projectSelectValue && !projectOptions.includes(projectSelectValue)
      ? [projectSelectValue, ...projectOptions]
      : projectOptions;
  const safeProjectLabels =
    projectSelectValue &&
    !projectLabels[projectSelectValue] &&
    projectSelectValue !== "General"
      ? { ...projectLabels, [projectSelectValue]: "Deleted project" }
      : projectLabels;

  function emptyResourceForm(): ResourceLink {
    const now = new Date().toISOString();
    return {
      id: "",
      title: "",
      url: "",
      category: "Asset Folder",
      projectId: "",
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
  }

  function openNewResource() {
    setEditingId("");
    setForm(emptyResourceForm());
    setError("");
    setDialogOpen(true);
  }

  function openEditResource(resource: ResourceLink) {
    setEditingId(resource.id);
    setForm(resource);
    setError("");
    setDialogOpen(true);
  }

  function saveResource() {
    const title = form.title.trim();
    const url = form.url.trim();
    if (!title) {
      setError("Resource title is required.");
      return;
    }
    if (!isValidIntegrationUrl(url)) {
      setError("Enter a valid http or https URL.");
      return;
    }

    const now = new Date().toISOString();
    const payload: ResourceLink = {
      ...form,
      id: editingId || createId(),
      title,
      url,
      category: form.category.trim() || "Other",
      projectId: form.projectId,
      notes: form.notes.trim(),
      createdAt: form.createdAt || now,
      updatedAt: now,
    };
    setResources((current) =>
      editingId
        ? current.map((resource) =>
            resource.id === editingId ? payload : resource
          )
        : [payload, ...current]
    );
    setDialogOpen(false);
    setEditingId("");
    setForm(emptyResourceForm());
    notify(editingId ? "Resource updated." : "Resource added.");
  }

  function removeResource(id: string) {
    setResources((current) => current.filter((resource) => resource.id !== id));
    notify("Resource removed.", "warning");
  }

  function openResource(url: string) {
    if (typeof window === "undefined" || !isValidIntegrationUrl(url)) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function projectName(projectId: string) {
    return projects.find((project) => project.id === projectId)?.title ?? "";
  }

  return (
    <WorkspacePage family="library">
      <PageHeader
        eyebrow="Workspace / Resources"
        title="Resources"
        description="Store asset folders, reference links, review pages, and handoff resources."
        actions={
          <OwnedButton
            type="button"
            variant="outline"
            onClick={openNewResource}
          >
            <Plus aria-hidden="true" />
            New Resource
          </OwnedButton>
        }
      />

      <PageContent className="space-y-5">
        <MetricStrip columns={3}>
          <MetricItem
            label="Resources"
            value={resources.length}
            supporting="Saved asset and reference links"
          />
          <MetricItem
            label="Project Linked"
            value={linkedToProjects}
            supporting="Attached to tracked projects"
          />
          <MetricItem
            label="Categories"
            value={new Set(resources.map((resource) => resource.category)).size}
            supporting="Resource groups in use"
          />
        </MetricStrip>

        <PageToolbar
          data-family-toolbar="resources"
          primary={
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Link2
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--app-muted)]"
              />
              <OwnedInput
                aria-label="Search resources"
                value={resourceSearch}
                onChange={(event) => setResourceSearch(event.target.value)}
                placeholder="Search resources, links, or projects..."
                className="h-10 bg-[var(--app-control)] pl-9 shadow-none"
              />
            </div>
          }
          secondary={
            <OwnedSelect
              value={resourceCategory}
              onValueChange={setResourceCategory}
            >
              <OwnedSelectTrigger
                aria-label="Filter resources by category"
                className="h-10 w-full sm:w-44"
              >
                <OwnedSelectValue placeholder="All categories" />
              </OwnedSelectTrigger>
              <OwnedSelectContent position="popper">
                <OwnedSelectItem value="all">All categories</OwnedSelectItem>
                {resourceCategories.map((category) => (
                  <OwnedSelectItem key={category} value={category}>
                    {category}
                  </OwnedSelectItem>
                ))}
              </OwnedSelectContent>
            </OwnedSelect>
          }
        />

        <ContentSection
          title="Resource Library"
          description={
            resourceSearch || resourceCategory !== "all"
              ? `${visibleResources.length} matching resources`
              : "Manual links for now; this can later map to cloud storage APIs or OAuth providers."
          }
          metadata={
            <OwnedBadge
              variant="secondary"
              className="self-start rounded-md bg-primary/15 text-primary sm:self-auto"
            >
              {resources.length} saved
            </OwnedBadge>
          }
          bodyMode="flush"
        >
          <div className="divide-y divide-border">
            {visibleResources.length ? (
              visibleResources.map((resource) => (
                <article
                  key={resource.id}
                  className="grid items-start gap-4 px-4 py-4 transition-colors hover:bg-[var(--app-soft-panel)] focus-within:bg-[var(--app-soft-panel)] lg:grid-cols-[minmax(0,1.4fr)_160px_minmax(0,1fr)_140px]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] text-[var(--app-accent)]"
                      aria-hidden="true"
                    >
                      <Link2 className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {resource.title}
                        </h3>
                        <OwnedBadge
                          variant="secondary"
                          className="rounded-md text-[11px] font-medium"
                        >
                          {resource.category}
                        </OwnedBadge>
                      </div>
                      <p className="truncate text-xs text-[var(--app-muted)]">
                        {resource.url}
                      </p>
                      {resource.notes ? (
                        <p className="mt-1 text-xs leading-relaxed text-[var(--app-muted)]">
                          {resource.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground lg:text-foreground">
                    {resource.projectId
                      ? projectName(resource.projectId) || "Linked project"
                      : "General"}
                  </p>
                  <time
                    className="truncate text-xs text-[var(--app-muted)]"
                    dateTime={resource.updatedAt || resource.createdAt}
                  >
                    Updated{" "}
                    {formatDate(
                      (resource.updatedAt || resource.createdAt).slice(0, 10)
                    )}
                  </time>
                  <div
                    className="flex gap-1 lg:justify-end"
                    aria-label={`${resource.title} actions`}
                  >
                    <OwnedButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Open ${resource.title}`}
                      title="Open resource"
                      onClick={() => openResource(resource.url)}
                      className="text-primary"
                    >
                      <ExternalLink aria-hidden="true" />
                    </OwnedButton>
                    <OwnedButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${resource.title}`}
                      title="Edit resource"
                      onClick={() => openEditResource(resource)}
                    >
                      <Pencil aria-hidden="true" />
                    </OwnedButton>
                    <OwnedButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${resource.title}`}
                      title="Delete resource"
                      onClick={() => removeResource(resource.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 aria-hidden="true" />
                    </OwnedButton>
                  </div>
                </article>
              ))
            ) : (
              <PageEmptyState
                title={
                  resources.length
                    ? "No matching resources"
                    : "No resources yet"
                }
                description={
                  resources.length
                    ? "Try a different search or category filter."
                    : "Add asset folders, reference docs, cloud links, review URLs, or handoff resources."
                }
              />
            )}
          </div>
        </ContentSection>
      </PageContent>

      <OwnedDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <OwnedDialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-xl">
          <OwnedDialogHeader>
            <OwnedDialogTitle>
              {editingId ? "Edit Resource" : "New Resource"}
            </OwnedDialogTitle>
            <OwnedDialogDescription>
              Save a labeled link and optionally attach it to a project.
            </OwnedDialogDescription>
          </OwnedDialogHeader>
          <form
            noValidate
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveResource();
            }}
          >
            <FieldLayout
              label="Resource title"
              required
              error={
                error === "Resource title is required." ? error : undefined
              }
            >
              <OwnedInput
                value={form.title}
                onChange={(event) => {
                  setForm({ ...form, title: event.target.value });
                  setError("");
                }}
              />
            </FieldLayout>
            <FieldLayout
              label="URL"
              required
              error={
                error === "Enter a valid http or https URL." ? error : undefined
              }
            >
              <OwnedInput
                type="url"
                inputMode="url"
                value={form.url}
                placeholder="https://..."
                onChange={(event) => {
                  setForm({ ...form, url: event.target.value });
                  setError("");
                }}
              />
            </FieldLayout>
            <div className="grid gap-4 sm:grid-cols-2">
              <OwnedSelect
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <FieldLayout label="Category">
                  <OwnedSelectTrigger className="w-full">
                    <OwnedSelectValue />
                  </OwnedSelectTrigger>
                </FieldLayout>
                <OwnedSelectContent position="popper">
                  {resourceCategories.map((category) => (
                    <OwnedSelectItem key={category} value={category}>
                      {category}
                    </OwnedSelectItem>
                  ))}
                </OwnedSelectContent>
              </OwnedSelect>
              <OwnedSelect
                value={projectSelectValue}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    projectId: value === "General" ? "" : value,
                  })
                }
              >
                <FieldLayout label="Project">
                  <OwnedSelectTrigger className="w-full">
                    <OwnedSelectValue>
                      {safeProjectLabels[projectSelectValue] ??
                        projectSelectValue}
                    </OwnedSelectValue>
                  </OwnedSelectTrigger>
                </FieldLayout>
                <OwnedSelectContent position="popper">
                  {safeProjectOptions.map((projectId) => (
                    <OwnedSelectItem key={projectId} value={projectId}>
                      {safeProjectLabels[projectId] ?? projectId}
                    </OwnedSelectItem>
                  ))}
                </OwnedSelectContent>
              </OwnedSelect>
            </div>
            <FieldLayout label="Notes">
              <OwnedTextarea
                value={form.notes}
                rows={3}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </FieldLayout>
            <OwnedDialogFooter>
              <OwnedButton
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </OwnedButton>
              <OwnedButton type="submit">Save Resource</OwnedButton>
            </OwnedDialogFooter>
          </form>
        </OwnedDialogContent>
      </OwnedDialog>
    </WorkspacePage>
  );
}

type TemplateFormState = {
  id: string;
  name: string;
  description: string;
  projectType: string;
  workType: "channel" | "freelance";
  durationDays: number;
  workflowStagesText: string;
  deliverablesText: string;
  checklistText: string;
};

const emptyTemplateForm: TemplateFormState = {
  id: "",
  name: "",
  description: "",
  projectType: "",
  workType: "freelance",
  durationDays: 7,
  workflowStagesText:
    "Planned\nEditing\nClient Review\nRevisions\nApproved\nDelivered",
  deliverablesText: "Final master",
  checklistText: "Confirm brief\nCheck export settings",
};

function templateToForm(template: ProjectTemplate): TemplateFormState {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    projectType: template.projectType,
    workType: template.workType,
    durationDays: template.durationDays,
    workflowStagesText: template.workflowStages
      .map((stage) => stage.label)
      .join("\n"),
    deliverablesText: template.deliverables
      .map((item) => item.title)
      .join("\n"),
    checklistText: template.checklistItems.join("\n"),
  };
}

function linesFromText(value: string, limit: number) {
  return value
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function customTemplateFromForm(
  form: TemplateFormState,
  existing?: SavedProjectTemplate
): SavedProjectTemplate {
  const name = form.name.trim().slice(0, 80) || "Custom template";
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "template";
  const id = form.id || `custom-${slug}-${Date.now().toString(36)}`;
  const deliverableTitles = linesFromText(form.deliverablesText, 12);
  return {
    id,
    name,
    description:
      form.description.trim().slice(0, 220) ||
      "Reusable workflow for recurring client work.",
    projectType: form.projectType.trim().slice(0, 80) || "Custom project",
    workType: form.workType,
    durationDays: Math.max(
      1,
      Math.min(120, Math.floor(Number(form.durationDays) || 7))
    ),
    workflowStages: workflowStagesFromLabels(
      linesFromText(form.workflowStagesText, 12),
      existing?.workflowStages
    ),
    deliverables: (deliverableTitles.length
      ? deliverableTitles
      : ["Final master"]
    ).map((title) => ({
      title: title.slice(0, 120),
      category: "Deliverable" as FileCategory,
      initialStatus: "draft" as FileStatus,
    })),
    checklistItems: linesFromText(form.checklistText, 20),
    custom: true,
    updatedAt: new Date().toISOString(),
  };
}

function TemplatesDesignPage({
  onUseBlank,
  onUseTemplate,
  canManageTemplates,
}: {
  onUseBlank: () => void;
  onUseTemplate: (template: ProjectTemplate) => void;
  canManageTemplates: boolean;
}) {
  const { items, settings, setSettings } = useData();
  const [templateForm, setTemplateForm] =
    useState<TemplateFormState>(emptyTemplateForm);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const customTemplates = settings.customProjectTemplates ?? [];
  const templates = useMemo(
    () => [...PROJECT_TEMPLATES, ...customTemplates],
    [customTemplates]
  );

  function openBuilder(template?: ProjectTemplate) {
    setTemplateError("");
    setTemplateForm(
      template ? templateToForm(template) : { ...emptyTemplateForm, id: "" }
    );
    setBuilderOpen(true);
  }

  function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!templateForm.name.trim()) return;
    const previousTemplate = customTemplates.find(
      (template) => template.id === templateForm.id
    );
    const nextStages = workflowStagesFromLabels(
      linesFromText(templateForm.workflowStagesText, 12),
      previousTemplate?.workflowStages
    );
    const stageError = validateWorkflowStages(nextStages);
    if (stageError) {
      setTemplateError(stageError);
      return;
    }

    const nextTemplate = customTemplateFromForm(templateForm, previousTemplate);
    nextTemplate.archived = previousTemplate?.archived ?? false;
    if (
      previousTemplate &&
      items.some((item) => item.templateId === previousTemplate.id)
    ) {
      const nextStageIds = new Set(
        nextTemplate.workflowStages.map((stage) => stage.id)
      );
      const removedStage = previousTemplate.workflowStages.find(
        (stage) => !nextStageIds.has(stage.id)
      );
      if (removedStage) {
        setTemplateError(
          `Reassign Projects before removing the ${removedStage.label} stage.`
        );
        return;
      }
    }
    setSettings((current) => {
      const currentTemplates = current.customProjectTemplates ?? [];
      const exists = currentTemplates.some(
        (template) => template.id === nextTemplate.id
      );
      return {
        ...current,
        customProjectTemplates: exists
          ? currentTemplates.map((template) =>
              template.id === nextTemplate.id ? nextTemplate : template
            )
          : [nextTemplate, ...currentTemplates].slice(0, 24),
      };
    });
    setBuilderOpen(false);
  }

  function deleteTemplate(templateId: string) {
    if (items.some((item) => item.templateId === templateId)) {
      setTemplateError(
        "This template is in use. Reassign its Projects before deleting it."
      );
      return;
    }
    setSettings((current) => ({
      ...current,
      customProjectTemplates: (current.customProjectTemplates ?? []).filter(
        (template) => template.id !== templateId
      ),
    }));
  }

  function copyTemplate(template: ProjectTemplate) {
    const copy = {
      ...template,
      id: `custom-copy-${Date.now().toString(36)}`,
      name: `${template.name} Copy`,
      workflowStages: template.workflowStages.map((stage) => ({ ...stage })),
      deliverables: template.deliverables.map((item) => ({ ...item })),
      checklistItems: [...template.checklistItems],
      custom: true,
      updatedAt: new Date().toISOString(),
    };
    setSettings((current) => ({
      ...current,
      customProjectTemplates: [copy, ...current.customProjectTemplates].slice(
        0,
        24
      ),
    }));
  }

  function archiveTemplate(template: SavedProjectTemplate) {
    setSettings((current) => ({
      ...current,
      customProjectTemplates: current.customProjectTemplates.map((item) =>
        item.id === template.id ? { ...item, archived: !item.archived } : item
      ),
    }));
  }

  return (
    <WorkspacePage family="library">
      <PageHeader
        eyebrow="Workspace / Templates"
        title="Templates"
        description="Start with a practical editing workflow, or save your own recurring setup for the next project."
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <OwnedButton
              type="button"
              variant="outline"
              onClick={() => openBuilder()}
              disabled={!canManageTemplates}
            >
              <Plus aria-hidden="true" />
              Custom Template
            </OwnedButton>
            <OwnedButton type="button" variant="outline" onClick={onUseBlank}>
              <Plus aria-hidden="true" />
              Blank Project
            </OwnedButton>
          </div>
        }
      />
      <PageContent className="space-y-5">
        {templateError && !builderOpen ? (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {templateError}
          </p>
        ) : null}
        <ContentSection
          title="Template library"
          metadata={
            <OwnedBadge variant="secondary">
              {templates.length} templates
            </OwnedBadge>
          }
          aria-label="Project templates"
          bodyClassName="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {templates.map((template) => (
            <article
              key={template.id}
              data-slot="template-card"
              className="group flex min-h-[250px] flex-col justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-soft-panel)] p-4 text-foreground shadow-[var(--app-shadow-1)] transition-[background-color,border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[var(--app-strong-border)] hover:bg-[var(--app-hover)] hover:shadow-[var(--app-shadow-2)] focus-within:border-[var(--app-accent)]"
            >
              <div>
                <header className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">
                        {template.name}
                      </h2>
                      <OwnedBadge
                        variant="secondary"
                        className="rounded-md text-[10px] uppercase tracking-wide"
                      >
                        {template.archived
                          ? "Archived"
                          : template.custom
                            ? "Custom"
                            : "Built-in"}
                      </OwnedBadge>
                    </div>
                    <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-accent)]">
                    <FileText aria-hidden="true" className="size-4" />
                  </span>
                </header>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-[var(--app-border)] py-3 text-xs">
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--app-muted)]">
                      Project type
                    </dt>
                    <dd className="mt-1 font-semibold text-[var(--app-highlight)]">
                      {template.projectType}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--app-muted)]">
                      Setup time
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {template.durationDays} days
                    </dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-muted-foreground">
                      Workflow preview
                    </h3>
                    <span className="font-mono text-[10px] text-[var(--app-muted)]">
                      {template.workflowStages.length} stages
                    </span>
                  </div>
                  <div
                    className="mt-2 flex flex-wrap items-center gap-1.5"
                    aria-label={`${template.name} workflow stages`}
                    role="list"
                  >
                    {(template.workflowStages.length
                      ? template.workflowStages
                      : [
                          {
                            id: "empty",
                            label: "Add stages after creating the project",
                            purpose: "planned" as const,
                          },
                        ]
                    )
                      .slice(0, 4)
                      .map((stage, index) => (
                        <span
                          key={`${template.id}-${stage.id}-${index}`}
                          className="inline-flex items-center gap-1.5"
                        >
                          <span
                            role="listitem"
                            className="rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] px-2 py-1 text-[11px] text-foreground"
                          >
                            {stage.label}
                          </span>
                          {index <
                          Math.min(template.workflowStages.length, 4) - 1 ? (
                            <span
                              aria-hidden="true"
                              className="text-[var(--app-muted)]"
                            >
                              →
                            </span>
                          ) : null}
                        </span>
                      ))}
                    {template.workflowStages.length > 4 ? (
                      <span className="text-[11px] text-[var(--app-muted)]">
                        +{template.workflowStages.length - 4}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {template.deliverables.length} deliverables ·{" "}
                    {template.checklistItems.length} checklist items
                  </p>
                </div>
              </div>

              <footer className="mt-5 flex flex-wrap items-center justify-between gap-2">
                <OwnedButton
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => onUseTemplate(template)}
                  disabled={template.archived}
                >
                  Use template
                  <Plus aria-hidden="true" />
                </OwnedButton>
                <OwnedButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Copy ${template.name} template`}
                  onClick={() => copyTemplate(template)}
                  disabled={!canManageTemplates}
                >
                  <Copy aria-hidden="true" />
                  Copy
                </OwnedButton>
                {template.custom && canManageTemplates ? (
                  <div className="flex items-center gap-1">
                    <OwnedButton
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Edit ${template.name} template`}
                      onClick={() => openBuilder(template)}
                    >
                      <Pencil aria-hidden="true" />
                      Edit
                    </OwnedButton>
                    <OwnedButton
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => archiveTemplate(template)}
                    >
                      {template.archived ? "Restore" : "Archive"}
                    </OwnedButton>
                    <OwnedButton
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${template.name} template`}
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 aria-hidden="true" />
                      Delete
                    </OwnedButton>
                  </div>
                ) : null}
              </footer>
            </article>
          ))}
        </ContentSection>
      </PageContent>

      <OwnedDialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <OwnedDialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-3xl">
          <OwnedDialogHeader>
            <OwnedDialogTitle>
              {templateForm.id ? "Edit Custom Template" : "New Custom Template"}
            </OwnedDialogTitle>
            <OwnedDialogDescription>
              Save a reusable project setup. Enter one workflow stage,
              deliverable, or checklist item per line.
            </OwnedDialogDescription>
          </OwnedDialogHeader>

          <form className="grid gap-5" onSubmit={saveTemplate}>
            <div className="grid gap-4 md:grid-cols-2">
              <FieldLayout label="Template name" required>
                <OwnedInput
                  value={templateForm.name}
                  maxLength={80}
                  onChange={(event) =>
                    setTemplateForm({
                      ...templateForm,
                      name: event.target.value,
                    })
                  }
                />
              </FieldLayout>
              <FieldLayout label="Project type">
                <OwnedInput
                  value={templateForm.projectType}
                  maxLength={80}
                  onChange={(event) =>
                    setTemplateForm({
                      ...templateForm,
                      projectType: event.target.value,
                    })
                  }
                />
              </FieldLayout>
            </div>

            <FieldLayout label="Description">
              <OwnedInput
                value={templateForm.description}
                maxLength={220}
                onChange={(event) =>
                  setTemplateForm({
                    ...templateForm,
                    description: event.target.value,
                  })
                }
              />
            </FieldLayout>

            <div className="grid gap-4 md:grid-cols-2">
              <OwnedSelect
                value={templateForm.workType}
                onValueChange={(value) =>
                  setTemplateForm({
                    ...templateForm,
                    workType: value as "channel" | "freelance",
                  })
                }
              >
                <FieldLayout label="Work type">
                  <OwnedSelectTrigger className="w-full">
                    <OwnedSelectValue />
                  </OwnedSelectTrigger>
                </FieldLayout>
                <OwnedSelectContent position="popper">
                  <OwnedSelectItem value="freelance">Freelance</OwnedSelectItem>
                  <OwnedSelectItem value="channel">Channel</OwnedSelectItem>
                </OwnedSelectContent>
              </OwnedSelect>

              <FieldLayout label="Duration days">
                <OwnedInput
                  type="number"
                  min={1}
                  max={120}
                  step={1}
                  value={templateForm.durationDays}
                  onChange={(event) =>
                    setTemplateForm({
                      ...templateForm,
                      durationDays: Number(event.target.value),
                    })
                  }
                />
              </FieldLayout>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FieldLayout label="Workflow stages" description="One per line">
                <OwnedTextarea
                  value={templateForm.workflowStagesText}
                  rows={5}
                  onChange={(event) =>
                    setTemplateForm({
                      ...templateForm,
                      workflowStagesText: event.target.value,
                    })
                  }
                />
              </FieldLayout>
              <FieldLayout label="Deliverables" description="One per line">
                <OwnedTextarea
                  value={templateForm.deliverablesText}
                  rows={5}
                  onChange={(event) =>
                    setTemplateForm({
                      ...templateForm,
                      deliverablesText: event.target.value,
                    })
                  }
                />
              </FieldLayout>
              <FieldLayout label="Checklist" description="One per line">
                <OwnedTextarea
                  value={templateForm.checklistText}
                  rows={5}
                  onChange={(event) =>
                    setTemplateForm({
                      ...templateForm,
                      checklistText: event.target.value,
                    })
                  }
                />
              </FieldLayout>
            </div>

            {templateError ? (
              <p role="alert" className="text-sm text-destructive">
                {templateError}
              </p>
            ) : null}
            <OwnedDialogFooter>
              <OwnedButton
                type="button"
                variant="outline"
                onClick={() => setBuilderOpen(false)}
              >
                Cancel
              </OwnedButton>
              <OwnedButton type="submit" disabled={!templateForm.name.trim()}>
                Save Template
              </OwnedButton>
            </OwnedDialogFooter>
          </form>
        </OwnedDialogContent>
      </OwnedDialog>
    </WorkspacePage>
  );
}

function TeamDesignPage({
  projects,
  settings,
}: {
  projects: WorkItem[];
  settings: SettingsState;
  setSettings: (settings: SettingsState) => void;
}) {
  const {
    isSignedIn,
    isLoaded: isUserLoaded,
    openSignIn,
    openSignUp,
  } = useOptionalAuth();
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth();
  const teamData = useQuery(
    api.team.getMyWorkspace,
    isConvexAuthenticated ? {} : "skip"
  );
  const createWorkspace = useMutation(api.team.createWorkspace);
  const joinWorkspace = useMutation(api.team.joinWorkspace);
  const inviteMember = useMutation(api.team.inviteMember);
  const updateMemberRole = useMutation(api.team.updateMemberRole);
  const updateMemberPermissions = useMutation(teamApi.updateMemberPermissions);
  const transferOwnership = useMutation(teamApi.transferOwnership);
  const normalizeLegacyRoles = useMutation(api.team.normalizeLegacyRoles);
  const removeMember = useMutation(api.team.removeMember);
  const leaveWorkspace = useMutation(api.team.leaveWorkspace);
  const addProjectComment = useMutation(api.team.addProjectComment);
  const markNotificationRead = useMutation(api.team.markNotificationRead);
  const markAllNotificationsRead = useMutation(
    api.team.markAllNotificationsRead
  );
  const [workspaceName, setWorkspaceName] = useState(
    settings.studioName || "Relay Team"
  );
  const [inviteCode, setInviteCode] = useState("");
  const [inviteForm, setInviteForm] = useState({ email: "", role: "Editor" });
  const [commentBody, setCommentBody] = useState("");
  const [commentTimecode, setCommentTimecode] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [teamError, setTeamError] = useState("");
  const [inviteCopyLabel, setInviteCopyLabel] = useState("Copy Invite Code");
  const [busyAction, setBusyAction] = useState("");
  const teamId = teamData?.workspace?._id;
  const teamProjects = useMemo(
    () =>
      teamId ? projects.filter((project) => project.teamId === teamId) : [],
    [projects, teamId]
  );
  const teamProjectTitles = useMemo(
    () =>
      Object.fromEntries(
        teamProjects.map((project) => [project.id, project.title])
      ),
    [teamProjects]
  );
  const clients = buildClientSummaries(teamProjects, settings.customClients);
  const selectedProject =
    teamProjects.find((project) => project.id === selectedProjectId) ??
    teamProjects[0] ??
    null;
  const projectComments = useQuery(
    api.team.listProjectComments,
    isConvexAuthenticated && teamId && selectedProject
      ? { teamId, projectId: selectedProject.id }
      : "skip"
  );
  const activeMembers =
    teamData?.members.filter((member) => member.status === "active") ?? [];
  const pendingInvites =
    teamData?.members.filter((member) => member.status === "invited") ?? [];
  const unreadNotifications =
    teamData?.notifications.filter((notification) => !notification.read)
      .length ?? 0;
  const canManageTeam = Boolean(teamData?.currentMember.permissions.manageTeam);
  const canCommentProjects = Boolean(
    teamData?.currentMember.permissions.commentProjects
  );
  const canLeaveWorkspace = Boolean(
    teamData && teamData.currentMember.role !== "Owner"
  );
  const inviteCodeIsValid = TEAM_INVITE_CODE_PATTERN.test(inviteCode.trim());
  const inviteEmailIsValid = isValidEmail(inviteForm.email);

  function displayTeamRole(role: string) {
    return role === "Reviewer" ? "Viewer" : role;
  }

  useEffect(() => {
    if (!teamProjects.length) {
      if (selectedProjectId) setSelectedProjectId("");
      return;
    }
    if (!teamProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(teamProjects[0].id);
    }
  }, [selectedProjectId, teamProjects]);

  useEffect(() => {
    if (
      !teamData?.workspace ||
      !canManageTeam ||
      !teamData.members.some((member) => member.role === "Client")
    )
      return;
    void normalizeLegacyRoles({ teamId: teamData.workspace._id }).catch(
      (error) => {
        setTeamError(
          error instanceof Error
            ? error.message
            : "Legacy team roles could not be updated."
        );
      }
    );
  }, [canManageTeam, normalizeLegacyRoles, teamData]);

  async function runTeamAction(label: string, action: () => Promise<unknown>) {
    setBusyAction(label);
    setTeamError("");
    try {
      await action();
    } catch (error) {
      setTeamError(
        error instanceof Error ? error.message : "Team action failed."
      );
    } finally {
      setBusyAction("");
    }
  }

  function formatActivityTime(value: string) {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  async function copyInviteCode(code: string) {
    const copied = await copyText(code);
    setInviteCopyLabel(copied ? "Copied" : "Copy Failed");
    window.setTimeout(() => setInviteCopyLabel("Copy Invite Code"), 1800);
  }

  function teamProjectLabel(projectId?: string) {
    if (!projectId) return "";
    return teamProjectTitles[projectId] ?? "Deleted team project";
  }

  function showTeamProject(projectId?: string) {
    if (!projectId || !teamProjectTitles[projectId]) return;
    setSelectedProjectId(projectId);
  }

  return (
    <WorkspacePage family="administration">
      <PageHeader
        eyebrow="Workspace / Team"
        title="Team"
        description="Manage members, shared project comments, notifications, and workspace activity."
      />
      <PageContent className="space-y-5">
        <MetricStrip columns={4}>
          {[
            {
              label: "Active members",
              value: String(activeMembers.length),
              helper: `${pendingInvites.length} pending invite${pendingInvites.length === 1 ? "" : "s"}`,
              icon: Users,
              highlighted: true,
            },
            {
              label: "Team projects",
              value: String(teamProjects.length),
              helper: "Shared production work",
              icon: FolderKanban,
            },
            {
              label: "Client contacts",
              value: String(clients.length),
              helper: "From shared projects",
              icon: UserRound,
            },
            {
              label: "Unread updates",
              value: String(unreadNotifications),
              helper: "Mentions and activity",
              icon: Bell,
              highlighted: unreadNotifications > 0,
            },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <MetricItem
                key={metric.label}
                label={metric.label}
                value={metric.value}
                supporting={metric.helper}
                action={
                  <span
                    className={
                      metric.highlighted
                        ? "rounded-md bg-primary/15 p-2 text-primary"
                        : "rounded-md bg-muted p-2 text-muted-foreground"
                    }
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                }
              />
            );
          })}
        </MetricStrip>

        {teamError ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive shadow-sm"
          >
            {teamError}
          </div>
        ) : null}

        {!isUserLoaded ? (
          <ContentSection
            bodyClassName="flex min-h-28 items-center gap-3 p-6 text-sm text-[var(--app-muted)]"
            role="status"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-5 animate-spin text-primary"
            />
            Checking account status...
          </ContentSection>
        ) : !isSignedIn ? (
          <ContentSection
            title="Team access"
            description="Shared workspaces keep members, project comments, notifications, activity, and chat in sync."
            className="shadow-[var(--app-shadow-1)]"
          >
            <div className="max-w-3xl">
              <h2 className="text-xl font-semibold leading-tight md:text-2xl">
                Team workspaces require an account
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Local mode is available for solo tracking, but invites, shared
                projects, comments, notifications, activity, and chat need Clerk
                sign-in so Convex can sync the right team workspace.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <OwnedButton type="button" onClick={() => openSignUp()}>
                  Create Account
                </OwnedButton>
                <OwnedButton
                  type="button"
                  variant="outline"
                  onClick={() => openSignIn()}
                >
                  Sign In
                </OwnedButton>
              </div>
            </div>
          </ContentSection>
        ) : isConvexAuthLoading ? (
          <ContentSection
            bodyClassName="flex min-h-28 items-center gap-3 p-6 text-sm text-[var(--app-muted)]"
            role="status"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-5 animate-spin text-primary"
            />
            Connecting your account to Team sync...
          </ContentSection>
        ) : !isConvexAuthenticated ? (
          <ContentSection
            role="alert"
            className="border-destructive/50 bg-destructive/10 text-destructive"
            bodyClassName="p-6 shadow-sm md:p-8"
          >
            <h2 className="text-xl font-semibold">
              Team sync is not connected
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              Clerk sign-in is loaded, but Convex did not receive an
              authenticated token. Check `convex/auth.config.ts`, the Clerk JWT
              template audience, and the Clerk issuer environment variables
              before running the two-account Team smoke test.
            </p>
          </ContentSection>
        ) : teamData === undefined ? (
          <ContentSection
            bodyClassName="flex min-h-28 items-center gap-3 p-6 text-sm text-[var(--app-muted)]"
            role="status"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-5 animate-spin text-primary"
            />
            Loading team workspace...
          </ContentSection>
        ) : !teamData ? (
          <div className="grid gap-4 md:grid-cols-2">
            <ContentSection className="md:col-span-2" bodyMode="flush">
              <EmptyPanel
                title="Invite your team"
                body="Create a shared workspace or join one with an invite code to start collaborating."
                assetKey="team"
              />
            </ContentSection>
            <ContentSection
              title="Create a workspace"
              description="Owners can invite up to two members. Projects, comments, notifications, activity, and chat sync through Convex."
            >
              <FieldLayout
                className="mt-5"
                label="Workspace name"
                description={`${workspaceName.length}/${TEAM_WORKSPACE_NAME_LIMIT} characters`}
              >
                <OwnedInput
                  value={workspaceName}
                  {...{ maxLength: TEAM_WORKSPACE_NAME_LIMIT }}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                />
              </FieldLayout>
              <OwnedButton
                type="button"
                className="mt-4"
                disabled={Boolean(busyAction)}
                onClick={() =>
                  runTeamAction("create", () =>
                    createWorkspace({ name: workspaceName })
                  )
                }
              >
                Create Team Workspace
              </OwnedButton>
            </ContentSection>
            <ContentSection
              title="Join a workspace"
              description="Use the six-character code from your team owner. Your signed-in email must match a pending invite."
            >
              <FieldLayout
                className="mt-5"
                label="Invite code"
                description="Enter the six-character code from your team owner."
                error={
                  inviteCode.trim() && !inviteCodeIsValid
                    ? "Invite code must contain six letters or numbers."
                    : undefined
                }
              >
                <OwnedInput
                  value={inviteCode}
                  maxLength={6}
                  autoCapitalize="characters"
                  onChange={(event) =>
                    setInviteCode(
                      event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                    )
                  }
                />
              </FieldLayout>
              <OwnedButton
                type="button"
                variant="outline"
                className="mt-4"
                disabled={Boolean(busyAction) || !inviteCodeIsValid}
                onClick={() =>
                  runTeamAction("join", () => joinWorkspace({ inviteCode }))
                }
              >
                Join Workspace
              </OwnedButton>
            </ContentSection>
          </div>
        ) : (
          <SplitPane
            data-slot="team-administration"
            ratio="supporting"
            primary={
              <div className="grid min-w-0 content-start gap-4">
                <ContentSection
                  title={teamData.workspace.name}
                  description={
                    canManageTeam ? (
                      <span>
                        Invite code{" "}
                        <span className="font-mono font-bold tracking-widest text-[var(--app-highlight)]">
                          {teamData.workspace.inviteCode}
                        </span>
                      </span>
                    ) : (
                      "Invite code is visible to team owners only."
                    )
                  }
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      <OwnedBadge variant="secondary">
                        {displayTeamRole(teamData.currentMember.role)} access
                      </OwnedBadge>
                      {canManageTeam ? (
                        <OwnedButton
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyInviteCode(teamData.workspace.inviteCode)
                          }
                        >
                          <Copy aria-hidden="true" />
                          {inviteCopyLabel}
                        </OwnedButton>
                      ) : null}
                      {canLeaveWorkspace ? (
                        <OwnedButton
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={Boolean(busyAction)}
                          onClick={() =>
                            runTeamAction("leave", () =>
                              leaveWorkspace({ teamId: teamData.workspace._id })
                            )
                          }
                          className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          Leave Workspace
                        </OwnedButton>
                      ) : null}
                    </div>
                  }
                  bodyMode="flush"
                >
                  <div className="max-h-[min(560px,calc(100dvh-21rem))] divide-y divide-[var(--app-border)] overflow-y-auto overscroll-contain">
                    {teamData.members.map((member) => (
                      <article
                        key={member._id}
                        className="flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold">
                              {member.name}
                            </h3>
                            <OwnedBadge
                              variant="outline"
                              className="rounded-md text-[10px]"
                            >
                              {displayTeamRole(member.role)}
                            </OwnedBadge>
                            <OwnedBadge
                              variant="secondary"
                              className={cn(
                                "rounded-md",
                                member.status === "active"
                                  ? "bg-[var(--status-success-bg)] text-[var(--status-success)]"
                                  : "bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                              )}
                            >
                              {member.status}
                            </OwnedBadge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {member.email || "No email on profile"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          {canManageTeam && member.role !== "Owner" ? (
                            <div className="w-full sm:w-40">
                              <ProjectSelect
                                label="Role"
                                value={displayTeamRole(member.role)}
                                options={teamRoleOptions
                                  .filter((role) => role !== "Owner")
                                  .map(displayTeamRole)}
                                onChange={(role) =>
                                  runTeamAction("role", () =>
                                    updateMemberRole({
                                      teamId: teamData.workspace._id,
                                      memberId: member._id,
                                      role: (role === "Viewer"
                                        ? "Reviewer"
                                        : role) as "Editor" | "Reviewer",
                                    })
                                  )
                                }
                                compact
                              />
                            </div>
                          ) : (
                            Object.entries(member.permissions)
                              .filter(([, enabled]) => enabled)
                              .slice(0, 4)
                              .map(([permission]) => (
                                <OwnedBadge
                                  key={permission}
                                  variant="secondary"
                                  className="rounded-md text-[10px]"
                                >
                                  {permission}
                                </OwnedBadge>
                              ))
                          )}
                          {canManageTeam && member.role !== "Owner" ? (
                            <div className="grid w-full gap-2 sm:grid-cols-2">
                              {TEAM_MEMBER_PERMISSION_LABELS.map(
                                ([permission, label]) => (
                                  <label
                                    key={permission}
                                    className="flex items-center gap-2 text-xs text-muted-foreground"
                                  >
                                    <OwnedSwitch
                                      checked={Boolean(
                                        member.permissions[permission]
                                      )}
                                      aria-label={`${label} for ${member.name}`}
                                      onCheckedChange={(checked) =>
                                        runTeamAction("permission", () =>
                                          updateMemberPermissions({
                                            teamId: teamData.workspace._id,
                                            memberId: member._id,
                                            permissions: {
                                              ...member.permissions,
                                              [permission]: checked,
                                            },
                                          })
                                        )
                                      }
                                    />
                                    {label}
                                  </label>
                                )
                              )}
                            </div>
                          ) : null}
                          {canManageTeam &&
                          member.status === "active" &&
                          member.role !== "Owner" ? (
                            <OwnedButton
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={Boolean(busyAction)}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Transfer workspace ownership to ${member.name}?`
                                  )
                                ) {
                                  void runTeamAction("transfer", () =>
                                    transferOwnership({
                                      teamId: teamData.workspace._id,
                                      memberId: member._id,
                                    })
                                  );
                                }
                              }}
                            >
                              Transfer ownership
                            </OwnedButton>
                          ) : null}
                          {canManageTeam && member.role !== "Owner" ? (
                            <OwnedButton
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={Boolean(busyAction)}
                              onClick={() =>
                                runTeamAction("remove", () =>
                                  removeMember({
                                    teamId: teamData.workspace._id,
                                    memberId: member._id,
                                  })
                                )
                              }
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              {member.status === "invited"
                                ? "Cancel Invite"
                                : "Remove"}
                            </OwnedButton>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>

                  {canManageTeam ? (
                    <div className="border-t border-[var(--app-border)] p-5">
                      <h3 className="text-sm font-semibold">Invite member</h3>
                      <div className="mt-3 grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_160px_120px]">
                        <FieldLayout
                          label="Email"
                          error={
                            inviteForm.email.trim() &&
                            !isValidEmail(inviteForm.email)
                              ? "Enter a valid email address."
                              : undefined
                          }
                        >
                          <OwnedInput
                            type="email"
                            value={inviteForm.email}
                            onChange={(event) =>
                              setInviteForm({
                                ...inviteForm,
                                email: event.target.value,
                              })
                            }
                          />
                        </FieldLayout>
                        <ProjectSelect
                          label="Role"
                          value={inviteForm.role}
                          options={teamRoleOptions
                            .filter((role) => role !== "Owner")
                            .map(displayTeamRole)}
                          onChange={(value) =>
                            setInviteForm({
                              ...inviteForm,
                              role: value === "Viewer" ? "Reviewer" : value,
                            })
                          }
                        />
                        <OwnedButton
                          type="button"
                          variant="outline"
                          disabled={Boolean(busyAction) || !inviteEmailIsValid}
                          onClick={() =>
                            runTeamAction("invite", async () => {
                              await inviteMember({
                                teamId: teamData.workspace._id,
                                email: inviteForm.email,
                                role: inviteForm.role as "Editor" | "Reviewer",
                              });
                              setInviteForm({ email: "", role: "Editor" });
                            })
                          }
                        >
                          Invite
                        </OwnedButton>
                      </div>
                    </div>
                  ) : null}
                </ContentSection>

                <ContentSection
                  title="Project Comments"
                  description="Leave notes for the team. Use @name or @emailname to notify someone."
                  actions={
                    <div className="w-full md:w-64">
                      <ProjectSelect
                        label="Project"
                        value={selectedProject?.id ?? ""}
                        options={teamProjects.map((project) => project.id)}
                        labels={Object.fromEntries(
                          teamProjects.map((project) => [
                            project.id,
                            project.title,
                          ])
                        )}
                        onChange={setSelectedProjectId}
                      />
                    </div>
                  }
                  bodyClassName="grid gap-4"
                >
                  {selectedProject ? (
                    <div className="grid gap-4">
                      <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] p-3">
                        <p className="text-sm font-semibold">
                          {selectedProject.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedProject.client || "No client"} ·{" "}
                          {selectedProject.status} · Due{" "}
                          {formatDate(
                            selectedProject.dueDate,
                            settings.dateFormat
                          )}
                        </p>
                      </div>
                      <div
                        className="grid max-h-[min(320px,40dvh)] gap-3 overflow-y-auto overscroll-contain"
                        aria-live="polite"
                      >
                        {projectComments === undefined ? (
                          <p className="text-sm text-muted-foreground">
                            Loading comments...
                          </p>
                        ) : projectComments.length ? (
                          projectComments.map((comment) => (
                            <article
                              key={comment._id}
                              className="rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] p-3"
                            >
                              <p className="text-sm font-semibold">
                                {comment.authorName}{" "}
                                <time className="text-xs font-normal text-muted-foreground">
                                  {formatActivityTime(comment.createdAt)}
                                </time>
                              </p>
                              {comment.timecode ? (
                                <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">
                                  <Clock3
                                    aria-hidden="true"
                                    className="size-3.5"
                                  />
                                  {comment.timecode}
                                </span>
                              ) : null}
                              <p className="mt-2 whitespace-pre-wrap text-sm">
                                {comment.body}
                              </p>
                            </article>
                          ))
                        ) : (
                          <EmptyPanel
                            title="No project comments yet"
                            body="Team notes for this project will appear here in real time."
                          />
                        )}
                      </div>
                      {canCommentProjects ? (
                        <div className="grid items-start gap-3 md:grid-cols-[180px_minmax(0,1fr)_112px]">
                          <FieldLayout
                            label="Timecode (optional)"
                            description="MM:SS or HH:MM:SS"
                          >
                            <OwnedInput
                              value={commentTimecode}
                              placeholder="00:12"
                              maxLength={8}
                              inputMode="text"
                              onChange={(event) =>
                                setCommentTimecode(event.target.value)
                              }
                            />
                          </FieldLayout>
                          <FieldLayout
                            label="Project comment"
                            description={`${commentBody.length}/${TEAM_PROJECT_COMMENT_LIMIT} characters`}
                          >
                            <OwnedTextarea
                              value={commentBody}
                              rows={2}
                              {...{ maxLength: TEAM_PROJECT_COMMENT_LIMIT }}
                              onChange={(event) =>
                                setCommentBody(event.target.value)
                              }
                            />
                          </FieldLayout>
                          <OwnedButton
                            type="button"
                            className="md:mt-6"
                            disabled={
                              Boolean(busyAction) || !commentBody.trim()
                            }
                            onClick={() =>
                              runTeamAction("comment", async () => {
                                const normalizedTimecode =
                                  normalizeOptionalTimecode(commentTimecode);
                                await addProjectComment({
                                  teamId: teamData.workspace._id,
                                  projectId: selectedProject.id,
                                  body: commentBody,
                                  ...(normalizedTimecode
                                    ? { timecode: normalizedTimecode }
                                    : {}),
                                });
                                trackOptionalEvent("comment_added", {
                                  surface: "team",
                                });
                                setCommentBody("");
                                setCommentTimecode("");
                              })
                            }
                          >
                            Post
                          </OwnedButton>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <EmptyPanel
                      title="No team projects yet"
                      body="Create a team project to start leaving shared comments."
                    />
                  )}
                </ContentSection>
              </div>
            }
            secondary={
              <aside className="grid min-w-0 content-start gap-4">
                <ContentSection
                  title="Notifications"
                  description="Unread mentions and project updates that need your attention."
                  actions={
                    unreadNotifications ? (
                      <OwnedButton
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={Boolean(busyAction)}
                        onClick={() =>
                          runTeamAction("read-all", () =>
                            markAllNotificationsRead({
                              teamId: teamData.workspace._id,
                            })
                          )
                        }
                      >
                        Mark all read
                      </OwnedButton>
                    ) : null
                  }
                  bodyClassName="grid max-h-[min(460px,50dvh)] gap-2 overflow-y-auto overscroll-contain"
                >
                  {teamData.notifications.length ? (
                    teamData.notifications.map((notification) => (
                      <article
                        key={notification._id}
                        className={
                          notification.read
                            ? "flex justify-between gap-3 rounded-md border border-[var(--app-border)] p-3"
                            : "flex justify-between gap-3 rounded-md border border-[var(--app-accent)] bg-[var(--app-active)] p-3"
                        }
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {notification.message}
                          </p>
                          {notification.projectId ? (
                            <p className="mt-1 text-xs font-semibold text-primary">
                              Project:{" "}
                              {teamProjectLabel(notification.projectId)}
                            </p>
                          ) : null}
                          <time className="mt-1 block text-xs text-muted-foreground">
                            {formatActivityTime(notification.createdAt)}
                          </time>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {notification.projectId &&
                          teamProjectTitles[notification.projectId] ? (
                            <OwnedButton
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                showTeamProject(notification.projectId);
                                if (!notification.read) {
                                  void markNotificationRead({
                                    notificationId: notification._id,
                                  });
                                }
                              }}
                            >
                              View
                            </OwnedButton>
                          ) : null}
                          {!notification.read ? (
                            <OwnedButton
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() =>
                                runTeamAction("read", () =>
                                  markNotificationRead({
                                    notificationId: notification._id,
                                  })
                                )
                              }
                            >
                              Mark read
                            </OwnedButton>
                          ) : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <EmptyPanel
                      title="No notifications"
                      body="Mentions and project notifications will appear here."
                    />
                  )}
                </ContentSection>

                <ContentSection
                  title="Activity Feed"
                  description="Workspace creation, invites, comments, and project updates."
                  bodyClassName="grid max-h-[min(460px,50dvh)] gap-2 overflow-y-auto overscroll-contain"
                >
                  {teamData.activity.length ? (
                    teamData.activity.map((activity) => (
                      <article
                        key={activity._id}
                        className="rounded-md border-l-2 border-[var(--app-accent)] bg-[var(--app-soft-panel)] p-3"
                      >
                        <p className="text-sm font-medium">
                          {activity.message}
                        </p>
                        {activity.projectId ? (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold text-primary">
                              Project: {teamProjectLabel(activity.projectId)}
                            </p>
                            {teamProjectTitles[activity.projectId] ? (
                              <OwnedButton
                                type="button"
                                size="xs"
                                variant="link"
                                className="h-auto p-0"
                                onClick={() =>
                                  showTeamProject(activity.projectId)
                                }
                              >
                                View
                              </OwnedButton>
                            ) : null}
                          </div>
                        ) : null}
                        <time className="mt-1 block text-xs text-muted-foreground">
                          {formatActivityTime(activity.createdAt)}
                        </time>
                      </article>
                    ))
                  ) : (
                    <EmptyPanel
                      title="No activity yet"
                      body="Workspace creation, invites, comments, and project updates will appear here."
                    />
                  )}
                </ContentSection>
              </aside>
            }
          />
        )}
      </PageContent>
    </WorkspacePage>
  );
}

function TeamChatPage() {
  const { isSignedIn, isLoaded: isUserLoaded, openSignIn } = useOptionalAuth();
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth();
  const teamData = useQuery(
    api.team.getMyWorkspace,
    isConvexAuthenticated ? {} : "skip"
  );
  const sendChatMessage = useMutation(api.team.sendChatMessage);
  const messageInputId = useId();
  const messageCountId = `${messageInputId}-count`;
  const chatInputProps = { maxLength: TEAM_CHAT_MESSAGE_LIMIT };
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const canUseChat = Boolean(teamData?.currentMember.permissions.useChat);
  const chatReady = Boolean(
    isUserLoaded &&
    isSignedIn &&
    !isConvexAuthLoading &&
    isConvexAuthenticated &&
    teamData &&
    canUseChat
  );

  function formatChatTime(value: string) {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  async function submitMessage() {
    const body = message.trim();
    if (!body || !teamData?.workspace || !canUseChat) return;
    setSending(true);
    setChatError("");
    try {
      await sendChatMessage({ teamId: teamData.workspace._id, body });
      setMessage("");
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Message could not be sent."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <WorkspacePage family="conversation" mode="fill">
      <PageHeader
        title="Team Chat"
        description="Quick handoffs, production updates, and Manage Team access for your current workspace."
      />
      <PageContent mode="fill" className="min-h-0">
        <FillViewport
          bodyLabel="Team chat workspace"
          bodyClassName="overflow-auto rounded-[6px] border border-border bg-card lg:overflow-hidden"
          header={
            chatReady && teamData ? (
              <div
                data-slot="conversation-header"
                className="flex flex-col justify-between gap-3 border-b border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-4 sm:flex-row sm:items-center sm:px-5"
              >
                <div>
                  <h2 className="text-lg font-semibold">
                    {teamData.workspace.name}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--app-muted)]">
                    {
                      teamData.members.filter(
                        (member) => member.status === "active"
                      ).length
                    }{" "}
                    active members · Use @name to notify someone
                  </p>
                </div>
                <OwnedBadge
                  variant="secondary"
                  className="self-start sm:self-auto"
                >
                  {teamData.currentMember.role === "Reviewer"
                    ? "Viewer"
                    : teamData.currentMember.role}{" "}
                  access
                </OwnedBadge>
              </div>
            ) : undefined
          }
          footer={
            chatReady && teamData ? (
              <form
                data-slot="conversation-composer"
                className="team-chat-composer border-t border-[var(--app-border)] bg-[var(--app-soft-panel)] p-3 sm:p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitMessage();
                }}
              >
                {chatError ? (
                  <p
                    role="alert"
                    className="mb-2 text-xs font-semibold text-destructive"
                  >
                    {chatError}
                  </p>
                ) : null}
                <div className="grid gap-2">
                  <label
                    htmlFor={messageInputId}
                    className="text-sm font-medium"
                  >
                    Message
                  </label>
                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
                    <OwnedTextarea
                      id={messageInputId}
                      aria-describedby={messageCountId}
                      aria-invalid={Boolean(chatError)}
                      value={message}
                      rows={2}
                      {...chatInputProps}
                      className="max-h-28 min-h-10 flex-1 bg-background"
                      onChange={(event) => {
                        setMessage(event.target.value);
                        if (chatError) setChatError("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void submitMessage();
                        }
                      }}
                    />
                    <OwnedButton
                      type="submit"
                      disabled={sending || !message.trim()}
                      className="min-w-28"
                    >
                      {sending ? (
                        <LoaderCircle aria-hidden="true" />
                      ) : (
                        <Send aria-hidden="true" />
                      )}
                      {sending ? "Sending..." : "Send"}
                    </OwnedButton>
                  </div>
                  <p
                    id={messageCountId}
                    className="text-xs text-[var(--app-muted)]"
                  >
                    {message.length}/{TEAM_CHAT_MESSAGE_LIMIT} characters
                  </p>
                </div>
              </form>
            ) : undefined
          }
        >
          {!isUserLoaded ? (
            <section className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-[var(--app-shadow-1)]">
              <div
                role="status"
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Checking account status...
              </div>
            </section>
          ) : !isSignedIn ? (
            <section className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-[var(--app-shadow-1)]">
              <h2 className="text-xl font-semibold">
                Sign in to open Team Chat
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Chat is tied to your authenticated team workspace and is not
                available in local mode.
              </p>
              <OwnedButton
                type="button"
                className="mt-5"
                onClick={() => openSignIn()}
              >
                Sign In
              </OwnedButton>
            </section>
          ) : isConvexAuthLoading ? (
            <section className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-[var(--app-shadow-1)]">
              <div
                role="status"
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Connecting Team Chat...
              </div>
            </section>
          ) : !isConvexAuthenticated ? (
            <section
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-destructive shadow-sm"
            >
              <h2 className="text-lg font-semibold">
                Team Chat is not connected
              </h2>
              <p className="mt-2 text-sm">
                Convex has not received your Clerk session. Sign out and back
                in, then retry.
              </p>
            </section>
          ) : teamData === undefined ? (
            <section className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-[var(--app-shadow-1)]">
              <div
                role="status"
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Loading messages...
              </div>
            </section>
          ) : !teamData ? (
            <section className="grid min-h-72 place-items-center rounded-xl border border-border bg-card p-6 text-center text-card-foreground shadow-[var(--app-shadow-1)]">
              <div className="max-w-md">
                <Users
                  className="mx-auto size-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-lg font-semibold">
                  No team workspace yet
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create or join a workspace before using Team Chat.
                </p>
              </div>
            </section>
          ) : !canUseChat ? (
            <section className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-[var(--app-shadow-1)]">
              <h2 className="text-xl font-semibold">
                Chat unavailable for your role
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your current role can access the workspace but does not have
                permission to view or send chat messages.
              </p>
            </section>
          ) : (
            <div
              data-slot="conversation-history"
              className="min-h-full bg-[var(--app-panel)]"
            >
              <ol
                aria-label="Team chat messages"
                className="flex min-h-full flex-col gap-3 px-3 py-5 md:px-5"
              >
                {teamData.chat.length ? (
                  teamData.chat.map((chatMessage) => {
                    const isOwnMessage =
                      chatMessage.authorUserId ===
                      teamData.currentMember.userId;
                    return (
                      <li
                        key={chatMessage._id}
                        className={`w-[min(680px,88%)] ${isOwnMessage ? "self-end" : "self-start"}`}
                      >
                        <div
                          className={`mb-1 flex items-center gap-2 ${isOwnMessage ? "justify-end" : "justify-between"}`}
                        >
                          {!isOwnMessage ? (
                            <span className="text-xs font-semibold">
                              {chatMessage.authorName}
                            </span>
                          ) : null}
                          <time className="text-[11px] text-muted-foreground">
                            {formatChatTime(chatMessage.createdAt)}
                          </time>
                        </div>
                        <div
                          className={`rounded-lg border px-3 py-2.5 ${isOwnMessage ? "border-primary bg-primary/10" : "border-border bg-muted"}`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">
                            {chatMessage.body}
                          </p>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className="m-auto max-w-md list-none text-center">
                    <MessageSquare
                      className="mx-auto size-8 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <h3 className="mt-4 font-semibold">No messages yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Start with a handoff, blocker, review update, or delivery
                      note.
                    </p>
                  </li>
                )}
              </ol>
            </div>
          )}
        </FillViewport>
      </PageContent>
    </WorkspacePage>
  );
}

function IntegrationsDesignPage({
  projects,
  settings,
  setSettings,
  notify,
  onEditProject,
}: {
  projects: WorkItem[];
  settings: SettingsState;
  setSettings: (settings: SettingsState) => void;
  notify: (message: string, tone?: ToastState["tone"]) => void;
  onEditProject: (item: WorkItem) => void;
}) {
  const [integrationDialog, setIntegrationDialog] = useState<{
    name: string;
    config: IntegrationConfig;
  } | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [configError, setConfigError] = useState("");
  const [integrationSearch, setIntegrationSearch] = useState("");
  const [integrationFilter, setIntegrationFilter] = useState("all");
  const projectLinks = projects.filter(
    (project) => configuredIntegrationCount(project.integrationLinks) > 0
  );
  const connectedCount = integrationNames.filter((name) => {
    const config = settings.integrationConfigs[name];
    return Boolean(config?.connected);
  }).length;
  const visibleIntegrationNames = integrationNames.filter((name) => {
    const config = settings.integrationConfigs[name] ?? emptyIntegrationConfig;
    const connected = config.connected;
    const query = integrationSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [
        name,
        integrationDescriptions[name],
        config.account,
      ].some((value) => value.toLowerCase().includes(query));
    const matchesFilter =
      integrationFilter === "all" ||
      (integrationFilter === "connected" ? connected : !connected);
    return matchesSearch && matchesFilter;
  });
  const visibleProjectLinks = projectLinks.filter((project) => {
    const query = integrationSearch.trim().toLowerCase();
    return (
      !query ||
      [project.title, project.client || ""].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  });

  function openIntegration(name: string) {
    const existing = settings.integrationConfigs[name] ?? {
      ...emptyIntegrationConfig,
    };
    setIntegrationDialog({
      name,
      config: {
        ...existing,
        connected: existing.connected,
        account: existing.account,
      },
    });
    setConfigError("");
  }

  function closeIntegrationDialog() {
    setIntegrationDialog(null);
    setConfigError("");
  }

  function updateIntegrationConfig(next: Partial<IntegrationConfig>) {
    setIntegrationDialog((current) =>
      current ? { ...current, config: { ...current.config, ...next } } : current
    );
    setConfigError("");
  }

  function saveIntegration() {
    if (!integrationDialog) return;
    const account = integrationDialog.config.account.trim();
    if (!account) {
      setConfigError("Enter an account email or name.");
      return;
    }
    const now = new Date().toISOString();
    const updatedConfig: IntegrationConfig = {
      ...integrationDialog.config,
      connected: true,
      account,
      connectedAt: integrationDialog.config.connectedAt || now,
      lastSyncAt: now,
    };
    setSettings({
      ...settings,
      integrationConfigs: {
        ...settings.integrationConfigs,
        [integrationDialog.name]: updatedConfig,
      },
    });
    notify(`${integrationDialog.name} connected successfully.`, "success");
    closeIntegrationDialog();
  }

  function confirmDisconnect() {
    if (!disconnectTarget) return;
    setSettings({
      ...settings,
      integrationConfigs: {
        ...settings.integrationConfigs,
        [disconnectTarget]: { ...emptyIntegrationConfig },
      },
    });
    notify(`${disconnectTarget} disconnected.`, "warning");
    setDisconnectTarget(null);
  }

  return (
    <WorkspacePage family="library">
      <PageHeader
        eyebrow="Workspace / Integrations"
        title="Integrations"
        description="Manage local service records and save external links for your workspace and individual projects."
      />
      <PageContent className="space-y-5">
        <PageToolbar
          data-family-toolbar="integrations"
          primary={
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Plug
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--app-muted)]"
              />
              <OwnedInput
                aria-label="Search integrations"
                value={integrationSearch}
                onChange={(event) => setIntegrationSearch(event.target.value)}
                placeholder="Search services and project links..."
                className="h-10 bg-[var(--app-control)] pl-9 shadow-none"
              />
            </div>
          }
          secondary={
            <OwnedSelect
              value={integrationFilter}
              onValueChange={setIntegrationFilter}
            >
              <OwnedSelectTrigger
                aria-label="Filter integrations"
                className="h-10 w-full sm:w-40"
              >
                <OwnedSelectValue />
              </OwnedSelectTrigger>
              <OwnedSelectContent position="popper">
                <OwnedSelectItem value="all">All services</OwnedSelectItem>
                <OwnedSelectItem value="connected">Connected</OwnedSelectItem>
                <OwnedSelectItem value="available">
                  Not connected
                </OwnedSelectItem>
              </OwnedSelectContent>
            </OwnedSelect>
          }
        />
        <ContentSection
          title="Connected Services"
          description="Save the account and workspace details your studio uses. These are local records and do not grant API access."
          actions={
            <OwnedBadge variant={connectedCount ? "default" : "secondary"}>
              <Plug aria-hidden="true" />
              {connectedCount} connected
            </OwnedBadge>
          }
        >
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border shadow-[var(--app-shadow-1)]">
            {visibleIntegrationNames.map((name) => {
              const config =
                settings.integrationConfigs[name] ?? emptyIntegrationConfig;
              const connected = Boolean(
                config.connected
              );
              const account =
                config.account;
              return (
                <li
                  key={name}
                  className="flex flex-col justify-between gap-3 bg-[var(--app-soft-panel)] p-4 transition-colors hover:bg-[var(--app-hover)] focus-within:bg-[var(--app-hover)] sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-md text-sm font-semibold text-white"
                      style={{ backgroundColor: integrationColors[name] }}
                    >
                      {integrationIcons[name]}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{name}</h3>
                        <OwnedBadge variant={connected ? "default" : "outline"}>
                          {connected ? "Connected" : "Not connected"}
                        </OwnedBadge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {connected
                          ? account || "Connected locally"
                          : integrationDescriptions[name]}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {connected ? (
                      <OwnedButton
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`Disconnect ${name}`}
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDisconnectTarget(name)}
                      >
                        <Unplug aria-hidden="true" />
                        Disconnect
                      </OwnedButton>
                    ) : null}
                    <OwnedButton
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`${connected ? "Manage" : "Connect"} ${name}`}
                      onClick={() => openIntegration(name)}
                    >
                      <Plug aria-hidden="true" />
                      {connected ? "Manage" : "Connect"}
                    </OwnedButton>
                  </div>
                </li>
              );
            })}
          </ul>
          {!visibleIntegrationNames.length ? (
            <PageEmptyState
              title="No matching services"
              description="Try a different search or connection filter."
            />
          ) : null}
        </ContentSection>

        <IntegrationLinkManager
          title="Global Integrations"
          subtitle="Workspace-level service links used across your editing workflow."
          links={settings.integrationLinks}
          emptyTitle="No global integration links"
          emptyBody="Add links to shared folders, calendars, channels, and review spaces your studio uses often."
          onChange={(integrationLinks) => {
            setSettings({ ...settings, integrationLinks });
            notify("Global integration links updated.", "success");
          }}
        />

        <ContentSection
          title="Cloudflare R2 Storage"
          description="Upcoming. Large-file storage through Cloudflare R2 is being prepared for a future release. Project uploads currently use Relay's Convex Storage."
          metadata={
            <Cloud
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          }
          actions={<OwnedBadge variant="secondary">Upcoming</OwnedBadge>}
          bodyMode="flush"
        />

        <ContentSection
          title="Project Integrations"
          description="Project-specific links stay attached to each project record."
          actions={
            <OwnedBadge
              variant={visibleProjectLinks.length ? "default" : "secondary"}
            >
              <Link2 aria-hidden="true" />
              {visibleProjectLinks.length} projects linked
            </OwnedBadge>
          }
        >
          {visibleProjectLinks.length ? (
            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border shadow-[var(--app-shadow-1)]">
              {visibleProjectLinks.map((project) => (
                <li
                  key={project.id}
                  className="flex flex-col justify-between gap-3 bg-[var(--app-soft-panel)] p-4 transition-colors hover:bg-[var(--app-hover)] focus-within:bg-[var(--app-hover)] md:flex-row md:items-center"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {project.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {configuredIntegrationCount(project.integrationLinks)}{" "}
                      saved{" "}
                      {configuredIntegrationCount(project.integrationLinks) ===
                      1
                        ? "link"
                        : "links"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {integrationServices.map((service) =>
                        hasIntegrationLink(
                          project.integrationLinks?.[service.id]
                        ) ? (
                          <OwnedBadge key={service.id} variant="secondary">
                            {service.shortName}
                          </OwnedBadge>
                        ) : null
                      )}
                    </div>
                  </div>
                  <OwnedButton
                    type="button"
                    variant="outline"
                    aria-label={`Manage integration links for ${project.title}`}
                    onClick={() => onEditProject(project)}
                  >
                    <Pencil aria-hidden="true" />
                    Manage Project Links
                  </OwnedButton>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border">
              <EmptyPanel
                title={
                  projectLinks.length
                    ? "No matching project links"
                    : "No project integration links"
                }
                body={
                  projectLinks.length
                    ? "Try a different search term."
                    : "Open a project and add service links for folders, review pages, channels, or calendar events."
                }
              />
            </div>
          )}
        </ContentSection>
      </PageContent>

      <OwnedDialog
        open={Boolean(integrationDialog)}
        onOpenChange={(open) => {
          if (!open) closeIntegrationDialog();
        }}
      >
        <OwnedDialogContent className="sm:max-w-xl">
          <OwnedDialogHeader>
            <OwnedDialogTitle>
              {integrationDialog
                ? `${integrationDialog.config.connected ? "Manage" : "Connect"} ${integrationDialog.name}`
                : "Connect integration"}
            </OwnedDialogTitle>
            <OwnedDialogDescription>
              {integrationDialog
                ? integrationDescriptions[integrationDialog.name]
                : "Configure your locally saved integration details."}
            </OwnedDialogDescription>
          </OwnedDialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveIntegration();
            }}
          >
            <FieldLayout
              label="Account email or name"
              required
              error={configError || undefined}
            >
              <OwnedInput
                value={integrationDialog?.config.account ?? ""}
                onChange={(event) =>
                  updateIntegrationConfig({ account: event.target.value })
                }
                autoFocus
                placeholder="you@example.com"
              />
            </FieldLayout>
            {integrationDialog?.name === "Google Drive" ||
            integrationDialog?.name === "Dropbox" ||
            integrationDialog?.name === "Frame.io" ? (
              <FieldLayout
                label={
                  integrationDialog.name === "Frame.io"
                    ? "Project folder"
                    : "Folder path"
                }
              >
                <OwnedInput
                  value={integrationDialog.config.folder}
                  onChange={(event) =>
                    updateIntegrationConfig({ folder: event.target.value })
                  }
                  placeholder={
                    integrationDialog.name === "Google Drive"
                      ? "/Projects/Video Edits"
                      : "/Deliverables"
                  }
                />
              </FieldLayout>
            ) : null}
            {integrationDialog?.name === "Slack" ||
            integrationDialog?.name === "Frame.io" ? (
              <FieldLayout label="Workspace name">
                <OwnedInput
                  value={integrationDialog.config.workspace}
                  onChange={(event) =>
                    updateIntegrationConfig({ workspace: event.target.value })
                  }
                  placeholder="Studio Workspace"
                />
              </FieldLayout>
            ) : null}
            {integrationDialog?.name === "Slack" ? (
              <>
                <FieldLayout label="Channel">
                  <OwnedInput
                    value={integrationDialog.config.channel}
                    onChange={(event) =>
                      updateIntegrationConfig({ channel: event.target.value })
                    }
                    placeholder="#project-updates"
                  />
                </FieldLayout>
                <FieldLayout
                  label="Webhook URL"
                  description="Optional. Stored locally and never called by Relay."
                >
                  <OwnedInput
                    type="url"
                    value={integrationDialog.config.webhookUrl}
                    onChange={(event) =>
                      updateIntegrationConfig({
                        webhookUrl: event.target.value,
                      })
                    }
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </FieldLayout>
              </>
            ) : null}
            <OwnedDialogFooter>
              <OwnedButton
                type="button"
                variant="outline"
                onClick={closeIntegrationDialog}
              >
                Cancel
              </OwnedButton>
              <OwnedButton
                type="submit"
                disabled={!integrationDialog?.config.account.trim()}
              >
                <Plug aria-hidden="true" />
                Save Connection
              </OwnedButton>
            </OwnedDialogFooter>
          </form>
        </OwnedDialogContent>
      </OwnedDialog>

      <OwnedAlertDialog
        open={Boolean(disconnectTarget)}
        onOpenChange={(open) => !open && setDisconnectTarget(null)}
      >
        <OwnedAlertDialogContent>
          <OwnedAlertDialogHeader>
            <OwnedAlertDialogTitle>
              Disconnect {disconnectTarget}?
            </OwnedAlertDialogTitle>
            <OwnedAlertDialogDescription>
              This removes all saved account and configuration details for{" "}
              {disconnectTarget}. You can reconnect it at any time.
            </OwnedAlertDialogDescription>
          </OwnedAlertDialogHeader>
          <OwnedAlertDialogFooter>
            <OwnedAlertDialogCancel>Cancel</OwnedAlertDialogCancel>
            <OwnedAlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDisconnect}
            >
              Disconnect
            </OwnedAlertDialogAction>
          </OwnedAlertDialogFooter>
        </OwnedAlertDialogContent>
      </OwnedAlertDialog>
    </WorkspacePage>
  );
}

function IntegrationLinkManager({
  title,
  subtitle,
  links,
  emptyTitle,
  emptyBody,
  onChange,
}: {
  title: string;
  subtitle: string;
  links: IntegrationLinks | undefined;
  emptyTitle: string;
  emptyBody: string;
  onChange: (links: IntegrationLinks) => void;
}) {
  const [editing, setEditing] = useState<{
    serviceId: IntegrationServiceId;
    link: IntegrationLink;
  } | null>(null);
  const [error, setError] = useState("");
  const configuredCount = configuredIntegrationCount(links);

  function openEditor(serviceId: IntegrationServiceId) {
    setEditing({
      serviceId,
      link: {
        ...emptyIntegrationLink,
        ...normalizeIntegrationLink(links?.[serviceId]),
      },
    });
    setError("");
  }

  function saveLink() {
    if (!editing) return;
    const link = normalizeIntegrationLink(editing.link);
    if (!isValidIntegrationUrl(link.url)) {
      setError("Enter a valid http or https URL.");
      return;
    }
    onChange({
      ...(links ?? {}),
      [editing.serviceId]: {
        ...link,
        updatedAt: new Date().toISOString(),
      },
    });
    setEditing(null);
    setError("");
  }

  function removeLink(serviceId: IntegrationServiceId) {
    const next: IntegrationLinks = { ...(links ?? {}) };
    delete next[serviceId];
    onChange(next);
  }

  function openLink(url: string) {
    if (typeof window === "undefined" || !isValidIntegrationUrl(url)) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <ContentSection
      title={title}
      description={subtitle}
      actions={
        <OwnedBadge variant={configuredCount ? "default" : "secondary"}>
          <Link2 aria-hidden="true" />
          {configuredCount} configured
        </OwnedBadge>
      }
    >
      {!configuredCount ? (
        <div className="mt-4 rounded-lg border border-dashed border-border">
          <EmptyPanel title={emptyTitle} body={emptyBody} />
        </div>
      ) : null}
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
        {integrationServices.map((service) => {
          const link = links?.[service.id];
          const linked = hasIntegrationLink(link);
          return (
            <li
              key={service.id}
              className="flex flex-col justify-between gap-3 bg-card p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-md text-sm font-semibold text-white"
                  style={{ backgroundColor: service.color }}
                >
                  {service.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{service.name}</h3>
                    <OwnedBadge variant={linked ? "default" : "outline"}>
                      {integrationStatusLabel(link)}
                    </OwnedBadge>
                  </div>
                  <p className="mt-1 max-w-xl truncate text-xs text-muted-foreground">
                    {integrationDisplayText(link, service.description)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {linked && link ? (
                  <OwnedButton
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Open ${service.name} link in a new tab`}
                    onClick={() => openLink(link.url)}
                  >
                    <ExternalLink aria-hidden="true" />
                    Open
                  </OwnedButton>
                ) : null}
                {linked ? (
                  <OwnedButton
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Remove ${service.name} link`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeLink(service.id)}
                  >
                    <Trash2 aria-hidden="true" />
                    Remove
                  </OwnedButton>
                ) : null}
                <OwnedButton
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`${linked ? "Edit" : "Add"} ${service.name} link`}
                  onClick={() => openEditor(service.id)}
                >
                  {linked ? (
                    <Pencil aria-hidden="true" />
                  ) : (
                    <Plus aria-hidden="true" />
                  )}
                  {linked ? "Edit" : "Add Link"}
                </OwnedButton>
              </div>
            </li>
          );
        })}
      </ul>

      <OwnedDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setError("");
          }
        }}
      >
        <OwnedDialogContent className="sm:max-w-xl">
          <OwnedDialogHeader>
            <OwnedDialogTitle>
              {editing
                ? `${hasIntegrationLink(links?.[editing.serviceId]) ? "Edit" : "Add"} ${integrationServices.find((service) => service.id === editing.serviceId)?.name} Link`
                : "Integration Link"}
            </OwnedDialogTitle>
            <OwnedDialogDescription>
              Store a direct link and optional context. Relay will not
              authenticate, browse files, sync data, or call this service.
            </OwnedDialogDescription>
          </OwnedDialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveLink();
            }}
          >
            <FieldLayout label="URL" required error={error || undefined}>
              <OwnedInput
                type="url"
                value={editing?.link.url ?? ""}
                onChange={(event) => {
                  setEditing((current) =>
                    current
                      ? {
                          ...current,
                          link: { ...current.link, url: event.target.value },
                        }
                      : current
                  );
                  setError("");
                }}
                autoFocus
                placeholder="https://..."
              />
            </FieldLayout>
            <FieldLayout label="Label">
              <OwnedInput
                value={editing?.link.label ?? ""}
                onChange={(event) =>
                  setEditing((current) =>
                    current
                      ? {
                          ...current,
                          link: { ...current.link, label: event.target.value },
                        }
                      : current
                  )
                }
                placeholder="Client review folder"
              />
            </FieldLayout>
            <FieldLayout label="Notes">
              <OwnedTextarea
                value={editing?.link.notes ?? ""}
                onChange={(event) =>
                  setEditing((current) =>
                    current
                      ? {
                          ...current,
                          link: { ...current.link, notes: event.target.value },
                        }
                      : current
                  )
                }
                placeholder="Optional context for this link"
              />
            </FieldLayout>
            <OwnedDialogFooter>
              <OwnedButton
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setError("");
                }}
              >
                Cancel
              </OwnedButton>
              <OwnedButton type="submit">
                <Link2 aria-hidden="true" />
                Save Link
              </OwnedButton>
            </OwnedDialogFooter>
          </form>
        </OwnedDialogContent>
      </OwnedDialog>
    </ContentSection>
  );
}

function SettingsDesignPage({
  settings,
  setSettings,
  notify,
  teamWorkspace,
  canManageWorkspace = false,
}: {
  settings: SettingsState;
  setSettings: (
    settings: SettingsState | ((current: SettingsState) => SettingsState)
  ) => void;
  notify: (message: string, tone?: ToastState["tone"]) => void;
  teamWorkspace?: TeamWorkspaceContract;
  canManageWorkspace?: boolean;
}) {
  const { exportBackup, importBackup } = useData();
  const [optionalAnalytics, setOptionalAnalytics] = useState(
    () => getAnalyticsConsent() === "granted"
  );
  const updateWorkspaceSettings = useMutation(teamApi.updateWorkspaceSettings);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [workspaceDraft, setWorkspaceDraft] = useState(() => ({
    name: teamWorkspace?.name ?? settings.studioName,
    currencyCode: teamWorkspace?.currencyCode ?? settings.currencyCode,
    timeZone: teamWorkspace?.timeZone ?? settings.timeZone,
    defaultWorkflowTemplateId:
      teamWorkspace?.defaultWorkflowTemplateId ?? "relay-default-workflow",
    allowAllTeamProjects: teamWorkspace?.allowAllTeamProjects ?? false,
  }));
  const [activeSection, setActiveSection] = useState<
    | "workspace"
    | "workflow"
    | "notifications"
    | "permissions"
    | "integrations"
    | "appearance"
    | "regional"
  >("workspace");
  const stageColors = [
    "var(--workflow-stage-1)",
    "var(--workflow-stage-2)",
    "var(--workflow-stage-3)",
    "var(--workflow-stage-4)",
    "var(--workflow-stage-5)",
    "var(--workflow-stage-6)",
  ];
  const stageIssues = projectStageIssues(settings.projectStages);
  const tagIssues = projectTagIssues(settings.projectTags);
  const rolePolicy = [
    {
      role: "Owner",
      permissions: [
        "Create and edit projects",
        "Update project stages",
        "Leave project notes",
        "Assign work",
        "Mention teammates",
        "Use team chat",
        "Manage members and roles",
      ],
    },
    {
      role: "Editor",
      permissions: [
        "Create and edit projects",
        "Update project stages",
        "Leave project notes",
        "Assign work",
        "Mention teammates",
        "Use team chat",
      ],
    },
    {
      role: "Viewer",
      permissions: [
        "View team projects",
        "Review assigned work",
        "Use team chat",
      ],
    },
  ];
  const workflowTemplateOptions = [
    ...PROJECT_TEMPLATES,
    ...settings.customProjectTemplates,
  ];
  const workflowTemplateIds = workflowTemplateOptions.map(
    (template) => template.id
  );
  const workflowTemplateLabels = Object.fromEntries(
    workflowTemplateOptions.map((template) => [template.id, template.name])
  );

  useEffect(() => {
    if (!teamWorkspace) return;
    setWorkspaceDraft({
      name: teamWorkspace.name,
      currencyCode: teamWorkspace.currencyCode ?? settings.currencyCode,
      timeZone: teamWorkspace.timeZone ?? settings.timeZone,
      defaultWorkflowTemplateId:
        teamWorkspace.defaultWorkflowTemplateId ?? "relay-default-workflow",
      allowAllTeamProjects: teamWorkspace.allowAllTeamProjects ?? false,
    });
  }, [settings.currencyCode, settings.timeZone, teamWorkspace]);

  async function saveWorkspaceSettings(
    overrides: Partial<typeof workspaceDraft> = {}
  ) {
    if (!teamWorkspace) return;
    const nextDraft = { ...workspaceDraft, ...overrides };
    try {
      await updateWorkspaceSettings({
        teamId: teamWorkspace._id,
        ...nextDraft,
      });
      setSettings((current) => ({
        ...current,
        studioName: nextDraft.name,
        currencyCode: nextDraft.currencyCode,
        timeZone: nextDraft.timeZone,
      }));
      notify("Workspace settings saved.", "success");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Workspace settings could not be saved.",
        "warning"
      );
    }
  }
  const settingsNavigation = [
    { id: "workspace" as const, label: "Workspace", icon: FolderKanban },
    { id: "workflow" as const, label: "Workflow", icon: History },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "permissions" as const, label: "Permissions", icon: LockKeyhole },
    { id: "integrations" as const, label: "Integrations", icon: Plug },
    { id: "appearance" as const, label: "Appearance", icon: Palette },
    { id: "regional" as const, label: "Regional", icon: Globe2 },
  ];

  function updateNotification(name: string, enabled: boolean) {
    setSettings({
      ...settings,
      notifications: { ...settings.notifications, [name]: enabled },
    });
    notify(
      `${name} notifications ${enabled ? "enabled" : "disabled"}.`,
      "info"
    );
  }

  function updateStage(index: number, value: string) {
    const projectStages = [...settings.projectStages];
    projectStages[index] = value;
    setSettings({ ...settings, projectStages });
  }

  function removeStage(index: number) {
    setSettings({
      ...settings,
      projectStages: settings.projectStages.filter(
        (_, stageIndex) => stageIndex !== index
      ),
    });
  }

  function updateProjectTag(index: number, value: string) {
    const projectTags = [...settings.projectTags];
    const previous = projectTags[index];
    projectTags[index] = value;
    const nextSalaryWorkType =
      previous && previous === settings.salaryWorkType
        ? value
        : settings.salaryWorkType;
    setSettings({
      ...settings,
      projectTags,
      salaryWorkType: nextSalaryWorkType,
    });
  }

  function addProjectTag() {
    setSettings({
      ...settings,
      projectTags: [
        ...settings.projectTags,
        nextProjectTagName(settings.projectTags),
      ],
    });
  }

  function removeProjectTag(index: number) {
    const removed = settings.projectTags[index];
    const projectTags = settings.projectTags.filter(
      (_, tagIndex) => tagIndex !== index
    );
    const salaryWorkType =
      removed === settings.salaryWorkType
        ? projectTags[0]
        : settings.salaryWorkType;
    setSettings({ ...settings, projectTags, salaryWorkType });
  }

  function updateSalaryBatchSize(value: string) {
    setSettings({
      ...settings,
      salaryBatchSize: normalizedSalaryBatchSize(
        Number(value || defaultSalaryBatchSize)
      ),
    });
  }

  function updateSalaryBatchAmount(value: string) {
    setSettings({
      ...settings,
      salaryBatchAmount: normalizedSalaryBatchAmount(
        Number(value || defaultSalaryBatchAmount)
      ),
    });
  }

  function resetSettings() {
    setSettings({
      ...defaultSettings,
      customClients: [...defaultSettings.customClients],
      clients: defaultSettings.clients.map((client) => ({ ...client })),
      customProjectTemplates: defaultSettings.customProjectTemplates.map(
        (template) => ({
          ...template,
          workflowStages: template.workflowStages.map((stage) => ({
            ...stage,
          })),
          deliverables: template.deliverables.map((item) => ({ ...item })),
          checklistItems: [...template.checklistItems],
        })
      ),
      projectTags: [...defaultSettings.projectTags],
      projectStages: [...defaultSettings.projectStages],
      notifications: { ...defaultSettings.notifications },
      integrationConfigs: JSON.parse(JSON.stringify(defaultIntegrationConfigs)),
      integrationLinks: {},
      teamMembers: defaultSettings.teamMembers.map((m) => ({ ...m })),
      rolePermissions: JSON.parse(JSON.stringify(defaultRolePermissions)),
    });
    notify("Settings reset to defaults.", "warning");
  }

  function downloadBackup() {
    const url = URL.createObjectURL(
      new Blob([exportBackup()], { type: "application/json" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `relay-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function restoreBackup(file: File) {
    try {
      const counts = await importBackup(await file.text());
      notify(
        `Imported ${counts.projects} projects, ${counts.clients} clients, ${counts.projectGroups} Project Groups, ${counts.resources} resources, and ${counts.salaryBatches} salary batches.`
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Backup import failed.",
        "warning"
      );
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
  }

  function formatTimestamp(iso: string) {
    if (!iso) return "";
    try {
      const date = new Date(iso);
      return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "";
    }
  }

  return (
    <WorkspacePage family="administration" mode="fill">
      <PageHeader
        title="Settings"
        description="Manage workspace identity, production defaults, and team-wide behavior."
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium text-[var(--app-muted)]">
              <CircleCheckBig className="size-4 text-[var(--app-success)]" />
              Saved automatically
            </span>
            <OwnedButton
              type="button"
              variant="outline"
              onClick={resetSettings}
              className="text-destructive hover:text-destructive"
            >
              Reset
            </OwnedButton>
          </div>
        }
      />
      <PageContent mode="fill" className="min-h-0">
        <PageToolbar className="lg:hidden" data-family-toolbar="settings">
          <OwnedSelect
            value={activeSection}
            onValueChange={(value) =>
              setActiveSection(value as typeof activeSection)
            }
          >
            <OwnedSelectTrigger
              aria-label="Choose settings section"
              className="w-full"
            >
              <OwnedSelectValue />
            </OwnedSelectTrigger>
            <OwnedSelectContent>
              {settingsNavigation.map(({ id, label }) => (
                <OwnedSelectItem key={id} value={id}>
                  {label}
                </OwnedSelectItem>
              ))}
            </OwnedSelectContent>
          </OwnedSelect>
        </PageToolbar>
        <FillViewport
          bodyLabel="Settings workspace"
          bodyClassName="overflow-visible rounded-[6px] border border-border bg-muted/10 lg:overflow-hidden"
        >
          <MasterDetail
            className="min-h-full lg:h-full lg:min-h-0 lg:overflow-hidden"
            master={
              <nav
                aria-label="Settings sections"
                data-slot="settings-navigation"
                data-navigation-kind="icon-index"
                className="hidden h-full overflow-hidden rounded-[6px] border bg-card text-card-foreground lg:flex lg:flex-col"
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--app-accent)]">
                    Settings index
                  </p>
                </div>
                <div className="grid flex-1 content-start gap-1 overflow-y-auto p-2 overscroll-contain">
                  {settingsNavigation.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      aria-current={activeSection === id ? "page" : undefined}
                      onClick={() => setActiveSection(id)}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-[6px] px-3 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        activeSection === id
                          ? "bg-[var(--app-active)] text-[var(--app-highlight)]"
                          : "text-muted-foreground hover:bg-accent hover:text-primary"
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
                <p className="border-t border-border p-4 text-[11px] leading-5 text-muted-foreground">
                  Changes save automatically to the active workspace.
                </p>
              </nav>
            }
            detail={
              <section
                aria-label={`${settingsNavigation.find((item) => item.id === activeSection)?.label} settings`}
                className={cn(
                  "grid min-h-0 min-w-0 content-start overflow-visible p-1 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pr-2",
                  "gap-3"
                )}
                tabIndex={0}
              >
                {activeSection === "workspace" ? (
                  <>
                    <SettingsPanel
                      id="workspace-profile"
                      title="Workspace profile"
                      subtitle="Shown across project pages, team spaces, and client handoffs."
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FieldLayout label="Workspace name">
                          <OwnedInput
                            value={
                              teamWorkspace
                                ? workspaceDraft.name
                                : settings.studioName
                            }
                            disabled={
                              Boolean(teamWorkspace) && !canManageWorkspace
                            }
                            onChange={(event) =>
                              teamWorkspace
                                ? setWorkspaceDraft((current) => ({
                                    ...current,
                                    name: event.target.value,
                                  }))
                                : setSettings({
                                    ...settings,
                                    studioName: event.target.value,
                                  })
                            }
                            onBlur={() => {
                              if (teamWorkspace && canManageWorkspace)
                                void saveWorkspaceSettings();
                            }}
                          />
                        </FieldLayout>
                        <FieldLayout label="Workspace owner">
                          <OwnedInput
                            value={settings.profileName}
                            onChange={(event) =>
                              setSettings({
                                ...settings,
                                profileName: event.target.value,
                              })
                            }
                          />
                        </FieldLayout>
                        <FieldLayout
                          label="Workspace role"
                          className="sm:col-span-2"
                        >
                          <OwnedInput
                            value={settings.profileTitle}
                            onChange={(event) =>
                              setSettings({
                                ...settings,
                                profileTitle: event.target.value,
                              })
                            }
                          />
                        </FieldLayout>
                      </div>
                      {teamWorkspace ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <ProjectSelect
                            label="Workspace currency"
                            value={workspaceDraft.currencyCode}
                            options={["USD", "EUR", "GBP", "INR", "AED", "SAR"]}
                            disabled={!canManageWorkspace}
                            onChange={(value) => {
                              setWorkspaceDraft((current) => ({
                                ...current,
                                currencyCode: value,
                              }));
                              if (canManageWorkspace)
                                void saveWorkspaceSettings({
                                  currencyCode: value,
                                });
                            }}
                          />
                          <FieldLayout label="Time zone">
                            <OwnedInput
                              value={workspaceDraft.timeZone}
                              disabled={!canManageWorkspace}
                              onChange={(event) =>
                                setWorkspaceDraft((current) => ({
                                  ...current,
                                  timeZone: event.target.value,
                                }))
                              }
                              onBlur={() => {
                                if (canManageWorkspace)
                                  void saveWorkspaceSettings();
                              }}
                            />
                          </FieldLayout>
                          <ProjectSelect
                            label="Default workflow template"
                            value={
                              workflowTemplateIds.includes(
                                workspaceDraft.defaultWorkflowTemplateId
                              )
                                ? workspaceDraft.defaultWorkflowTemplateId
                                : (workflowTemplateIds[0] ??
                                  "relay-default-workflow")
                            }
                            options={
                              workflowTemplateIds.length
                                ? workflowTemplateIds
                                : ["relay-default-workflow"]
                            }
                            labels={workflowTemplateLabels}
                            disabled={!canManageWorkspace}
                            onChange={(value) => {
                              setWorkspaceDraft((current) => ({
                                ...current,
                                defaultWorkflowTemplateId: value,
                              }));
                              if (canManageWorkspace)
                                void saveWorkspaceSettings({
                                  defaultWorkflowTemplateId: value,
                                });
                            }}
                          />
                          <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                            <span>
                              <span className="block font-medium">
                                Editors see all Team Projects
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                Otherwise Editors see owned or assigned work.
                              </span>
                            </span>
                            <OwnedSwitch
                              checked={workspaceDraft.allowAllTeamProjects}
                              disabled={!canManageWorkspace}
                              aria-label="Editors see all Team Projects"
                              onCheckedChange={(checked) => {
                                setWorkspaceDraft((current) => ({
                                  ...current,
                                  allowAllTeamProjects: checked,
                                }));
                                if (canManageWorkspace)
                                  void saveWorkspaceSettings({
                                    allowAllTeamProjects: checked,
                                  });
                              }}
                            />
                          </label>
                        </div>
                      ) : null}
                    </SettingsPanel>
                    <SettingsPanel
                      id="workspace-backup"
                      title="Backup and restore"
                      subtitle="Export local Workspace data without account or connected-service details."
                    >
                      <div className="flex flex-wrap gap-2">
                        <OwnedButton
                          type="button"
                          variant="outline"
                          onClick={downloadBackup}
                        >
                          <Download aria-hidden="true" /> Export backup
                        </OwnedButton>
                        <OwnedButton
                          type="button"
                          variant="outline"
                          onClick={() => backupInputRef.current?.click()}
                        >
                          <Upload aria-hidden="true" /> Import backup
                        </OwnedButton>
                        <input
                          ref={backupInputRef}
                          type="file"
                          accept="application/json,.json"
                          className="sr-only"
                          aria-label="Choose Relay backup"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void restoreBackup(file);
                          }}
                        />
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Import replaces Local Mode data. Cloud import works only
                        when the Workspace has no projects, files, or Salary
                        Batches.
                      </p>
                    </SettingsPanel>
                    <SettingsPanel
                      id="project-rules"
                      title="Production defaults"
                      subtitle="Legacy local fallback for project tags and salary batch defaults. Authenticated owners should use Salary Plans below."
                    >
                      <div className="grid gap-3">
                        {settings.projectTags.map((tag, index) => (
                          <div
                            key={`project-tag-${index}`}
                            className="flex min-w-0 items-end gap-3"
                          >
                            <FieldLayout
                              label={`Tag ${index + 1}`}
                              className="min-w-0 flex-1"
                            >
                              <OwnedInput
                                value={tag}
                                aria-label={`Project tag ${index + 1}`}
                                aria-invalid={Boolean(tagIssues && !tag.trim())}
                                onChange={(event) =>
                                  updateProjectTag(index, event.target.value)
                                }
                              />
                            </FieldLayout>
                            <OwnedButton
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove project tag ${index + 1}`}
                              title="Remove tag"
                              disabled={settings.projectTags.length <= 1}
                              onClick={() => removeProjectTag(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 aria-hidden="true" />
                            </OwnedButton>
                          </div>
                        ))}
                        <OwnedButton
                          type="button"
                          variant="outline"
                          onClick={addProjectTag}
                          className="justify-self-start"
                        >
                          <Plus aria-hidden="true" />
                          Add Tag
                        </OwnedButton>
                        {tagIssues ? (
                          <p role="alert" className="text-sm text-destructive">
                            {tagIssues}
                          </p>
                        ) : null}
                        <div className="grid gap-3 pt-1 md:grid-cols-3">
                          <ProjectSelect
                            label="Salary Tag"
                            value={canonicalWorkType(
                              settings.salaryWorkType,
                              settings.projectTags
                            )}
                            options={settings.projectTags}
                            onChange={(value) =>
                              setSettings({
                                ...settings,
                                salaryWorkType: value,
                              })
                            }
                          />
                          <FieldLayout label="Legacy videos per batch">
                            <OwnedInput
                              type="number"
                              value={normalizedSalaryBatchSize(
                                settings.salaryBatchSize
                              )}
                              min={1}
                              step={1}
                              onChange={(event) =>
                                updateSalaryBatchSize(event.target.value)
                              }
                            />
                          </FieldLayout>
                          <FieldLayout label="Legacy salary per batch">
                            <OwnedInput
                              type="number"
                              value={normalizedSalaryBatchAmount(
                                settings.salaryBatchAmount
                              )}
                              min={1}
                              step={1}
                              onChange={(event) =>
                                updateSalaryBatchAmount(event.target.value)
                              }
                            />
                          </FieldLayout>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Completed projects tagged "
                          {canonicalWorkType(
                            settings.salaryWorkType,
                            settings.projectTags
                          )}
                          " count toward{" "}
                          {normalizedSalaryBatchSize(settings.salaryBatchSize)}{" "}
                          videos per salary batch worth{" "}
                          {money(
                            normalizedSalaryBatchAmount(
                              settings.salaryBatchAmount
                            ),
                            settings.currencyCode
                          )}
                          .
                        </p>
                      </div>
                    </SettingsPanel>
                  </>
                ) : null}
                {activeSection === "workflow" ? (
                  <SettingsPanel
                    id="workflow"
                    title="Project Stages"
                    subtitle="Default workflow stages for new work."
                  >
                    {settings.projectStages.map((stage, index) => (
                      <div
                        key={`project-stage-${index}`}
                        className="flex items-center gap-3"
                      >
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              stageColors[index % stageColors.length],
                          }}
                        />
                        <OwnedInput
                          value={stage}
                          aria-label={`Workflow stage ${index + 1}`}
                          aria-invalid={Boolean(stageIssues && !stage.trim())}
                          onChange={(event) =>
                            updateStage(index, event.target.value)
                          }
                          className="min-w-0 flex-1"
                        />
                        <OwnedButton
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove workflow stage ${index + 1}`}
                          title="Remove stage"
                          disabled={settings.projectStages.length <= 1}
                          onClick={() => removeStage(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 aria-hidden="true" />
                        </OwnedButton>
                      </div>
                    ))}
                    <OwnedButton
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          projectStages: [
                            ...settings.projectStages,
                            nextStageName(settings.projectStages),
                          ],
                        })
                      }
                      className="justify-self-start"
                    >
                      <Plus aria-hidden="true" />
                      Add Stage
                    </OwnedButton>
                    {stageIssues ? (
                      <p role="alert" className="text-sm text-destructive">
                        {stageIssues}
                      </p>
                    ) : null}
                  </SettingsPanel>
                ) : null}
                {activeSection === "notifications" ? (
                  <SettingsPanel
                    id="notifications"
                    title="Notifications"
                    subtitle="Choose when project and team events should surface."
                  >
                    {Object.keys(defaultSettings.notifications).map((item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between gap-4 border-b py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {item}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {notificationCopy(item)}
                          </p>
                        </div>
                        <OwnedSwitch
                          checked={Boolean(settings.notifications[item])}
                          aria-label={`${item} notifications`}
                          onCheckedChange={(checked) =>
                            updateNotification(item, checked)
                          }
                        />
                      </div>
                    ))}
                    <SettingsLink
                      label="Toggle weekly summary"
                      onClick={() =>
                        updateNotification(
                          "Weekly summary",
                          !settings.notifications["Weekly summary"]
                        )
                      }
                    />
                    <div className="flex items-center justify-between gap-4 border-t pt-4">
                      <div>
                        <p className="text-sm font-semibold">
                          Optional product analytics
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Anonymous feature-use events only. Work content and
                          money never leave the privacy boundary.
                        </p>
                      </div>
                      <OwnedSwitch
                        checked={optionalAnalytics}
                        aria-label="Optional product analytics"
                        onCheckedChange={(checked) => {
                          setOptionalAnalytics(checked);
                          setAnalyticsConsent(checked ? "granted" : "denied");
                        }}
                      />
                    </div>
                  </SettingsPanel>
                ) : null}
                {activeSection === "permissions" ? (
                  <SettingsPanel
                    id="permissions"
                    title="Team Roles & Permissions"
                    subtitle="Convex enforces these fixed workspace roles on every shared action."
                  >
                    <div className="grid gap-3 lg:grid-cols-3">
                      {rolePolicy.map(({ role, permissions }) => (
                        <div
                          key={role}
                          className="border-t-2 bg-muted p-4"
                          style={{
                            borderTopColor:
                              role === "Owner"
                                ? accent
                                : role === "Editor"
                                  ? warningColor
                                  : successColor,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="size-2 rounded-full"
                              style={{
                                backgroundColor:
                                  role === "Owner"
                                    ? accent
                                    : role === "Editor"
                                      ? warningColor
                                      : successColor,
                              }}
                            />
                            <h3 className="text-sm font-semibold text-foreground">
                              {role}
                            </h3>
                          </div>
                          <ul className="mt-3 grid gap-2">
                            {permissions.map((permission) => (
                              <li
                                key={permission}
                                className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"
                              >
                                <Check
                                  aria-hidden="true"
                                  className="mt-0.5 size-4 shrink-0 text-primary"
                                />
                                <span>{permission}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Clients collaborate through private Client Portal links
                      and are not workspace members.
                    </p>
                  </SettingsPanel>
                ) : null}
                {activeSection === "integrations" ? (
                  <div id="integrations" className="scroll-mt-6">
                    <IntegrationLinkManager
                      title="Integrations"
                      subtitle="Save workspace-level links for storage, messaging, calendars, and review tools."
                      links={settings.integrationLinks}
                      emptyTitle="No integration links configured"
                      emptyBody="Add links to shared folders, calendars, review pages, or team channels. This does not connect to external APIs."
                      onChange={(integrationLinks) => {
                        setSettings({ ...settings, integrationLinks });
                        notify("Integration links updated.", "success");
                      }}
                    />
                  </div>
                ) : null}
                {activeSection === "appearance" ? (
                  <SettingsPanel
                    id="appearance"
                    title="Appearance"
                    subtitle="Customize how Relay looks and feels for your tracker."
                  >
                    <div className="grid items-end gap-5 md:grid-cols-2">
                      <SegmentedSetting
                        label="Theme"
                        options={["Light", "Dark", "System"]}
                        active={settings.theme}
                        onChange={(value) =>
                          setSettings({ ...settings, theme: value })
                        }
                      />
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Accent Color
                        </p>
                        <div className="flex gap-3">
                          {[
                            cutlab.color.teal,
                            cutlab.color.cyan,
                            cutlab.color.sky,
                            cutlab.color.indigo,
                            cutlab.color.pink,
                            cutlab.color.deepTeal,
                          ].map((color) => (
                            <button
                              key={color}
                              type="button"
                              aria-label={`Use accent color ${color}`}
                              aria-pressed={settings.accentColor === color}
                              onClick={() =>
                                setSettings({ ...settings, accentColor: color })
                              }
                              className={`size-7 cursor-pointer rounded-full border transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${settings.accentColor === color ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-card" : "border-border"}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </SettingsPanel>
                ) : null}
                {activeSection === "regional" ? (
                  <SettingsPanel
                    id="regional"
                    title="Regional Preferences"
                    subtitle="Choose the currency used for earnings and payout totals."
                  >
                    <div className="grid gap-5 md:grid-cols-2">
                      <ProjectSelect
                        label="Currency"
                        value={
                          currencyLabels[settings.currencyCode] ??
                          settings.currencyCode
                        }
                        options={currencyOptions.map(
                          (code) => currencyLabels[code]
                        )}
                        onChange={(value) => {
                          const nextCode =
                            Object.entries(currencyLabels).find(
                              ([, label]) => label === value
                            )?.[0] ?? settings.currencyCode;
                          setSettings({ ...settings, currencyCode: nextCode });
                          notify(`Currency changed to ${nextCode}.`, "info");
                        }}
                      />
                      <FieldLayout label="Preview">
                        <OwnedInput
                          value={money(12500, settings.currencyCode)}
                          readOnly
                        />
                      </FieldLayout>
                    </div>
                  </SettingsPanel>
                ) : null}
              </section>
            }
          />
        </FillViewport>
      </PageContent>
    </WorkspacePage>
  );
}

function OrganizationProfilePage({
  projects,
  settings,
  stats,
}: {
  projects: WorkItem[];
  settings: SettingsState;
  stats: {
    active: number;
    delivered: number;
    earned: number;
    salaryEdits: number;
  };
}) {
  const membersByRole = settings.teamMembers.reduce<Record<string, number>>(
    (roles, member) => {
      roles[member.role] = (roles[member.role] || 0) + 1;
      return roles;
    },
    {}
  );
  const activeProjects = projects
    .filter((project) => !isDoneStatus(project.status))
    .slice(0, 6);

  return (
    <WorkspacePage family="administration">
      <PageHeader
        eyebrow="Workspace / Organization"
        title="Organization Profile"
        description="Studio-level view for team ownership, delivery context, and active work."
      />
      <PageContent className="space-y-5">
        <MetricStrip columns={4} aria-label="Organization metrics">
          <MetricItem
            icon={<Building2 aria-hidden="true" />}
            label="Studio"
            value={settings.studioName}
            supporting="Local tracker"
          />
          <MetricItem
            icon={<Users aria-hidden="true" />}
            label="Team Members"
            value={String(settings.teamMembers.length)}
            supporting={`${Object.keys(membersByRole).length} active roles`}
          />
          <MetricItem
            icon={<FolderKanban aria-hidden="true" />}
            label="Active Work"
            value={String(stats.active)}
            supporting={`${stats.delivered} delivered`}
          />
          <MetricItem
            icon={<BadgeDollarSign aria-hidden="true" />}
            label="Tracked Value"
            value={money(stats.earned, settings.currencyCode)}
            supporting={`${stats.salaryEdits} salary edits`}
          />
        </MetricStrip>

        <SplitPane
          ratio="balanced"
          primary={
            <section
              aria-labelledby="organization-team-heading"
              className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-[var(--app-shadow-1)]"
            >
              <div className="flex items-center gap-2">
                <Users className="size-5 text-primary" aria-hidden="true" />
                <h2
                  id="organization-team-heading"
                  className="text-xl font-semibold tracking-tight"
                >
                  Team access
                </h2>
              </div>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Members and permissions are stored locally for this team.
              </p>
              {settings.teamMembers.length ? (
                <ul
                  aria-label="Organization team members"
                  className="mt-4 max-h-[min(460px,55dvh)] space-y-2.5 overflow-y-auto overscroll-contain pr-1"
                >
                  {settings.teamMembers.map((member) => (
                    <li
                      key={member.id}
                      className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-muted/30 p-2.5"
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                      >
                        {initials(member.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">
                          {member.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {member.email || "No email saved"}
                        </span>
                      </span>
                      <OwnedBadge
                        variant="outline"
                        className="rounded-md bg-card"
                      >
                        {member.role}
                      </OwnedBadge>
                    </li>
                  ))}
                </ul>
              ) : (
                <OrganizationEmptyState
                  icon={<Users aria-hidden="true" />}
                  title="No team members yet"
                  body="Add team members from the Team page to populate this organization view."
                />
              )}
            </section>
          }
          secondary={
            <section
              aria-labelledby="organization-work-heading"
              className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-[var(--app-shadow-1)]"
            >
              <div className="flex items-center gap-2">
                <FolderKanban
                  className="size-5 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <h2
                    id="organization-work-heading"
                    className="text-xl font-semibold tracking-tight"
                  >
                    Active organization work
                  </h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Current queue across the studio.
                  </p>
                </div>
              </div>
              {activeProjects.length ? (
                <ul
                  aria-label="Active organization projects"
                  className="mt-4 max-h-[min(460px,55dvh)] divide-y divide-border overflow-y-auto overscroll-contain pr-1"
                >
                  {activeProjects.map((project) => (
                    <li
                      key={project.id}
                      className="grid items-center gap-2 py-3 md:grid-cols-[minmax(0,1fr)_160px_130px] md:gap-4"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {project.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {project.client || project.workType}
                        </span>
                      </span>
                      <time
                        dateTime={project.dueDate}
                        className="text-[13px] text-muted-foreground"
                      >
                        {formatDate(project.dueDate, settings.dateFormat)}
                      </time>
                      <OrganizationStatusBadge status={project.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <OrganizationEmptyState
                  icon={<FolderKanban aria-hidden="true" />}
                  title="No active organization work"
                  body="Active projects appear here after new work is planned."
                />
              )}
            </section>
          }
        />
      </PageContent>
    </WorkspacePage>
  );
}

function OrganizationEmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="mt-4 grid min-h-40 place-items-center rounded-md border border-dashed border-border bg-muted/20 p-6 text-center">
      <div>
        <span className="mx-auto grid size-10 place-items-center rounded-full bg-primary/10 text-primary [&_svg]:size-5">
          {icon}
        </span>
        <h3 className="mt-3 text-sm font-semibold">{title}</h3>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}

function OrganizationStatusBadge({ status }: { status: string }) {
  return (
    <OwnedBadge
      variant={
        isDoneStatus(status)
          ? "default"
          : status === "Cancelled"
            ? "destructive"
            : status === "In Progress"
              ? "secondary"
              : "outline"
      }
      className="rounded-md px-2 py-1 font-semibold"
    >
      {status}
    </OwnedBadge>
  );
}

function ProfileDesignPage({
  projects,
  stats,
  settings,
}: {
  projects: WorkItem[];
  stats: { active: number; delivered: number; avgTurnaroundDays: number };
  settings: SettingsState;
}) {
  const { isSignedIn } = useData();
  const publishPublicProfile = useMutation(api.publicProfiles.publish);
  const timeline = [...projects]
    .sort((a, b) => dateTime(a.dueDate) - dateTime(b.dueDate))
    .slice(0, 5);
  const publicActiveProjects = publicMetric(settings.publicActiveProjects);
  const publicDeliveredEdits = publicMetric(settings.publicDeliveredEdits);
  const publicTurnaroundDays = Math.max(
    1,
    publicMetric(settings.publicTurnaroundDays, 3)
  );
  const currentTurnaround = `${publicTurnaroundDays}`;
  const [shareCopied, setShareCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  async function shareProfile() {
    const slug = publicProfileSlug(settings);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/u/${slug}`;
    const text = `${profileDisplayName(settings)} - ${settings.profileTitle || "Video Editor"}`;
    try {
      if (!isSignedIn) throw new Error("Sign in to publish a public profile.");
      setShareMessage("");
      await publishPublicProfile({
        slug,
        studioName: settings.studioName,
        profileName: profileDisplayName(settings),
        profileUsername: slug,
        profileTitle: settings.profileTitle,
        profileBio: settings.profileBio,
        profileLocation: settings.profileLocation,
        profileImageUrl: settings.profileImageUrl,
        timeZone: settings.timeZone,
        activeProjects: publicActiveProjects,
        deliveredEdits: publicDeliveredEdits,
        avgTurnaroundDays: publicTurnaroundDays,
        projects: timeline.map((project) => ({
          title: project.title,
          status: project.status,
          workType: project.workType,
          dueDate: project.dueDate,
        })),
      });
      if (navigator.share) {
        await navigator.share({ title: text, text, url });
        return;
      }
      if (await copyText(url)) {
        setShareCopied(true);
        setShareMessage(`Public profile published: /u/${slug}`);
        window.setTimeout(() => setShareCopied(false), 1400);
      }
    } catch (error) {
      setShareCopied(false);
      setShareMessage(
        error instanceof Error
          ? error.message
          : "Could not publish public profile."
      );
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1480px] bg-background px-4 py-5 text-foreground md:px-8 md:py-7 xl:px-10">
      <header className="flex flex-col items-stretch justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
        <CutLabLockup compact subtitle="Video editing tracker" />
        <OwnedButton
          type="button"
          variant="outline"
          className="min-h-10"
          onClick={shareProfile}
        >
          <Share2 aria-hidden="true" />
          {shareCopied ? "Published + Copied" : "Share Profile"}
        </OwnedButton>
      </header>
      {shareMessage ? (
        <p
          role="status"
          aria-live="polite"
          className={`mb-1 text-right text-[13px] ${shareMessage.startsWith("Public profile") ? "text-primary" : "text-destructive"}`}
        >
          {shareMessage}
        </p>
      ) : null}

      <main className="mt-5">
        <section
          aria-labelledby="public-profile-name"
          className="grid items-center gap-8 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-[var(--app-shadow-1)] md:p-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(420px,0.8fr)] lg:gap-14"
        >
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <PublicProfileAvatar settings={settings} size={128} fontSize={36} />
            <div>
              <h1
                id="public-profile-name"
                className="text-[34px] font-bold leading-[1.1] tracking-[-0.03em]"
              >
                {profileDisplayName(settings)}
              </h1>
              {displayUsername(settings) ? (
                <p className="mt-1.5 text-sm font-semibold text-primary">
                  {displayUsername(settings)}
                </p>
              ) : null}
              <p className="mt-2 text-[15px]">{settings.profileTitle}</p>
              <p className="mt-4 max-w-[420px] text-sm leading-relaxed text-muted-foreground">
                {settings.profileBio}
              </p>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground">
                <ProfileDetail
                  icon={<MapPin />}
                  text={settings.profileLocation}
                />
                <ProfileDetail icon={<Globe2 />} text={settings.timeZone} />
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border bg-muted/20 py-4">
            <ProfileMetric
              icon={<Play />}
              label="Active"
              sublabel="projects"
              value={String(publicActiveProjects)}
            />
            <ProfileMetric
              icon={<CircleCheckBig />}
              label="Delivered"
              sublabel="edits"
              value={String(publicDeliveredEdits)}
            />
            <ProfileMetric
              icon={<Clock3 />}
              label="Turnaround"
              sublabel="average"
              value={`${currentTurnaround}d`}
            />
          </dl>
        </section>

        <section
          aria-labelledby="recent-work-heading"
          className="mt-5 grid items-start gap-6 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-[var(--app-shadow-1)] md:p-8 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-12"
        >
          <div className="xl:sticky xl:top-6">
            <h2
              id="recent-work-heading"
              className="text-2xl font-semibold leading-tight tracking-[-0.025em]"
            >
              Recent work
            </h2>
            <p className="mt-2 max-w-[230px] text-[13px] leading-relaxed text-muted-foreground">
              Recent delivery history and near-term work from the tracker.
            </p>
          </div>
          {timeline.length ? (
            <ol
              className="relative md:pl-6"
              aria-label="Recent project timeline"
            >
              <span
                aria-hidden="true"
                className="absolute bottom-3 left-2 top-3 hidden w-0.5 rounded-full bg-border md:block"
              />
              {timeline.map((project) => (
                <li
                  key={project.id}
                  className="relative grid items-start gap-3 border-b py-5 last:border-b-0 md:grid-cols-[120px_minmax(0,1fr)_130px] md:gap-5"
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-[-24px] top-[22px] hidden size-3.5 rounded-full border-[3px] border-card ring-1 ring-border md:block"
                    style={{
                      backgroundColor: projectTimelineColor(project.status),
                    }}
                  />
                  <div>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: projectTimelineColor(project.status) }}
                    >
                      {profileStatusLabel(project.status)}
                    </p>
                    <time
                      dateTime={project.dueDate}
                      className="mt-1 block text-xs text-muted-foreground"
                    >
                      {formatDate(project.dueDate, settings.dateFormat)}
                    </time>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">{project.title}</h3>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      {project.client || project.workType}
                    </p>
                    <p className="mt-2 max-w-[620px] text-[13px] leading-relaxed text-muted-foreground">
                      {project.notes || "No notes saved for this project."}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <p className="text-[13px] font-semibold">
                      {Math.max(
                        1,
                        daysBetween(project.startDate, project.dueDate)
                      )}{" "}
                      days
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      turnaround
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <ProfileEmptyState
              title="No projects available"
              body="Projects will appear here once the tracker has saved records."
            />
          )}
        </section>
      </main>
      <footer className="mt-6 text-center text-[13px] text-muted-foreground">
        Shared from {settings.studioName} - Video Editing Tracker &nbsp; |
        &nbsp; Updated {formatDate(iso(todayDate()), settings.dateFormat)},{" "}
        {todayDate().getFullYear()}
      </footer>
    </div>
  );
}

function ProfileEditPage({
  settings,
  setSettings,
}: {
  settings: SettingsState;
  setSettings: (settings: SettingsState) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUrlError =
    settings.profileImageUrl.trim() &&
    !isValidProfileImageSource(settings.profileImageUrl)
      ? "Use an http(s) image URL or upload an image file."
      : undefined;

  async function uploadProfileImage(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSettings({ ...settings, profileImageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <WorkspacePage family="administration">
      <PageHeader
        eyebrow="Workspace / Profile"
        title="Edit Profile"
        description="Update the identity shown on your public profile."
      />

      <PageContent className="space-y-5">
        <MasterDetail
          master={
            <aside
              aria-label="Profile photo"
              className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-[var(--app-shadow-1)] sm:p-6"
            >
              <div className="grid place-items-center">
                <ProfileEditAvatar settings={settings} />
              </div>
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept="image/*"
                onChange={uploadProfileImage}
              />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <OwnedButton
                  type="button"
                  variant="outline"
                  className="min-h-10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload aria-hidden="true" />
                  Upload Photo
                </OwnedButton>
                <OwnedButton
                  type="button"
                  variant="outline"
                  disabled={!settings.profileImageUrl}
                  onClick={() =>
                    setSettings({ ...settings, profileImageUrl: "" })
                  }
                >
                  <Trash2 aria-hidden="true" />
                  Clear
                </OwnedButton>
              </div>
              <p className="mx-auto mt-4 max-w-[260px] text-center text-[13px] leading-relaxed text-muted-foreground">
                Upload an image or paste an image URL below. The latest saved
                photo will appear anywhere your profile is shown.
              </p>
            </aside>
          }
          detail={
            <div className="grid gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-[var(--app-shadow-1)] sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldLayout label="Profile Name">
                  <OwnedInput
                    value={settings.profileName}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        profileName: event.target.value,
                      })
                    }
                  />
                </FieldLayout>
                <FieldLayout
                  label="Username"
                  description={`Public profile: /u/${publicProfileSlug(settings)}`}
                >
                  <OwnedInput
                    value={settings.profileUsername}
                    placeholder="@yourname"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        profileUsername: sanitizeUsername(event.target.value),
                      })
                    }
                  />
                </FieldLayout>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FieldLayout label="Profile Title">
                  <OwnedInput
                    value={settings.profileTitle}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        profileTitle: event.target.value,
                      })
                    }
                  />
                </FieldLayout>
                <FieldLayout label="Profile Image URL" error={imageUrlError}>
                  <OwnedInput
                    inputMode="url"
                    value={settings.profileImageUrl}
                    placeholder="https://example.com/photo.jpg"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        profileImageUrl: event.target.value.trim(),
                      })
                    }
                  />
                </FieldLayout>
              </div>

              <FieldLayout label="Profile Bio">
                <OwnedTextarea
                  rows={3}
                  value={settings.profileBio}
                  onChange={(event) =>
                    setSettings({ ...settings, profileBio: event.target.value })
                  }
                />
              </FieldLayout>
              <FieldLayout label="Profile Location">
                <OwnedInput
                  value={settings.profileLocation}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      profileLocation: event.target.value,
                    })
                  }
                />
              </FieldLayout>

              <ContentSection
                title="Public Profile Stats"
                description="These are portfolio-facing numbers. They do not need to match your private tracker totals."
                className="shadow-none"
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <FieldLayout label="Active Projects">
                    <OwnedInput
                      type="number"
                      min={0}
                      step={1}
                      value={publicMetric(settings.publicActiveProjects)}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          publicActiveProjects: publicMetric(
                            Number(event.target.value)
                          ),
                        })
                      }
                    />
                  </FieldLayout>
                  <FieldLayout label="Delivered Edits">
                    <OwnedInput
                      type="number"
                      min={0}
                      step={1}
                      value={publicMetric(settings.publicDeliveredEdits)}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          publicDeliveredEdits: publicMetric(
                            Number(event.target.value)
                          ),
                        })
                      }
                    />
                  </FieldLayout>
                  <FieldLayout label="Turnaround Days">
                    <OwnedInput
                      type="number"
                      min={1}
                      step={1}
                      value={Math.max(
                        1,
                        publicMetric(settings.publicTurnaroundDays, 3)
                      )}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          publicTurnaroundDays: Math.max(
                            1,
                            publicMetric(Number(event.target.value), 3)
                          ),
                        })
                      }
                    />
                  </FieldLayout>
                </div>
              </ContentSection>

              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileEditSelect
                  label="Time Zone"
                  value={settings.timeZone}
                  options={[
                    "Asia/Dubai",
                    "Pacific Time",
                    "Eastern Time",
                    "UTC",
                  ]}
                  onChange={(value) =>
                    setSettings({ ...settings, timeZone: value })
                  }
                />
                <ProfileEditSelect
                  label="Date Format"
                  value={settings.dateFormat}
                  options={["Month Day, Year", "Day Month Year", "YYYY-MM-DD"]}
                  onChange={(value) =>
                    setSettings({ ...settings, dateFormat: value })
                  }
                />
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium">
                  Week Start Day
                </legend>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <OwnedButton
                        type="button"
                        key={day}
                        variant={
                          settings.weekStart === day ? "default" : "outline"
                        }
                        aria-pressed={settings.weekStart === day}
                        onClick={() =>
                          setSettings({ ...settings, weekStart: day })
                        }
                        className="min-w-0 px-2 text-xs"
                      >
                        {day}
                      </OwnedButton>
                    )
                  )}
                </div>
              </fieldset>
            </div>
          }
        />
      </PageContent>
    </WorkspacePage>
  );
}

function ProfileEditAvatar({ settings }: { settings: SettingsState }) {
  const imageUrl = settings.profileImageUrl.trim();

  return (
    <div className="grid size-40 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-muted text-5xl font-bold text-foreground">
      {imageUrl ? (
        <img
          className="size-full object-cover"
          src={imageUrl}
          alt={profileDisplayName(settings)}
        />
      ) : (
        <span aria-hidden="true">{initials(settings.profileName)}</span>
      )}
    </div>
  );
}

function ProfileEditSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <OwnedSelect
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as T)}
    >
      <FieldLayout label={label}>
        <OwnedSelectTrigger className="w-full">
          <OwnedSelectValue>{value}</OwnedSelectValue>
        </OwnedSelectTrigger>
      </FieldLayout>
      <OwnedSelectContent position="popper">
        {options.map((option) => (
          <OwnedSelectItem key={option} value={option}>
            {option}
          </OwnedSelectItem>
        ))}
      </OwnedSelectContent>
    </OwnedSelect>
  );
}

function NotificationBell({ settings }: { settings: SettingsState }) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { isSignedIn, isLoaded: isUserLoaded } = useOptionalAuth();
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth();
  const teamData = useQuery(
    api.team.getMyWorkspace,
    isConvexAuthenticated ? {} : "skip"
  );
  const markNotificationRead = useMutation(api.team.markNotificationRead);
  const markAllNotificationsRead = useMutation(
    api.team.markAllNotificationsRead
  );
  const enabledNotifications = Object.entries(settings.notifications).filter(
    ([, enabled]) => enabled
  );
  const teamNotifications = teamData?.notifications ?? [];
  const unreadCount = teamNotifications.filter(
    (notification) => !notification.read
  ).length;
  const teamNotificationSyncUnavailable = Boolean(
    isUserLoaded && isSignedIn && !isConvexAuthLoading && !isConvexAuthenticated
  );

  return (
    <OwnedPopover open={notificationOpen} onOpenChange={setNotificationOpen}>
      <OwnedPopoverTrigger asChild>
        <OwnedButton
          type="button"
          variant="ghost"
          size="icon"
          title="Notifications"
          aria-label="Open notifications"
          aria-haspopup="dialog"
          className="relative text-[var(--app-ink)]"
        >
          <Bell aria-hidden="true" className="size-[18px]" />
          {unreadCount ? (
            <span
              className={`absolute grid h-[17px] place-items-center rounded-full border-2 border-[var(--app-panel)] bg-[var(--app-danger)] text-[9px] leading-none font-extrabold text-white ${
                unreadCount > 9
                  ? "-right-1 top-px min-w-6 px-1"
                  : "top-1 right-0.5 min-w-[17px]"
              }`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : enabledNotifications.length ? (
            <span className="absolute top-1.5 right-[7px] size-2 rounded-full border border-[var(--app-panel)] bg-[var(--app-accent)]" />
          ) : null}
        </OwnedButton>
      </OwnedPopoverTrigger>
      <OwnedPopoverContent
        align="end"
        role="dialog"
        aria-label="Notifications"
        className="w-[290px] border-[var(--app-border)] bg-[var(--app-panel)] p-0 text-[var(--app-ink)] shadow-none"
      >
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold">Notifications</h2>
            {teamData && unreadCount ? (
              <OwnedButton
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  markAllNotificationsRead({
                    teamId: teamData.workspace._id,
                  }).catch(() => undefined);
                }}
                className="h-auto px-0 py-0 text-[11px] font-semibold text-[var(--app-accent)] hover:bg-transparent"
              >
                Mark all read
              </OwnedButton>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">
            {isConvexAuthLoading
              ? "Connecting team notifications..."
              : teamNotificationSyncUnavailable
                ? "Team notifications are not connected"
                : teamNotifications.length
                  ? `${unreadCount} unread team notification${unreadCount === 1 ? "" : "s"}`
                  : enabledNotifications.length
                    ? `${enabledNotifications.length} notification types enabled`
                    : "No notifications yet"}
          </p>
        </div>
        <div className="border-t border-[var(--app-border)]" />
        {isConvexAuthLoading ? (
          <p className="px-3 py-2.5 text-xs leading-relaxed text-[var(--app-muted)]">
            Waiting for Convex auth before loading Team notifications.
          </p>
        ) : teamNotificationSyncUnavailable ? (
          <p className="px-3 py-2.5 text-xs leading-relaxed text-[var(--app-danger)]">
            Clerk is signed in, but Convex auth is not connected. Check Team
            sync before relying on shared notifications.
          </p>
        ) : teamNotifications.length ? (
          <ul className="max-h-80 overflow-y-auto">
            {teamNotifications.slice(0, 8).map((notification) => (
              <li
                key={notification._id}
                className={`px-3 py-2 ${notification.read ? "bg-[var(--app-panel)]" : "bg-[var(--app-active)]"}`}
              >
                <p className="text-[13px] font-semibold">
                  {notification.message}
                </p>
                <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                  {new Intl.DateTimeFormat("en", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(notification.createdAt))}
                </p>
                {!notification.read ? (
                  <OwnedButton
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      markNotificationRead({
                        notificationId: notification._id,
                      }).catch(() => undefined);
                    }}
                    className="mt-1 h-auto px-0 py-0 text-[11px] font-semibold text-[var(--app-accent)] hover:bg-transparent"
                  >
                    Mark read
                  </OwnedButton>
                ) : null}
                <Link
                  href="/team"
                  onClick={() => {
                    setNotificationOpen(false);
                    if (!notification.read) {
                      void markNotificationRead({
                        notificationId: notification._id,
                      });
                    }
                  }}
                  className="mt-1 inline-flex text-[11px] font-semibold text-[var(--app-accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                >
                  Open Team
                </Link>
              </li>
            ))}
          </ul>
        ) : enabledNotifications.length ? (
          <ul>
            {enabledNotifications.map(([name]) => (
              <li key={name} className="px-3 py-2">
                <p className="text-[13px] font-semibold">{name}</p>
                <p className="text-xs text-[var(--app-muted)]">
                  {notificationCopy(name)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-2.5 text-xs leading-relaxed text-[var(--app-muted)]">
            Turn on deadline, feedback, or weekly summary notifications from
            Settings.
          </p>
        )}
      </OwnedPopoverContent>
    </OwnedPopover>
  );
}

function SettingsPanel({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useHydratedReducedMotion();
  return (
    <motion.div
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.24,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <ContentSection
        id={id}
        title={title}
        description={subtitle}
        className="scroll-mt-[76px] shadow-[var(--app-shadow-1)]"
        bodyClassName="grid min-w-0 gap-3.5 p-4 sm:p-5"
      >
        {children}
      </ContentSection>
    </motion.div>
  );
}

function notificationCopy(item: string) {
  const copy: Record<string, string> = {
    "Project updates": "Status changes, notes, and project activity",
    "Feedback received": "When feedback is added to your projects",
    "Upcoming deadlines": "Daily summary of due dates and overdue items",
    Mentions: "When you are mentioned in comments",
    "Weekly summary": "A recap of projects and tasks every Monday",
  };
  return copy[item] ?? "Tracker notification";
}

function SettingsLink({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <OwnedButton
      type="button"
      variant="link"
      size="sm"
      onClick={onClick}
      className="h-auto justify-self-start px-0 py-0 text-primary"
    >
      {label}
    </OwnedButton>
  );
}

function SegmentedSetting({
  label,
  options,
  active,
  onChange,
}: {
  label: string;
  options: string[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div
        role="group"
        aria-label={label}
        className="grid max-w-[330px] overflow-hidden rounded-md border"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        }}
      >
        {options.map((option) => (
          <OwnedButton
            key={option}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={option === active}
            onClick={() => onChange(option)}
            className={`rounded-none text-xs ${option === options[options.length - 1] ? "" : "border-r"} ${option === active ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary" : "bg-card text-card-foreground hover:bg-muted"}`}
          >
            {option}
          </OwnedButton>
        ))}
      </div>
    </div>
  );
}

function ProfileMetric({
  icon,
  label,
  sublabel,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  value: string;
}) {
  return (
    <div
      className="min-h-[82px] px-4"
      aria-label={`${label} ${sublabel}: ${value}`}
    >
      <span
        aria-hidden="true"
        className="mb-2 grid w-6 place-items-center text-muted-foreground [&_svg]:size-[19px]"
      >
        {icon}
      </span>
      <dd className="text-2xl font-semibold leading-none tabular-nums">
        {value}
      </dd>
      <dt className="mt-1.5 text-xs font-semibold">{label}</dt>
      <dd className="mt-0.5 text-xs text-muted-foreground">{sublabel}</dd>
    </div>
  );
}

function PublicProfileAvatar({
  settings,
  size,
  fontSize,
}: {
  settings: SettingsState;
  size: number;
  fontSize: number;
}) {
  const imageUrl = settings.profileImageUrl.trim();
  const displayName = profileDisplayName(settings);

  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-full border bg-muted font-semibold text-foreground"
      style={{ width: size, height: size, fontSize }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={displayName}
          className="size-full object-cover"
        />
      ) : (
        <span role="img" aria-label={`${displayName} profile avatar`}>
          {initials(settings.profileName)}
        </span>
      )}
    </div>
  );
}

function ProfileDetail({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-[13px]">
      <span
        aria-hidden="true"
        className="grid w-5 shrink-0 place-items-center [&_svg]:size-[17px]"
      >
        {icon}
      </span>
      <span className="truncate">{text}</span>
    </span>
  );
}

function ProfileEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid justify-items-center px-4 py-10 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-[440px] text-[13px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

function profileStatusLabel(status: string) {
  if (isDoneStatus(status)) return "Delivered";
  if (status === "In Progress") return "Review";
  if (status === "Planned") return "Scheduled";
  return "Revision";
}

function projectTimelineColor(status: string) {
  if (isDoneStatus(status)) return successColor;
  if (status === "In Progress") return accent;
  if (status === "Planned") return "var(--app-highlight)";
  return warningColor;
}

function profileThumbColor(index: number) {
  return [
    "var(--decorative-thumb-1)",
    "var(--decorative-thumb-2)",
    "var(--decorative-thumb-3)",
    "var(--decorative-thumb-4)",
    "var(--decorative-thumb-5)",
  ][index % 5];
}
function EmptyPanel({
  title,
  body,
  assetKey,
  action,
}: {
  title: string;
  body: string;
  assetKey?: keyof typeof emptyStateAssets;
  action?: React.ReactNode;
}) {
  const inferredAsset = emptyStateAssets[emptyStateAssetFor(title)];
  const asset = assetKey ? emptyStateAssets[assetKey] : inferredAsset;
  return (
    <div className="grid justify-items-center px-4 py-8 text-center md:py-10">
      <img
        src={asset}
        alt=""
        aria-hidden="true"
        className="mb-4 h-36 w-44 object-contain drop-shadow-[0_12px_24px_rgba(0,8,12,0.16)] sm:w-[216px]"
      />
      <h3
        className="text-base font-semibold text-[var(--app-ink)]"
        style={{ fontFamily: headingFont }}
      >
        {title}
      </h3>
      <p className="mt-2 max-w-[440px] text-[13px] leading-relaxed text-[var(--app-muted)]">
        {body}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function TimecodeChip({ value }: { value?: string | null }) {
  if (!value) return null;
  return (
    <span className="mt-1.5 inline-flex h-[23px] items-center gap-1 rounded-[5px] bg-[var(--app-active)] px-2 text-xs font-semibold text-[var(--app-accent)]">
      <Clock3 aria-hidden="true" className="size-3.5" />
      {value}
    </span>
  );
}

function buildClientSummaries(
  projects: WorkItem[],
  savedClients: string[] = []
) {
  const groups = new Map<string, { name: string; projects: WorkItem[] }>();
  for (const client of savedClients) {
    const clientName = client.trim();
    if (!clientName) continue;
    groups.set(clientName.toLowerCase(), { name: clientName, projects: [] });
  }
  for (const project of projects) {
    const clientName = project.client?.trim();
    if (!clientName) continue;
    const key = clientName.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.projects.push(project);
    } else {
      groups.set(key, { name: clientName, projects: [project] });
    }
  }

  return [...groups.values()]
    .map(({ name, projects: clientProjects }) => {
      const active = clientProjects.filter(
        (project) => !isDoneStatus(project.status)
      );
      const nextProject = [...active].sort(
        (a, b) => dateTime(a.dueDate) - dateTime(b.dueDate)
      )[0];
      const latestProject = [...clientProjects].sort(
        (a, b) => createdTime(b) - createdTime(a)
      )[0];
      return {
        name,
        projectCount: clientProjects.length,
        activeCount: active.length,
        nextDue: nextProject?.dueDate || "",
        latestProject: latestProject?.title || "",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function projectProgress(status: string) {
  if (isDoneStatus(status)) return 100;
  if (status === "In Progress") return 60;
  if (status === "Planned") return 25;
  return 10;
}

function projectPriority(project: WorkItem) {
  if (isDoneStatus(project.status)) return "Done";
  if (dueBucket(project) === "Overdue") return "High";
  if (dueBucket(project) === "This Week") return "Med";
  return "Low";
}

function ClientInfoRow({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-[var(--app-muted)]">
      <span
        aria-hidden="true"
        className="grid w-5 shrink-0 place-items-center [&_svg]:size-[17px]"
      >
        {icon}
      </span>
      <span className="truncate text-[13px]">{text}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[108px] items-center gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
      {icon ? (
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary [&_svg]:size-5">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <dt className="truncate text-[13px] font-semibold text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-1 truncate text-2xl font-bold leading-none tabular-nums">
          {value}
        </dd>
        <p className="mt-2 truncate text-xs text-muted-foreground">{helper}</p>
      </div>
    </div>
  );
}

function CompactSelect({
  value,
  options,
  labels,
  onChange,
  width = 104,
}: {
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
  width?: number | string;
}) {
  const normalizedOptions = [
    ...new Set(options.filter((option) => option.trim())),
  ];
  if (value && !normalizedOptions.includes(value))
    normalizedOptions.unshift(value);

  return (
    <OwnedSelect value={value} onValueChange={onChange}>
      <OwnedSelectTrigger
        size="sm"
        className="h-[33px] rounded-[5px] border-[var(--app-border)] bg-[var(--app-panel)] text-[13px] text-[var(--app-ink)] hover:border-[var(--app-accent)]"
        style={{ width, minWidth: width }}
      >
        <OwnedSelectValue>{labels?.[value] ?? value}</OwnedSelectValue>
      </OwnedSelectTrigger>
      <OwnedSelectContent position="popper">
        {normalizedOptions.map((option) => (
          <OwnedSelectItem key={option} value={option}>
            {labels?.[option] ?? option}
          </OwnedSelectItem>
        ))}
      </OwnedSelectContent>
    </OwnedSelect>
  );
}

function dueBucket(project: WorkItem): DueFilter {
  if (isDoneStatus(project.status)) return "Delivered";
  const due = new Date(`${project.dueDate}T00:00:00`);
  const today = todayDate();
  if (due.getTime() < today.getTime()) return "Overdue";
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return due.getTime() <= weekEnd.getTime() ? "This Week" : "ALL";
}

function calendarMonthDays(month: Date, weekStart: string) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  const startIndex = weekdayIndex(weekStart);
  const offset = (first.getDay() - startIndex + 7) % 7;
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date };
  });
}

function orderedWeekdays(weekStart: string) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const start = weekdayIndex(weekStart);
  return [...days.slice(start), ...days.slice(0, start)];
}

function weekdayIndex(day: string) {
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
  return index >= 0 ? index : 1;
}

function statusPalette(status: string) {
  if (isDoneStatus(status))
    return { fg: "var(--app-success)", bg: "var(--app-success-bg)" };
  if (status === "In Progress")
    return { fg: "var(--app-warning)", bg: "var(--app-warning-bg)" };
  if (status === "Cancelled")
    return { fg: "var(--app-danger)", bg: "var(--app-danger-bg)" };
  return { fg: accent, bg: activeBg };
}

function StatusChip({ status }: { status: string }) {
  const palette = statusPalette(status);

  return (
    <span
      className="inline-flex h-6 shrink-0 items-center rounded-[5px] px-2 text-xs font-semibold"
      style={{ backgroundColor: palette.bg, color: palette.fg }}
    >
      {status}
    </span>
  );
}

function checklistItemKey(item: string, index: number) {
  return `${index}:${item.trim()}`.slice(0, 160);
}

function normalizeChecklistCompleted(
  items: string[] = [],
  completed: Record<string, boolean> = {}
) {
  const allowedKeys = new Set(
    items.map((item, index) => checklistItemKey(item, index))
  );
  return Object.fromEntries(
    Object.entries(completed).filter(
      ([key, value]) => allowedKeys.has(key) && value === true
    )
  );
}

function SubscriptionPage() {
  const { isAuthEnabled } = useData();
  const { isSignedIn, isLoaded, openSignIn, openSignUp } = useOptionalAuth();

  return (
    <WorkspacePage
      family="administration"
      className="[&_[data-slot=content-section]]:shadow-[var(--app-shadow-1)]"
    >
      <PageHeader
        eyebrow="Workspace / Subscription"
        title="Plans and billing"
        description="Choose a plan and manage your Relay subscription through Clerk."
        actions={
          <OwnedBadge variant={isSignedIn ? "default" : "secondary"}>
            {isSignedIn ? "Signed in" : "Local mode"}
          </OwnedBadge>
        }
      />
      <PageContent data-family-region="subscription-administration">
        <ContentSection
          title="Subscription"
          description="Plan selection, checkout, and subscription status."
          bodyMode="flush"
        >
          {!isLoaded ? (
            <div
              role="status"
              className="grid min-h-[220px] place-items-center p-6"
            >
              <LoaderCircle
                aria-hidden="true"
                className="size-7 animate-spin text-[var(--app-accent)]"
              />
            </div>
          ) : isSignedIn ? (
            <div className="min-h-[calc(100dvh-15rem)] p-4 md:p-6">
              <ClerkPricingPlans />
            </div>
          ) : (
            <div className="grid max-w-[620px] gap-4 p-5 md:p-6">
              <h2 className="text-xl font-semibold text-foreground">
                Account required
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Sign in or create an account to view and manage a subscription.
              </p>
              {isAuthEnabled ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <OwnedButton type="button" onClick={() => openSignUp()}>
                    Create account
                  </OwnedButton>
                  <OwnedButton
                    type="button"
                    variant="outline"
                    onClick={() => openSignIn()}
                  >
                    Sign in
                  </OwnedButton>
                </div>
              ) : null}
            </div>
          )}
        </ContentSection>
      </PageContent>
    </WorkspacePage>
  );
}

function AnalyticsConsentDialog({
  open,
  onChoose,
}: {
  open: boolean;
  onChoose: (consent: Exclude<AnalyticsConsent, "unknown">) => void;
}) {
  return (
    <OwnedDialog open={open} onOpenChange={() => {}}>
      <OwnedDialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <OwnedDialogHeader>
          <OwnedDialogTitle>Optional product analytics</OwnedDialogTitle>
          <OwnedDialogDescription>
            Share anonymous feature-use events to help improve the private beta.
            Relay never sends client names, project names, comments, files,
            links, portal tokens, or money.
          </OwnedDialogDescription>
        </OwnedDialogHeader>
        <OwnedDialogFooter>
          <OwnedButton
            type="button"
            variant="outline"
            onClick={() => onChoose("denied")}
          >
            No thanks
          </OwnedButton>
          <OwnedButton type="button" onClick={() => onChoose("granted")}>
            Allow analytics
          </OwnedButton>
        </OwnedDialogFooter>
      </OwnedDialogContent>
    </OwnedDialog>
  );
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const localTime = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );
  return localTime.toISOString().slice(0, 16);
}

function validateProject(
  item: WorkItem,
  type: WorkTypeConfig,
  workTypeOptions: string[]
) {
  if (!item.title.trim()) return "Project name is required.";
  if (!statusOptions.includes(item.status as ProjectStatus))
    return "Choose a valid project status.";
  if (
    !workTypeOptions.some(
      (option) => option.toLowerCase() === item.workType.trim().toLowerCase()
    )
  )
    return "Choose a valid project tag.";
  if (!item.startDate || !item.dueDate)
    return "Start and due dates are required.";
  if (!isIsoDate(item.startDate) || !isIsoDate(item.dueDate))
    return "Use valid start and due dates.";
  if (dateTime(item.startDate) > dateTime(item.dueDate))
    return "Due date must be on or after start date.";
  if (type.earningsMode !== "batch" && safeMoneyValue(item.earnings) < 0)
    return "Earnings must be zero or higher.";
  const invalidLink = integrationServices.find((service) => {
    const link = item.integrationLinks?.[service.id];
    return link?.url && !isValidIntegrationUrl(link.url);
  });
  if (invalidLink)
    return `${invalidLink.name} needs a valid http or https URL.`;
  return "";
}

function normalizeProjectIntegrationLinks(
  links: IntegrationLinks | undefined
): IntegrationLinks {
  const normalized: IntegrationLinks = {};
  for (const service of integrationServices) {
    const link = normalizeIntegrationLink(links?.[service.id]);
    if (!link.url && !link.label && !link.notes) continue;
    if (!isIntegrationServiceId(service.id)) continue;
    normalized[service.id] = link;
  }
  return normalized;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidProfileImageSource(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("data:image/") || isValidUrl(trimmed);
}

function validateIntegrationConfig(name: string, config: IntegrationConfig) {
  if (!config.account.trim()) return "Account email or name is required.";
  if (requiresAccountEmail(name) && !isValidEmail(config.account)) {
    return "Enter a valid account email address.";
  }
  if (
    name === "Slack" &&
    config.webhookUrl.trim() &&
    !isValidUrl(config.webhookUrl)
  ) {
    return "Enter a valid webhook URL or leave it blank.";
  }
  return "";
}

function requiresAccountEmail(name: string) {
  return name === "Google Drive";
}

function projectStageIssues(stages: string[]) {
  if (stages.some((stage) => !stage.trim()))
    return "Workflow stages cannot be blank.";
  const normalized = stages.map((stage) => stage.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length)
    return "Workflow stages must be unique.";
  return "";
}

function projectTagIssues(tags: string[]) {
  if (!tags.length) return "At least one project tag is required.";
  if (tags.some((tag) => !tag.trim())) return "Project tags cannot be blank.";
  const normalized = tags.map((tag) => tag.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length)
    return "Project tags must be unique.";
  return "";
}

function nextStageName(stages: string[]) {
  const names = new Set(stages.map((stage) => stage.trim().toLowerCase()));
  let index = 1;
  while (names.has(`new stage ${index}`)) index += 1;
  return `New Stage ${index}`;
}

function nextProjectTagName(tags: string[]) {
  const names = new Set(tags.map((tag) => tag.trim().toLowerCase()));
  let index = 1;
  while (names.has(`custom tag ${index}`)) index += 1;
  return `Custom Tag ${index}`;
}

async function copyText(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText)
    return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function getTypeConfig(label: string, settings: SettingsState) {
  if (isSalaryWorkType(label, settings))
    return { label, earningsMode: "batch" as const };
  return (
    profile.typeOptions.find(
      (type) => type.label.toLowerCase() === label.toLowerCase()
    ) ?? { label, earningsMode: "manual" as const }
  );
}

function applyRootThemeVariables(settings: SettingsState) {
  if (typeof document === "undefined") return;
  const isDark = themeIsDark(settings);
  const root = document.documentElement;
  root.style.colorScheme = isDark ? "dark" : "light";
  root.dataset.theme = isDark ? "dark" : "light";
  root.classList.toggle("dark", isDark);
}

function themeIsDark(settings: SettingsState) {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return (
    settings.theme === "Dark" || (settings.theme === "System" && prefersDark)
  );
}

function defaultProjectNotes(settings: SettingsState) {
  const stages = settings.projectStages
    .filter((stage) => stage.trim())
    .join(" -> ");
  const stageLine = stages ? `Production checklist: ${stages}.` : "";
  return stageLine;
}

function normalizedSalaryBatchSize(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0
    ? Math.floor(number)
    : defaultSalaryBatchSize;
}

function normalizedSalaryBatchAmount(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0
    ? number
    : defaultSalaryBatchAmount;
}

function projectWorkTypeOptions(
  settings: SettingsState,
  projects: WorkItem[] = []
) {
  const values = [
    ...settings.projectTags,
    settings.salaryWorkType,
    ...projects.map((project) => project.workType),
  ];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.length ? result : [...defaultProjectTags];
}

function isSalaryWorkType(value: string, settings: SettingsState) {
  return (
    value.trim().toLowerCase() === settings.salaryWorkType.trim().toLowerCase()
  );
}

function canonicalWorkType(value: string, options: string[]) {
  const trimmed = value.trim();
  return (
    options.find((option) => option.toLowerCase() === trimmed.toLowerCase()) ??
    trimmed
  );
}

function buildClientOptions(projects: WorkItem[], savedClients: string[] = []) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const savedClient of savedClients) {
    const client = savedClient.trim();
    const key = client.toLowerCase();
    if (!client || seen.has(key)) continue;
    seen.add(key);
    result.push(client);
  }
  for (const project of projects) {
    const client = project.client?.trim();
    const key = client?.toLowerCase();
    if (!client || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(client);
  }
  return result.sort((a, b) => a.localeCompare(b));
}

function findExistingClientName(value: string, clientOptions: string[]) {
  const key = value.trim().toLowerCase();
  if (!key) return "";
  return clientOptions.find((client) => client.toLowerCase() === key) ?? "";
}

function canonicalClientName(
  value: string,
  clientOptions: string[],
  forceExistingCapitalization = true
) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const existing = findExistingClientName(trimmed, clientOptions);
  return existing && forceExistingCapitalization ? existing : trimmed;
}

function clientSuggestionText(value: string, clientOptions: string[]) {
  const trimmed = value.trim();
  const existing = findExistingClientName(trimmed, clientOptions);
  if (existing && existing !== trimmed)
    return `Will use existing client "${existing}" instead of creating a duplicate.`;
  return clientOptions.length
    ? "Select an existing client or type a new client name."
    : "Typing a client name creates it when the project is saved.";
}

function createId() {
  return (
    window.crypto?.randomUUID?.() ??
    `item-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function createdTime(item: WorkItem) {
  const parsed = Date.parse(item.createdAt || "");
  if (Number.isFinite(parsed)) return parsed;
  const legacyMatch = item.id.match(/^item-(\d+)/);
  if (legacyMatch) return Number(legacyMatch[1]);
  return dateTime(item.dueDate);
}

function fallbackCreatedAt(id: unknown, dueDate: string) {
  if (typeof id === "string") {
    const legacyMatch = id.match(/^item-(\d+)/);
    if (legacyMatch) return new Date(Number(legacyMatch[1])).toISOString();
  }
  return new Date(dateTime(dueDate)).toISOString();
}

function safeMoneyValue(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function todayDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function iso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function dateTime(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function isDoneStatus(status: string) {
  return [
    "delivered",
    "done",
    "paid",
    "published",
    "closed",
    "archived",
    "shipped",
    "completed",
    "released",
  ].some((word) => status.toLowerCase().includes(word));
}

function formatDate(value: string, dateFormat = defaultSettings.dateFormat) {
  const date = new Date(`${value}T00:00:00`);
  if (dateFormat === "Day Month Year") {
    return new Intl.DateTimeFormat("en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }
  if (dateFormat === "YYYY-MM-DD") return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function profileDisplayName(settings: SettingsState) {
  return settings.profileName.trim() || "Your Profile";
}

function displayUsername(settings: SettingsState) {
  if (!settings.profileUsername.trim()) return "";
  return settings.profileUsername.startsWith("@")
    ? settings.profileUsername
    : `@${settings.profileUsername}`;
}

function sanitizeUsername(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/\s+/g, "");
  return cleaned.replace(/[^a-z0-9._-]/g, "");
}

function publicProfileSlug(settings: SettingsState) {
  const slug = sanitizeUsername(
    settings.profileUsername ||
      settings.profileName ||
      settings.studioName ||
      "editor"
  ).slice(0, 40);
  return slug.length >= MIN_PUBLIC_SLUG_LENGTH ? slug : "editor";
}

function publicMetric(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}

function ProfileAvatar({
  settings,
  size,
  fontSize,
}: {
  settings: SettingsState;
  size: number;
  fontSize: number;
}) {
  const imageUrl = settings.profileImageUrl.trim();
  const displayName = profileDisplayName(settings);

  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full border font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: avatarSurface,
        borderColor: border,
        color: ink,
        fontSize,
      }}
    >
      {imageUrl ? (
        <img
          className="size-full object-cover"
          src={imageUrl}
          alt={displayName}
        />
      ) : (
        initials(settings.profileName)
      )}
    </span>
  );
}

function money(value: number, currencyCode = defaultSettings.currencyCode) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value || 0);
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}
