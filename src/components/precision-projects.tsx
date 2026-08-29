"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Archive,
  Edit3,
  Film,
  FolderKanban,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  AnimatePresence,
  motion,
  MotionConfig,
} from "motion/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { SettingsState, WorkItem, WorkflowStage } from "@/lib/types";
import type { StoredTeamRole } from "@/lib/domain-values";
import { useHydratedReducedMotion } from "@/lib/motion";
import { projectStatusTone } from "@/lib/project-status-style";
import {
  DEFAULT_PROJECT_TABLE_STATE,
  getProjectTableDeletionWarning,
  parseProjectTableSearch,
} from "@/features/projects/project-table-domain";
import { useProjectTableController } from "@/features/projects/project-table-controller";
import type { ProjectStageMenuChoice } from "@/features/projects/project-domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DataTableFrame,
  MetricItem,
  MetricStrip,
  PageContent,
  PageHeader,
  PageToolbar,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";

type WorkspaceScope = "personal" | "team";

type PrecisionProjectsProps = {
  settings: SettingsState;
  personalProjects: WorkItem[];
  teamProjects: WorkItem[];
  teamName?: string;
  currentUserId: string;
  currentUserRole?: StoredTeamRole;
  teamMembers: ReadonlyArray<{ userId: string; name: string }>;
  allowAllTeamProjects?: boolean;
  loading?: boolean;
  error?: string;
  onNewProject: (scope: WorkspaceScope) => void;
  onViewProject: (item: WorkItem) => void;
  onEditProject: (item: WorkItem) => void;
  onArchiveProject: (item: WorkItem) => void;
  onDeleteProject: (id: string) => void;
  onUpdateProjectStatus: (project: WorkItem, status: string) => void;
  canCreateProjects: boolean;
  canCreateTeamProjects: boolean;
  canEditProjects: boolean;
  canUpdateProjectStatus: boolean;
  canDeleteProject: (project: WorkItem) => boolean;
  onManageProjectGroups: (scope: WorkspaceScope) => void;
};

const columnHelper = createColumnHelper<WorkItem>();

function delivered(project: WorkItem) {
  return project.status === "Delivered";
}

function progress(project: WorkItem) {
  if (project.status === "Delivered") return 100;
  if (["Review", "Client Review"].includes(project.status)) return 84;
  if (project.status === "Revision") return 70;
  if (project.status === "In Progress") return 52;
  if (project.status === "Cancelled") return 0;
  return 16;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function projectColor(project: WorkItem) {
  const palette = [
    "var(--media-package-1)",
    "var(--media-package-2)",
    "var(--media-package-3)",
    "var(--media-package-4)",
    "var(--media-package-5)",
  ];
  let hash = 0;
  for (const char of project.id || project.title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

function projectDuration(project: WorkItem) {
  let hash = 0;
  for (const char of project.title) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  const minutes = 1 + (hash % 11);
  const seconds = (hash >>> 3) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function projectNextAction(project: WorkItem) {
  if (project.status === "Delivered") return "Archive final exports and confirm the payment record.";
  if (["Review", "Client Review"].includes(project.status)) return "Collect review notes and prepare the next client-ready version.";
  if (project.status === "Revision") return "Apply the requested revisions and send the updated cut.";
  if (project.status === "In Progress") return "Complete the current production pass before the next handoff.";
  return "Confirm the brief, owner, and first production milestone.";
}

function ProjectVideoThumbnail({
  project,
  className,
}: {
  project: WorkItem;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`${project.title} video thumbnail`}
      data-slot="project-thumbnail"
      data-thumbnail-kind="video"
      className={cn(
        "relative isolate flex h-[50px] w-[88px] shrink-0 overflow-hidden rounded-md border border-white/10",
        className,
      )}
      style={{ background: projectColor(project) }}
    >
      <span className="absolute -right-3 top-1/2 h-[130%] w-[52%] -translate-y-1/2 rotate-12 bg-[var(--app-accent)] opacity-45" />
      <span className="absolute inset-x-2 top-2 flex items-center justify-between text-[var(--app-thumb-icon)]">
        <Film className="size-3.5" />
        <span className="size-1.5 rounded-full bg-current opacity-60" />
      </span>
      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1 py-0.5 text-[8px] font-medium leading-none text-white">
        {projectDuration(project)}
      </span>
    </span>
  );
}

function ProjectBoardCard({
  project,
  selected,
  disabled,
  stageChoices,
  onSelect,
  onOpen,
  onUpdateProjectStatus,
}: {
  project: WorkItem;
  selected: boolean;
  disabled: boolean;
  stageChoices: ProjectStageMenuChoice[];
  onSelect: () => void;
  onOpen: () => void;
  onUpdateProjectStatus: PrecisionProjectsProps["onUpdateProjectStatus"];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id, disabled });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      className={cn("relative flex items-start gap-1 px-3 py-3", selected && "bg-[var(--app-active)]", isDragging && "z-20 opacity-60")}
    >
      <button
        type="button"
        className={cn("min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]", !disabled && "cursor-grab active:cursor-grabbing")}
        onClick={onSelect}
        onDoubleClick={onOpen}
        {...listeners}
        {...attributes}
      >
        <span className="block truncate text-xs font-semibold">{project.title}</span>
        <span className="mt-1 block truncate text-[11px] text-[var(--app-muted)]">{project.client || "No client"} · {formatDate(project.dueDate)}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Change stage for ${project.title}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {stageChoices.map((choice) => (
            <DropdownMenuItem
              key={choice.stage.id}
              aria-label={choice.ariaLabel}
              disabled={choice.disabled}
              onSelect={() => onUpdateProjectStatus(project, choice.stage.id)}
            >
              {choice.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  );
}

function ProjectBoardColumn({ stage, projects, children }: { stage: WorkflowStage; projects: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stage.id}` });
  return (
    <section
      ref={setNodeRef}
      className={cn("min-w-[210px] border-r border-[var(--app-border)] last:border-r-0", isOver && "bg-[var(--app-hover)]")}
      aria-label={`${stage.label} projects`}
    >
      <h3 className="sticky top-0 z-10 flex h-9 items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-soft-panel)] px-3 text-[10px] font-semibold uppercase text-[var(--app-subtle)]"><span>{stage.label}</span><span>{projects}</span></h3>
      <div className="min-h-24 divide-y divide-[var(--app-border)]">{children}</div>
    </section>
  );
}

export function PrecisionProjects(props: PrecisionProjectsProps) {
  const [scope, setScope] = useState<WorkspaceScope>("personal");
  const [selectedId, setSelectedId] = useState("");
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const reduceMotion = useHydratedReducedMotion();
  const hasTeam = Boolean(props.teamName);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const { state: tableState, deferredState: deferredTableState, setState: setTableState, isUpdating, source, projects, board, summary, hasFilters, showAssignees, getPaymentState, isSalaryProject, canMoveProject, getStageChoices } = useProjectTableController({
    scope,
    personalProjects: props.personalProjects,
    teamProjects: props.teamProjects,
    clients: props.settings.clients,
    salaryWorkType: props.settings.salaryWorkType,
    currentUserId: props.currentUserId,
    currentUserRole: props.currentUserRole,
    allowAllTeamProjects: props.allowAllTeamProjects ?? false,
    activeTeamMemberCount: props.teamMembers.length,
    canUpdateProjectStatus: props.canUpdateProjectStatus,
  });
  const springTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 430, damping: 38, mass: 0.75 };
  const contentTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };

  useEffect(() => {
    if (!hasTeam && scope === "team") setScope("personal");
  }, [hasTeam, scope]);

  useEffect(() => {
    if (!projects.some((project) => project.id === selectedId)) {
      setSelectedId(projects[0]?.id ?? "");
    }
  }, [projects, selectedId]);

  const selected = source.find((project) => project.id === selectedId) ?? projects[0] ?? null;
  const projectName = (id: string | number) => projects.find((project) => project.id === String(id))?.title ?? "Project";
  const dropStage = (id: string | number | undefined) => {
    const value = String(id ?? "");
    return value.startsWith("stage:") ? value.slice(6) : undefined;
  };
  const validMove = (projectId: string | number, stage: string | undefined) => {
    const project = projects.find((candidate) => candidate.id === String(projectId));
    return Boolean(project && stage && canMoveProject(project, stage));
  };
  const stageLabel = (stageId: string | undefined) => board.find(({ stage }) => stage.id === stageId)?.stage.label ?? stageId;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${projectName(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const stage = dropStage(over?.id);
      return stage ? `${projectName(active.id)} is over ${stageLabel(stage)}.` : undefined;
    },
    onDragEnd: ({ active, over }) => {
      const stage = dropStage(over?.id);
      return validMove(active.id, stage) ? `Requested move for ${projectName(active.id)} to ${stageLabel(stage)}.` : `${projectName(active.id)} was not moved.`;
    },
    onDragCancel: ({ active }) => `Moving ${projectName(active.id)} was cancelled.`,
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const project = projects.find((candidate) => candidate.id === String(active.id));
    const stage = dropStage(over?.id);
    if (project && stage && canMoveProject(project, stage)) {
      props.onUpdateProjectStatus(project, stage);
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor("title", {
      header: "Name",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <ProjectVideoThumbnail project={row.original} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{row.original.title}</p>
            <p className="mt-0.5 max-w-[300px] truncate text-[11px] text-[var(--app-muted)]">{row.original.notes || "No notes"}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.display({
      id: "client",
      header: "Client",
      cell: ({ row }) => <span className="block truncate text-xs">{props.settings.clients.find((client) => client.id === row.original.clientId)?.name ?? row.original.client ?? "No client"}</span>,
    }),
    columnHelper.accessor("status", {
      header: "Stage",
      cell: (info) => <Badge variant="outline" className={cn("h-5 rounded px-1.5 text-[10px] font-semibold", projectStatusTone(info.getValue()))}>{info.getValue()}</Badge>,
    }),
    columnHelper.accessor("dueDate", {
      header: "Due",
      cell: (info) => <span className="whitespace-nowrap text-xs">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.display({
      id: "payment",
      header: "Payment",
      cell: ({ row }) => <span className="text-xs capitalize">{getPaymentState(row.original).replace("-", " ")}</span>,
    }),
    columnHelper.display({
      id: "salary",
      header: "Salary",
      cell: ({ row }) => <span className="whitespace-nowrap text-xs">{isSalaryProject(row.original) ? "Salary" : money(row.original.earnings, props.settings.currencyCode)}</span>,
    }),
    ...(showAssignees ? [columnHelper.display({
      id: "assignees",
      header: "Assignees",
      cell: ({ row }) => {
        const names = (row.original.assigneeUserIds ?? []).map((id) => props.teamMembers.find((member) => member.userId === id)?.name).filter((name): name is string => Boolean(name));
        return <span className="block truncate text-xs">{names.join(", ") || "Unassigned"}</span>;
      },
    })] : []),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="transition-transform active:scale-95" aria-label={`Actions for ${row.original.title}`} onClick={(event) => event.stopPropagation()}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => props.onViewProject(row.original)}>Open project</DropdownMenuItem>
            <DropdownMenuItem disabled={!props.canEditProjects && Boolean(row.original.teamId)} onSelect={() => props.onEditProject(row.original)}><Edit3 /> Edit</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => props.onArchiveProject(row.original)}><Archive /> {row.original.archived ? "Restore" : "Archive"}</DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={!props.canDeleteProject(row.original)}
              onSelect={() => {
                if (window.confirm(getProjectTableDeletionWarning(row.original.title))) props.onDeleteProject(row.original.id);
              }}
            ><Trash2 /> Permanently delete (Owner only)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ], [
    props.canDeleteProject,
    props.canEditProjects,
    props.onArchiveProject,
    props.onDeleteProject,
    props.onEditProject,
    props.onViewProject,
    props.settings.currencyCode,
    props.settings.clients,
    props.teamMembers,
    getPaymentState,
    isSalaryProject,
    showAssignees,
  ]);

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <MotionConfig reducedMotion="user" transition={springTransition}>
      <WorkspacePage family="data-index" mode="fill" className="lg:min-h-full">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={contentTransition}
        className="contents"
      >
      <PageHeader
        eyebrow="Production workspace"
        title="Projects"
        description="A focused index for every tracked edit, handoff, review, and salary batch item."
      />

      <PageContent mode="fill">
      <PageToolbar
        primary={
        <>
        <div className="relative min-w-0 flex-1 sm:max-w-[560px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--app-muted)]" />
          <Input value={tableState.query} onChange={(event) => setTableState((state) => ({ ...state, query: event.target.value }))} placeholder="Search project, client, or note..." aria-label="Search projects" className="h-9 bg-[var(--app-panel)] pl-8 text-xs transition-shadow focus-visible:ring-2" />
        </div>
        <div className="flex min-w-[150px] items-center gap-2">
          <SlidersHorizontal className="size-4 shrink-0 text-[var(--app-muted)]" />
          <Select value={tableState.stage} onValueChange={(value) => setTableState((state) => ({ ...state, stage: parseProjectTableSearch(`stage=${encodeURIComponent(value)}`).stage }))}>
            <SelectTrigger aria-label="Filter projects by status" className="h-9 w-full bg-[var(--app-panel)] text-xs transition-colors"><SelectValue /></SelectTrigger>
            <SelectContent>{["all", "Planned", "In Progress", "Review", "Client Review", "Revision", "Delivered", "Cancelled"].map((value) => <SelectItem key={value} value={value}>{value === "all" ? "All stages" : value}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Select value={tableState.clientId || "all"} onValueChange={(value) => setTableState((state) => ({ ...state, clientId: value === "all" ? "" : value }))}>
          <SelectTrigger aria-label="Filter projects by client" className="h-9 w-[140px] bg-[var(--app-panel)] text-xs"><SelectValue placeholder="All clients" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All clients</SelectItem>{props.settings.clients.filter((client) => !client.archived).map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={tableState.payment} onValueChange={(value) => setTableState((state) => ({ ...state, payment: parseProjectTableSearch(`payment=${value}`).payment }))}>
          <SelectTrigger aria-label="Filter projects by payment" className="h-9 w-[130px] bg-[var(--app-panel)] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All payments</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem><SelectItem value="not-billable">Not billable</SelectItem></SelectContent>
        </Select>
        <Select value={tableState.salary} onValueChange={(value) => setTableState((state) => ({ ...state, salary: parseProjectTableSearch(`salary=${value}`).salary }))}>
          <SelectTrigger aria-label="Filter projects by salary type" className="h-9 w-[125px] bg-[var(--app-panel)] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All work</SelectItem><SelectItem value="salary">Salary</SelectItem><SelectItem value="client">Client work</SelectItem></SelectContent>
        </Select>
        <Select value={tableState.archive} onValueChange={(value) => setTableState((state) => ({ ...state, archive: parseProjectTableSearch(`archive=${value}`).archive }))}>
          <SelectTrigger aria-label="Filter archived projects" className="h-9 w-[120px] bg-[var(--app-panel)] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem><SelectItem value="all">All records</SelectItem></SelectContent>
        </Select>
        {showAssignees ? <Select value={tableState.assigneeUserId || "all"} onValueChange={(value) => setTableState((state) => ({ ...state, assigneeUserId: value === "all" ? "" : value }))}>
          <SelectTrigger aria-label="Filter projects by assignee" className="h-9 w-[135px] bg-[var(--app-panel)] text-xs"><SelectValue placeholder="All assignees" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All assignees</SelectItem>{props.settings.teamMembers.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent>
        </Select> : null}
        </>
        }
        secondary={
        <>
        <Button variant="outline" className="h-9" onClick={() => props.onManageProjectGroups(scope)}>Project Groups</Button>
        <Tabs
          value={tableState.view}
          onValueChange={(view) =>
            setTableState((state) => ({
              ...state,
              view: view === "board" ? "board" : "table",
            }))
          }
          className="block"
        >
          <TabsList aria-label="Project view" className="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] p-0.5">
            <TabsTrigger value="table" className="h-7 px-2 text-xs">Table</TabsTrigger>
            <TabsTrigger value="board" className="h-7 px-2 text-xs">Board</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs
          value={scope}
          onValueChange={(value) => setScope(value === "team" && hasTeam ? "team" : "personal")}
          className="block"
        >
          <TabsList aria-label="Project scope" className="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] p-0.5">
            <TabsTrigger value="personal" className="h-8 px-3 text-xs">
              My Projects <span className="text-[10px]">{props.personalProjects.length}</span>
            </TabsTrigger>
            <TabsTrigger value="team" disabled={!hasTeam} className="h-8 px-3 text-xs">
              Team Projects <span className="text-[10px]">{props.teamProjects.length}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
          <Select value={`${tableState.sort}:${tableState.direction}`} onValueChange={(value) => {
            const [sort, direction] = value.split(":");
            const parsed = parseProjectTableSearch(`sort=${sort}&dir=${direction}`);
            setTableState((state) => ({ ...state, sort: parsed.sort, direction: parsed.direction }));
          }}>
            <SelectTrigger aria-label="Sort projects" className="h-9 w-[140px] bg-[var(--app-panel)] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="due:asc">Due first</SelectItem>
              <SelectItem value="due:desc">Due last</SelectItem>
              <SelectItem value="name:asc">Name A-Z</SelectItem>
              <SelectItem value="stage:asc">Stage</SelectItem>
              <SelectItem value="payment:asc">Payment</SelectItem>
              <SelectItem value="salary:desc">Salary first</SelectItem>
            </SelectContent>
          </Select>
        </>
        }
      />

      <MetricStrip columns={4}>
        <MetricItem icon={<FolderKanban className="size-3.5" />} label="All projects" value={source.length} supporting="this workspace" />
        <MetricItem icon={<CalendarDays className="size-3.5" />} label="In motion" value={summary.active} supporting={`${summary.dueSoon} due soon`} />
        <MetricItem icon={<UsersRound className="size-3.5" />} label="Needs attention" value={summary.review} supporting="review or revision" />
        <MetricItem icon={<CheckCircle2 className="size-3.5" />} label="Delivered" value={summary.delivered} supporting={`${money(summary.earned, props.settings.currencyCode)} collected`} />
      </MetricStrip>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...contentTransition, delay: reduceMotion ? 0 : 0.14 }}
        className="min-h-0 flex-1"
      >
        <SplitPane
          ratio="inspector"
          className="h-full min-h-0"
          primary={(
        <DataTableFrame
          aria-busy={isUpdating}
          bodyLabel="Project library viewport"
          className="relative h-full min-h-0 border-[var(--app-border)] bg-[var(--app-panel)]"
          bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden max-lg:flex-none max-lg:overflow-visible"
        >
          {isUpdating ? <div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-[var(--app-accent)]" /> : null}
          <header className="flex h-12 items-center justify-between px-4">
            <div>
              <h2 className="text-sm font-semibold">Project library</h2>
              <p className="text-[10px] text-[var(--app-muted)]">{scope === "team" ? props.teamName || "Team workspace" : "Private workspace"}</p>
            </div>
            <span className="flex items-center gap-2 text-[11px] text-[var(--app-muted)]" aria-live="polite">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={`${scope}-${deferredTableState.stage}-${projects.length}`}
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={contentTransition}
                >
                  {projects.length} records
                </motion.span>
              </AnimatePresence>
            </span>
          </header>

          {props.error ? (
            <div role="alert" className="grid min-h-72 place-items-center px-5 text-center text-sm text-destructive">{props.error}</div>
          ) : props.loading ? (
            <div aria-label="Loading projects"><ProjectTableSkeleton reduceMotion /></div>
          ) : projects.length ? tableState.view === "board" ? (
            <DndContext sensors={sensors} accessibility={{ announcements }} onDragEnd={handleDragEnd}>
              <div className="grid min-h-0 flex-1 auto-cols-[minmax(210px,1fr)] grid-flow-col overflow-x-auto border-t border-[var(--app-border)]" aria-label="Project board">
                {board.map(({ stage, projects: stageProjects }) => {
                  return (
                    <ProjectBoardColumn key={stage.id} stage={stage} projects={stageProjects.length}>
                      {stageProjects.map((project) => (
                        <ProjectBoardCard
                          key={project.id}
                          project={project}
                          selected={selected?.id === project.id}
                          disabled={!props.canUpdateProjectStatus && Boolean(project.teamId)}
                          stageChoices={getStageChoices(project)}
                          onSelect={() => setSelectedId(project.id)}
                          onOpen={() => props.onViewProject(project)}
                          onUpdateProjectStatus={props.onUpdateProjectStatus}
                        />
                      ))}
                    </ProjectBoardColumn>
                  );
                })}
              </div>
            </DndContext>
          ) : (
            <>
            <div className="divide-y divide-[var(--app-border)] lg:hidden" aria-label="Project cards">
              {table.getRowModel().rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  data-testid="mobile-project-row"
                  data-project-title={row.original.title}
                  aria-label={`Open ${row.original.title} project details`}
                  className={cn(
                    "grid w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left outline-none transition-colors hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)]",
                    selected?.id === row.original.id && "bg-[var(--app-active)]",
                  )}
                  onClick={() => {
                    setSelectedId(row.original.id);
                    setMobileInspectorOpen(true);
                  }}
                >
                  <ProjectVideoThumbnail project={row.original} className="h-12 w-16" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{row.original.title}</span>
                    <span className="mt-1 block truncate text-xs text-[var(--app-muted)]">
                      {row.original.client || row.original.workType}
                    </span>
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("h-5 rounded px-1.5 text-[10px] font-semibold", projectStatusTone(row.original.status))}
                  >
                    {row.original.status}
                  </Badge>
                </button>
              ))}
            </div>
            <motion.div
              animate={{ opacity: isUpdating ? 0.62 : 1 }}
              transition={contentTransition}
              className="hidden min-h-0 flex-1 overflow-y-auto overscroll-contain lg:block"
              tabIndex={0}
              aria-label="Scrollable project library"
            >
              <table className="w-full table-fixed border-collapse" aria-label={`${scope === "team" ? "Team" : "Personal"} project library`}>
                <caption className="sr-only">Projects with due date, status, progress, and value. Select a row to inspect it.</caption>
                <thead>
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id} className="border-y border-[var(--app-border)] bg-[var(--app-soft-panel)]">
                      {group.headers.map((header) => (
                        <th
                          key={header.id}
                          className={cn(
                            "h-8 px-3 text-left text-[10px] font-semibold uppercase text-[var(--app-subtle)]",
                            header.column.id === "title" && "w-[25%]",
                            header.column.id === "client" && "w-[13%]",
                            header.column.id === "dueDate" && "w-[12%]",
                            header.column.id === "status" && "w-[12%]",
                            header.column.id === "payment" && "w-[10%]",
                            header.column.id === "salary" && "w-[12%]",
                            header.column.id === "assignees" && "w-[12%]",
                            header.column.id === "actions" && "w-[4%]",
                          )}
                        >
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-[var(--app-border)]">
                  {table.getRowModel().rows.map((row) => (
                    <motion.tr
                      key={row.id}
                      layout="position"
                      role="button"
                      tabIndex={0}
                      data-testid="project-row"
                      data-project-title={row.original.title}
                      aria-selected={selected?.id === row.original.id}
                      aria-label={`Select ${row.original.title}. ${row.original.status}. Due ${formatDate(row.original.dueDate)}.`}
                      className={cn(
                        "h-[var(--workspace-row-height,70px)] cursor-pointer outline-none transition-colors hover:bg-[var(--app-hover)] focus-visible:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)] active:bg-[var(--app-active)]",
                        selected?.id === row.original.id && "bg-[var(--app-active)] shadow-[inset_3px_0_0_var(--app-accent)]",
                      )}
                      animate={{ opacity: 1 }}
                      initial={reduceMotion ? false : { opacity: 0 }}
                      transition={contentTransition}
                      onClick={() => {
                        setSelectedId(row.original.id);
                      }}
                      onDoubleClick={() => props.onViewProject(row.original)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        const rows = table.getRowModel().rows;
                        const index = rows.findIndex((candidate) => candidate.id === row.id);
                        const focusRow = (nextIndex: number) => {
                          const next = rows[nextIndex];
                          if (!next) return;
                          setSelectedId(next.original.id);
                          document.querySelector<HTMLElement>(`[data-testid="project-row"][data-project-id="${CSS.escape(next.original.id)}"]`)?.focus();
                        };
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          focusRow(Math.min(rows.length - 1, index + 1));
                        } else if (event.key === "ArrowUp") {
                          event.preventDefault();
                          focusRow(Math.max(0, index - 1));
                        } else if (event.key === "Home") {
                          event.preventDefault();
                          focusRow(0);
                        } else if (event.key === "End") {
                          event.preventDefault();
                          focusRow(rows.length - 1);
                        } else if (event.key === "Enter") {
                          event.preventDefault();
                          props.onViewProject(row.original);
                        } else if (event.key === " ") {
                          event.preventDefault();
                          setSelectedId(row.original.id);
                        }
                      }}
                      data-project-id={row.original.id}
                    >
                      {row.getVisibleCells().map((cell) => <td key={cell.id} className="px-3 py-2 text-xs">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
            </>
          ) : isUpdating ? (
            <ProjectTableSkeleton reduceMotion={reduceMotion} />
          ) : (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid min-h-72 place-items-center px-5 text-center"
            >
              <div className="max-w-xs">
                <FolderKanban className="mx-auto size-7 text-[var(--app-muted)]" />
                <p className="mt-2 text-sm font-semibold">{hasFilters ? "No projects match these filters" : "No projects in this workspace"}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                  {hasFilters ? "Adjust the filters to bring projects back into view." : "Create the first project to start tracking production work here."}
                </p>
                {hasFilters ? (
                  <Button variant="outline" className="mt-3 h-8 active:scale-[0.98]" size="sm" onClick={() => setTableState((state) => ({ ...DEFAULT_PROJECT_TABLE_STATE, view: state.view }))}>
                    Clear filters
                  </Button>
                ) : (
                  <Button
                    className="mt-3 h-8 active:scale-[0.98]"
                    size="sm"
                    onClick={() => props.onNewProject(scope)}
                    disabled={scope === "personal" ? !props.canCreateProjects : !hasTeam || !props.canCreateTeamProjects}
                  >
                    <Plus /> Create project
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </DataTableFrame>
          )}
          secondary={(
        <AnimatePresence mode="wait" initial={false}>
          <ProjectInspector
            key={selected?.id ?? "empty"}
            project={selected}
            settings={props.settings}
            onOpen={props.onViewProject}
            onEdit={props.onEditProject}
            canEdit={props.canEditProjects}
            reduceMotion={reduceMotion}
            className="hidden xl:block"
          />
        </AnimatePresence>
          )}
        />
      </motion.div>
      </PageContent>
      <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
        <SheetContent side="right" className="w-[min(92vw,380px)] p-0 xl:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Project details</SheetTitle>
            <SheetDescription>Review the selected project and open or edit its workspace.</SheetDescription>
          </SheetHeader>
          <AnimatePresence mode="wait" initial={false}>
            <ProjectInspector
              key={selected?.id ?? "empty"}
              project={selected}
              settings={props.settings}
              onOpen={props.onViewProject}
              onEdit={props.onEditProject}
              canEdit={props.canEditProjects}
              reduceMotion={reduceMotion}
              className="h-full border-0"
            />
          </AnimatePresence>
        </SheetContent>
      </Sheet>
      </motion.div>
      </WorkspacePage>
    </MotionConfig>
  );
}

function Metric({ icon: Icon, label, value, reduceMotion }: { icon: typeof FolderKanban; label: string; value: number; reduceMotion: boolean | null }) {
  return (
    <motion.div layout className="group flex min-h-[76px] items-center gap-2.5 px-3 py-3 transition-colors hover:bg-[var(--app-hover)]">
      <motion.span whileHover={reduceMotion ? undefined : { scale: 1.04 }} className="grid size-8 place-items-center rounded-md bg-[var(--app-soft-panel)] text-[var(--app-muted)]"><Icon className="size-4" /></motion.span>
      <span>
        <span className="block text-[10px] text-[var(--app-muted)]">{label}</span>
        <span className="relative mt-0.5 block h-7 overflow-hidden text-xl font-semibold tabular-nums">
          <motion.span
            key={value}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="block"
          >
            {value}
          </motion.span>
        </span>
      </span>
    </motion.div>
  );
}

function ProjectInspector({
  project,
  settings,
  onOpen,
  onEdit,
  canEdit,
  reduceMotion,
  className,
}: {
  project: WorkItem | null;
  settings: SettingsState;
  onOpen: (project: WorkItem) => void;
  onEdit: (project: WorkItem) => void;
  canEdit: boolean;
  reduceMotion: boolean | null;
  className?: string;
}) {
  if (!project) {
    return (
      <motion.aside
        initial={reduceMotion ? false : { opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, x: 8 }}
        className={cn("rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-6 text-center text-xs text-[var(--app-muted)]", className)}
      >
        <FolderOpen className="mx-auto mb-2 size-6 opacity-70" />
        Select a project to inspect its production details.
      </motion.aside>
    );
  }
  const value = progress(project);
  return (
    <motion.aside
      initial={reduceMotion ? false : { opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, x: -6 }}
      aria-label="Selected project details"
      className={cn(
        "workspace-scrollbar-hidden h-full min-h-0 overflow-y-auto overscroll-contain rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)]",
        className,
      )}
    >
      <div className="border-b border-[var(--app-border)] p-4">
        <div>
          <motion.div
            initial={reduceMotion ? false : { scale: 0.96 }}
            animate={{ scale: 1 }}
            className="w-full"
          >
            <ProjectVideoThumbnail project={project} className="mb-3 aspect-video h-auto w-full" />
          </motion.div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">{project.title}</h2>
            <p className="mt-0.5 truncate text-[11px] text-[var(--app-muted)]">{project.client || "No client"}</p>
            <Badge variant="outline" className={cn("mt-2 h-5 rounded px-1.5 text-[10px] font-semibold", projectStatusTone(project.status))}>{project.status}</Badge>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
          <Detail label="Client" value={project.client || "No client"} />
          <Detail label="Work type" value={project.workType} />
          <Detail label="Due date" value={formatDate(project.dueDate)} />
          <Detail label="Value" value={project.workType === settings.salaryWorkType ? "Batch tracked" : money(project.earnings, settings.currencyCode)} />
        </dl>
        <div className="border-t border-[var(--app-border)] pt-4">
          <div className="flex justify-between text-xs font-semibold"><span>Progress</span><span>{value}%</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-progress-track)]">
            <motion.div
              className="h-full origin-left rounded-full bg-[var(--app-accent)]"
              initial={reduceMotion ? false : { scaleX: 0 }}
              animate={{ scaleX: value / 100 }}
            />
          </div>
        </div>
        <div className="border-t border-[var(--app-border)] pt-4">
          <p className="text-[10px] font-semibold uppercase text-[var(--app-subtle)]">Project note</p>
          <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">{project.notes || "No project notes yet."}</p>
        </div>
        <div className="border-t border-[var(--app-border)] pt-4">
          <p className="text-[10px] font-semibold uppercase text-[var(--app-subtle)]">Next action</p>
          <p className="mt-2 text-xs leading-5 text-[var(--app-ink)]">{projectNextAction(project)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="outline" className="h-9 transition-transform active:scale-[0.98]" disabled={!canEdit && Boolean(project.teamId)} onClick={() => onEdit(project)}><Edit3 /> Edit</Button>
          <Button className="h-9 transition-transform active:scale-[0.98]" onClick={() => onOpen(project)}>Open <ArrowRight /></Button>
        </div>
      </div>
    </motion.aside>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] font-semibold uppercase text-[var(--app-subtle)]">{label}</p><p className="mt-1 text-xs font-medium">{value}</p></div>;
}

function ProjectTableSkeleton({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div className="min-h-72 border-t border-[var(--app-border)]" aria-label="Updating projects">
      {Array.from({ length: 4 }, (_, index) => (
        <motion.div
          key={index}
          className="grid h-[58px] grid-cols-[minmax(180px,1.6fr)_minmax(80px,0.7fr)_minmax(100px,0.9fr)_minmax(72px,0.7fr)_minmax(100px,1fr)] items-center gap-3 border-b border-[var(--app-border)] px-3"
          initial={false}
          animate={{ opacity: reduceMotion ? 0.65 : 0.72 }}
        >
          <div className="flex items-center gap-3">
            <span className="h-9 w-12 rounded-md bg-[var(--app-soft-panel)]" />
            <span className="space-y-1.5">
              <span className="block h-2.5 w-36 rounded bg-[var(--app-soft-panel)]" />
              <span className="block h-2 w-24 rounded bg-[var(--app-soft-panel)]" />
            </span>
          </div>
          <span className="h-2.5 w-16 rounded bg-[var(--app-soft-panel)]" />
          <span className="h-2.5 w-20 rounded bg-[var(--app-soft-panel)]" />
          <span className="h-5 w-16 rounded bg-[var(--app-soft-panel)]" />
          <span className="h-1 w-full max-w-28 rounded bg-[var(--app-soft-panel)]" />
        </motion.div>
      ))}
    </div>
  );
}
