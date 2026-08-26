"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit3,
  FolderKanban,
  FolderOpen,
  ListFilter,
  MessageSquareText,
  MoreHorizontal,
  Search,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { AnimatePresence, animate, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SalaryBatch, WorkItem, SettingsState } from "@/lib/types";
import type { ProjectStatus } from "@/lib/domain-values";
import { useHydratedReducedMotion } from "@/lib/motion";
import { projectStatusTone } from "@/lib/project-status-style";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ContentSection,
  DataTableFrame,
  MetricStrip,
  PageContent,
  PageHeader,
  PageToolbar,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";

type DueFilter = "ALL" | "This Week" | "Overdue" | "Delivered";
type SortKey =
  | "createdAt_desc"
  | "createdAt_asc"
  | "dueDate_asc"
  | "earnings_desc"
  | "earnings_asc";
type DashboardActivity = {
  id: string;
  kind: "created" | "updated" | "status" | "delivered" | "team";
  message: string;
  projectId?: string;
  actor?: string;
  createdAt: string;
};

type DashboardProps = {
  settings: SettingsState;
  stats: {
    total: number;
    active: number;
    unpaid: number;
    earned: number;
    collected: number;
    outstanding: number;
    salaryEdits: number;
    salaryBatchProgress: number;
  };
  projects: WorkItem[];
  visibleProjects: WorkItem[];
  salaryBatches: SalaryBatch[];
  sessionActivity: DashboardActivity[];
  teamActivity: Array<{
    _id: string;
    actorName: string;
    kind: string;
    projectId?: string;
    message: string;
    createdAt: string;
  }>;
  teamName?: string;
  teamLoading: boolean;
  query: string;
  setQuery: (value: string) => void;
  statusFilter: ProjectStatus | "All";
  setStatusFilter: (value: ProjectStatus | "All") => void;
  kindFilter: string;
  setKindFilter: (value: string) => void;
  clientFilter: string;
  setClientFilter: (value: string) => void;
  clientOptions: string[];
  projectTagOptions: string[];
  dueFilter: DueFilter;
  setDueFilter: (value: DueFilter) => void;
  billingFilter: "ALL" | "Paid" | "Unpaid";
  setBillingFilter: (value: "ALL" | "Paid" | "Unpaid") => void;
  sortKey: SortKey;
  setSortKey: (value: SortKey) => void;
  onNewProject: () => void;
  onViewProject: (item: WorkItem) => void;
  onEditProject: (item: WorkItem) => void;
  onDeleteProject: (id: string) => void;
  onMarkSalaryPayment: (batchId: string) => void;
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProject: (project: WorkItem) => boolean;
};

const columnHelper = createColumnHelper<WorkItem>();

const statusOptions: Array<ProjectStatus | "All"> = [
  "All",
  "Planned",
  "In Progress",
  "Review",
  "Revision",
  "Delivered",
  "Cancelled",
];

/** Minimalist motion: soft settle, never snappy SaaS bounce. */
const easing = [0.16, 1, 0.3, 1] as const;

const surface =
  "rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] transition-colors duration-150";

function AnimatedNumber({
  value,
  format = (number) => Math.round(number).toLocaleString("en"),
}: {
  value: number;
  format?: (value: number) => string;
}) {
  const reduceMotion = useHydratedReducedMotion();
  const [displayValue, setDisplayValue] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayValue(value);
      return;
    }

    const controls = animate(displayValue, value, {
      duration: 0.65,
      ease: easing,
      onUpdate: setDisplayValue,
    });
    return () => controls.stop();
  }, [reduceMotion, value]);

  return <>{format(displayValue)}</>;
}

function AnimatedProgress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const reduceMotion = useHydratedReducedMotion();

  return (
    <motion.div
      className={cn(
        "h-full origin-left rounded-sm bg-[var(--app-accent)]",
        className
      )}
      initial={false}
      animate={{ scaleX: value / 100 }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.55, ease: easing }
      }
    />
  );
}

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysFromToday(value: string) {
  const due = parseDate(value);
  if (!due) return Number.POSITIVE_INFINITY;
  return Math.round((due.getTime() - startOfToday().getTime()) / 86_400_000);
}

function delivered(project: WorkItem) {
  return project.status === "Delivered";
}

function reviewProject(project: WorkItem) {
  return (
    ["Review", "Revision", "Client Review"].includes(project.status) ||
    /review|feedback|approval|revision/i.test(project.notes)
  );
}

function progressFor(project: WorkItem) {
  if (project.status === "Delivered") return 100;
  if (project.status === "Review" || project.status === "Client Review")
    return 82;
  if (project.status === "Revision") return 72;
  if (project.status === "In Progress") return 54;
  if (project.status === "Cancelled") return 0;
  return 18;
}

function priorityFor(project: WorkItem) {
  const days = daysFromToday(project.dueDate);
  if (!delivered(project) && days < 0) return "Urgent";
  if (!delivered(project) && days <= 2) return "High";
  if (!delivered(project) && days <= 7) return "Medium";
  return "Low";
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  const date = parseDate(value);
  if (!date) return "No date";
  return new Intl.DateTimeFormat(
    "en",
    options ?? { month: "short", day: "numeric", year: "numeric" }
  ).format(date);
}

function formatMoney(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode || "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function relativeActivityTime(value: string) {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "Recently";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
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
  for (const char of project.id || project.title)
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

/** Muted pastel status chips — scarce color, uppercase meta. */
function StatusBadge({ status }: { status: WorkItem["status"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 rounded-full border px-2 text-[10px] font-medium uppercase tracking-[0.05em]",
        projectStatusTone(status)
      )}
    >
      {status}
    </Badge>
  );
}

function PriorityBadge({ project }: { project: WorkItem }) {
  const priority = priorityFor(project);
  const tone =
    priority === "Urgent" || priority === "High"
      ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
      : priority === "Medium"
        ? "bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
        : "bg-[var(--app-soft-panel)] text-[var(--app-muted)]";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em]",
        tone
      )}
    >
      {priority}
    </span>
  );
}

export function PrecisionDashboard(props: DashboardProps) {
  const reduceMotion = useHydratedReducedMotion();
  const [selectedId, setSelectedId] = useState(
    props.visibleProjects[0]?.id ?? ""
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activityMode, setActivityMode] = useState<"recent" | "team">("recent");
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const activityScrollTopRef = useRef<number | null>(null);

  useEffect(() => {
    if (!props.visibleProjects.some((project) => project.id === selectedId)) {
      setSelectedId(props.visibleProjects[0]?.id ?? "");
    }
  }, [props.visibleProjects, selectedId]);

  useLayoutEffect(() => {
    if (activityScrollTopRef.current === null) return;
    const contentViewport = document.getElementById("main-content");
    if (contentViewport)
      contentViewport.scrollTop = activityScrollTopRef.current;
    activityScrollTopRef.current = null;
  }, [activityMode]);

  const selected =
    props.projects.find((project) => project.id === selectedId) ??
    props.visibleProjects[0] ??
    null;
  const projectSummary = useMemo(() => {
    const activeProjects = props.projects.filter(
      (project) => !delivered(project) && project.status !== "Cancelled"
    );
    return {
      overdue: activeProjects.filter(
        (project) => daysFromToday(project.dueDate) < 0
      ),
      dueThisWeek: activeProjects.filter((project) => {
        const days = daysFromToday(project.dueDate);
        return days >= 0 && days <= 7;
      }),
      dueSoon: activeProjects
        .filter((project) => daysFromToday(project.dueDate) >= 0)
        .sort((a, b) => daysFromToday(a.dueDate) - daysFromToday(b.dueDate))
        .slice(0, 6),
      waitingReviews: activeProjects.filter(reviewProject),
      blockers: activeProjects.filter(
        (project) =>
          reviewProject(project) ||
          daysFromToday(project.dueDate) < 0 ||
          /missing|waiting|blocked/i.test(project.notes)
      ),
    };
  }, [props.projects]);
  const { overdue, dueThisWeek, dueSoon, waitingReviews, blockers } =
    projectSummary;
  const salarySize = Math.max(1, Number(props.settings.salaryBatchSize) || 20);
  const pendingSalaryBatch = useMemo(
    () =>
      props.salaryBatches
        .filter((batch) => !batch.archived && !batch.paid)
        .sort((a, b) => a.number - b.number)[0] ?? null,
    [props.salaryBatches]
  );
  const salaryProgress =
    props.stats.salaryBatchProgress || (pendingSalaryBatch ? salarySize : 0);
  const salaryPercent = Math.min(
    100,
    Math.round((salaryProgress / salarySize) * 100)
  );
  const showSalaryBatch = props.projects.some(
    (project) =>
      project.workType.trim().toLowerCase() ===
      props.settings.salaryWorkType.trim().toLowerCase()
  );
  const activeFilterCount = [
    props.statusFilter !== "All",
    props.kindFilter !== "ALL",
    props.clientFilter !== "ALL",
    props.dueFilter !== "ALL",
    props.billingFilter !== "ALL",
  ].filter(Boolean).length;

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Project",
        cell: ({ row }) => {
          const project = row.original;
          return (
            <div className="flex min-w-[220px] items-center gap-3">
              <div
                className="relative hidden h-9 w-12 shrink-0 overflow-hidden rounded-md border border-[var(--app-border)] sm:block"
                style={{ background: projectColor(project) }}
              >
                <span className="absolute inset-x-2 bottom-2 h-px rounded bg-[var(--app-ink)]/20" />
                <FolderOpen
                  className="absolute right-1.5 top-1.5 size-3 text-[var(--app-ink)]/25"
                  strokeWidth={1.75}
                />
              </div>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium tracking-[-0.01em] text-[var(--app-ink)]">
                  {project.title}
                </span>
                <span className="mt-0.5 block max-w-[260px] truncate text-[11px] leading-relaxed text-[var(--app-muted)]">
                  {project.client ? `${project.client} · ` : ""}
                  {project.notes || "No notes"}
                </span>
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor("workType", {
        header: "Type",
        cell: (info) => (
          <span className="whitespace-nowrap text-xs text-[var(--app-muted)]">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("dueDate", {
        header: "Due date",
        cell: (info) => (
          <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-[var(--app-muted)]">
            {formatDate(info.getValue(), { month: "short", day: "numeric" })}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: "progress",
        header: "Progress",
        cell: ({ row }) => {
          const progress = progressFor(row.original);
          return (
            <div className="w-[110px]">
              <div className="mb-1.5 flex items-center justify-between text-[10px]">
                <span className="font-mono tabular-nums text-[var(--app-muted)]">
                  {progress}%
                </span>
                <PriorityBadge project={row.original} />
              </div>
              <div className="h-1 overflow-hidden rounded-sm bg-[var(--app-progress-track)]">
                <AnimatedProgress value={progress} />
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("earnings", {
        header: "Value",
        cell: ({ getValue, row }) => (
          <span className="whitespace-nowrap font-mono text-[11px] font-medium tabular-nums text-[var(--app-ink)]">
            {row.original.workType === props.settings.salaryWorkType
              ? "Batch"
              : formatMoney(getValue(), props.settings.currencyCode)}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const project = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${project.title}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => props.onViewProject(project)}>
                  Open project
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!props.canEditProjects && Boolean(project.teamId)}
                  onSelect={() => props.onEditProject(project)}
                >
                  <Edit3 strokeWidth={1.75} /> Edit project
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={!props.canDeleteProject(project)}
                  onSelect={() => props.onDeleteProject(project.id)}
                >
                  <Trash2 strokeWidth={1.75} /> Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }),
    ],
    [
      props.canDeleteProject,
      props.canEditProjects,
      props.onDeleteProject,
      props.onEditProject,
      props.onViewProject,
      props.settings.currencyCode,
      props.settings.salaryWorkType,
    ]
  );

  const table = useReactTable({
    data: props.visibleProjects,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function clearFilters() {
    props.setQuery("");
    props.setStatusFilter("All");
    props.setKindFilter("ALL");
    props.setClientFilter("ALL");
    props.setDueFilter("ALL");
    props.setBillingFilter("ALL");
    props.setSortKey("createdAt_desc");
  }

  function changeActivityMode(mode: "recent" | "team") {
    if (mode === activityMode) return;
    activityScrollTopRef.current =
      document.getElementById("main-content")?.scrollTop ?? null;
    setActivityMode(mode);
  }

  const recentActivity = props.sessionActivity.length
    ? props.sessionActivity
    : props.projects
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.dueDate).getTime() -
            new Date(a.createdAt || a.dueDate).getTime()
        )
        .slice(0, 5)
        .map((project) => ({
          id: project.id,
          kind: delivered(project)
            ? ("delivered" as const)
            : ("updated" as const),
          message: delivered(project)
            ? `${project.title} was delivered`
            : `${project.title} is ${project.status.toLowerCase()}`,
          projectId: project.id,
          actor: "Workspace",
          createdAt: project.createdAt || `${project.dueDate}T00:00:00`,
        }));

  const activity =
    activityMode === "recent"
      ? recentActivity
      : props.teamActivity.map((item) => ({
          id: item._id,
          kind: "team" as const,
          message: item.message,
          projectId: item.projectId,
          actor: item.actorName,
          createdAt: item.createdAt,
        }));

  const entry = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLTableRowElement>,
    project: WorkItem,
    rowIndex: number
  ) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter") {
      event.preventDefault();
      props.onViewProject(project);
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      setSelectedId(project.id);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    const rows = table.getRowModel().rows.slice(0, 5);
    const nextIndex = Math.min(
      rows.length - 1,
      Math.max(0, rowIndex + (event.key === "ArrowDown" ? 1 : -1))
    );
    const nextProject = rows[nextIndex]?.original;
    if (!nextProject) return;
    setSelectedId(nextProject.id);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLTableRowElement>(
          `[data-project-id="${CSS.escape(nextProject.id)}"]`
        )
        ?.focus();
    });
  }

  const attentionContext = [...blockers, ...overdue, ...dueSoon]
    .filter(
      (project, index, projects) =>
        projects.findIndex((candidate) => candidate.id === project.id) === index
    )
    .slice(0, 4);

  return (
    <WorkspacePage family="data-index">
      <motion.div
        className="contents"
        initial={entry.initial}
        animate={entry.animate}
        transition={{ duration: reduceMotion ? 0 : 0.5, ease: easing }}
      >
        <PageHeader
          eyebrow="Production desk"
          title={
            <>
              Good to see you,{" "}
              {props.settings.profileName?.split(" ")[0] || "editor"}.
            </>
          }
          description="Scan commitments, deadlines, handoffs, and earnings from one focused production ledger."
          actions={
            <PageToolbar
              primary={
                <div className="relative min-w-[220px] flex-1 lg:w-[300px] lg:flex-none">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--app-muted)]"
                    strokeWidth={1.75}
                  />
                  <Input
                    value={props.query}
                    onChange={(event) => props.setQuery(event.target.value)}
                    placeholder="Search the project ledger"
                    aria-label="Search dashboard projects"
                    className="h-9 rounded-md border-[var(--app-border)] bg-[var(--app-panel)] pl-9 text-xs shadow-none focus-visible:border-[var(--app-accent)]"
                  />
                </div>
              }
              secondary={
                <>
                  <Button
                    variant="outline"
                    className="h-9 rounded-md border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-[11px] shadow-none"
                    aria-expanded={showFilters}
                    aria-controls="dashboard-filters"
                    onClick={() => setShowFilters((value) => !value)}
                  >
                    <ListFilter className="size-3.5" strokeWidth={1.75} />
                    Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
                  </Button>
                  <Select
                    value={props.sortKey}
                    onValueChange={(value) =>
                      props.setSortKey(value as SortKey)
                    }
                  >
                    <SelectTrigger
                      aria-label="Sort dashboard projects"
                      className="h-9 w-[142px] rounded-md border-[var(--app-border)] bg-[var(--app-panel)] text-[11px] shadow-none"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt_desc">Newest</SelectItem>
                      <SelectItem value="createdAt_asc">Oldest</SelectItem>
                      <SelectItem value="dueDate_asc">Due soon</SelectItem>
                      <SelectItem value="earnings_desc">
                        Highest value
                      </SelectItem>
                      <SelectItem value="earnings_asc">Lowest value</SelectItem>
                    </SelectContent>
                  </Select>
                  {activeFilterCount > 0 || props.query ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2 text-[11px] text-[var(--app-muted)]"
                      onClick={clearFilters}
                    >
                      Clear all
                    </Button>
                  ) : null}
                </>
              }
            />
          }
        />
        <PageContent className="flex flex-col gap-4 space-y-0">
          <AnimatePresence initial={false}>
            {showFilters ? (
              <motion.div
                id="dashboard-filters"
                initial={
                  reduceMotion
                    ? { opacity: 1 }
                    : { opacity: 0, height: 0, y: -8 }
                }
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, height: 0, y: -8 }
                }
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: easing }}
                className={cn(
                  "my-3 grid overflow-hidden gap-2 p-3 sm:grid-cols-2 lg:grid-cols-5",
                  surface
                )}
              >
                <Select
                  value={props.statusFilter}
                  onValueChange={(value) =>
                    props.setStatusFilter(value as ProjectStatus | "All")
                  }
                >
                  <SelectTrigger
                    aria-label="Filter by project status"
                    className="h-8 rounded-md bg-[var(--app-control)] text-[11px] shadow-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={props.kindFilter}
                  onValueChange={props.setKindFilter}
                >
                  <SelectTrigger
                    aria-label="Filter by project type"
                    className="h-8 rounded-md bg-[var(--app-control)] text-[11px] shadow-none"
                  >
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.projectTagOptions.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value === "ALL" ? "All types" : value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={props.clientFilter}
                  onValueChange={props.setClientFilter}
                >
                  <SelectTrigger
                    aria-label="Filter by client"
                    className="h-8 rounded-md bg-[var(--app-control)] text-[11px] shadow-none"
                  >
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.clientOptions.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value === "ALL" ? "All clients" : value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={props.dueFilter}
                  onValueChange={(value) =>
                    props.setDueFilter(value as DueFilter)
                  }
                >
                  <SelectTrigger
                    aria-label="Filter by due date"
                    className="h-8 rounded-md bg-[var(--app-control)] text-[11px] shadow-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Any date</SelectItem>
                    <SelectItem value="This Week">This week</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={props.billingFilter}
                  onValueChange={(value) =>
                    props.setBillingFilter(value as "ALL" | "Paid" | "Unpaid")
                  }
                >
                  <SelectTrigger
                    aria-label="Filter by payment status"
                    className="h-8 rounded-md bg-[var(--app-control)] text-[11px] shadow-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Payments</SelectItem>
                    <SelectItem value="Paid">Collected</SelectItem>
                    <SelectItem value="Unpaid">Needs action</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div
            className="order-2"
            initial={entry.initial}
            animate={entry.animate}
            transition={{
              delay: reduceMotion ? 0 : 0.04,
              duration: reduceMotion ? 0 : 0.5,
              ease: easing,
            }}
          >
            <MetricStrip
              columns={showSalaryBatch ? 5 : 4}
              aria-label="Operational pulse"
              className="gap-0 bg-transparent"
            >
              <div className="bg-[var(--app-panel)] px-4 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
                  In motion
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-xl font-semibold tracking-[-0.04em] tabular-nums text-[var(--app-highlight)]">
                    <AnimatedNumber value={props.stats.active} />
                  </p>
                  <span className="text-[10px] text-[var(--app-muted)]">
                    of {props.stats.total} projects
                  </span>
                </div>
              </div>
              <div className="bg-[var(--app-panel)] px-4 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
                  Due this week
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-xl font-semibold tracking-[-0.04em] tabular-nums text-[var(--app-ink)]">
                    <AnimatedNumber value={dueThisWeek.length} />
                  </p>
                  <span className="text-[10px] text-[var(--app-muted)]">
                    upcoming handoffs
                  </span>
                </div>
              </div>
              <div className="bg-[var(--app-panel)] px-4 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
                  Waiting reviews
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p
                    className={cn(
                      "text-xl font-semibold tracking-[-0.04em] tabular-nums",
                      waitingReviews.length
                        ? "text-[var(--app-warning)]"
                        : "text-[var(--app-ink)]"
                    )}
                  >
                    <AnimatedNumber value={waitingReviews.length} />
                  </p>
                  <span className="text-[10px] text-[var(--app-muted)]">
                    awaiting client action
                  </span>
                </div>
              </div>
              <div className="bg-[var(--app-panel)] px-4 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
                  Collected
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="truncate text-xl font-semibold tracking-[-0.04em] tabular-nums text-[var(--app-ink)]">
                    <AnimatedNumber
                      value={props.stats.collected}
                      format={(value) =>
                        formatMoney(value, props.settings.currencyCode)
                      }
                    />
                  </p>
                  <span className="shrink-0 text-[10px] text-[var(--app-muted)]">
                    {formatMoney(
                      props.stats.outstanding,
                      props.settings.currencyCode
                    )}{" "}
                    due
                  </span>
                </div>
              </div>
              {showSalaryBatch ? (
                <div className="bg-[var(--app-panel)] px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
                      Salary batch
                    </p>
                    <span className="font-mono text-[9px] tabular-nums text-[var(--app-muted)]">
                      <AnimatedNumber value={salaryPercent} />%
                    </span>
                  </div>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <div
                      data-testid="salary-batch-progress"
                      className="flex items-baseline gap-1"
                    >
                      <p className="text-xl font-semibold tracking-[-0.04em] tabular-nums text-[var(--app-ink)]">
                        <AnimatedNumber value={salaryProgress} />
                      </p>
                      <span className="text-[10px] text-[var(--app-muted)]">
                        / {salarySize} edits
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 shrink-0 px-2 text-[9px] shadow-none"
                      disabled={!pendingSalaryBatch}
                      aria-label={
                        pendingSalaryBatch
                          ? `Mark payment for salary batch ${pendingSalaryBatch.number}`
                          : "Mark payment"
                      }
                      onClick={() => {
                        if (pendingSalaryBatch)
                          props.onMarkSalaryPayment(pendingSalaryBatch.id);
                      }}
                    >
                      Mark payment
                    </Button>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-sm bg-[var(--app-progress-track)]">
                    <AnimatedProgress value={salaryPercent} />
                  </div>
                </div>
              ) : null}
            </MetricStrip>
          </motion.div>

          <motion.div
            className="order-3"
            initial={entry.initial}
            animate={entry.animate}
            transition={{
              delay: reduceMotion ? 0 : 0.08,
              duration: reduceMotion ? 0 : 0.55,
              ease: easing,
            }}
          >
            <SplitPane
              ratio="inspector"
              className="items-stretch"
              primary={
                <div className="h-full min-w-0">
                  <WorkspaceSection
                    title="Project ledger"
                    count={props.visibleProjects.length}
                    icon={FolderKanban}
                    className="h-full"
                    action={
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-[11px] text-[var(--app-muted)] hover:text-[var(--app-ink)]"
                      >
                        <Link href="/projects">
                          View all projects
                          <ArrowRight className="size-3.5" strokeWidth={1.75} />
                        </Link>
                      </Button>
                    }
                  >
                    <DataTableFrame
                      bounded={false}
                      bodyClassName="overflow-x-auto"
                    >
                      {props.visibleProjects.length ? (
                        <>
                          <div className="divide-y divide-[var(--app-border)] sm:hidden">
                            {table
                              .getRowModel()
                              .rows.slice(0, 5)
                              .map((row, rowIndex) => {
                                const project = row.original;
                                const progress = progressFor(project);
                                return (
                                  <motion.button
                                    key={row.id}
                                    type="button"
                                    data-testid="mobile-project-row"
                                    className={cn(
                                      "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3.5 text-left outline-none transition-colors hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)]",
                                      selected?.id === project.id &&
                                        "bg-[var(--app-active)]"
                                    )}
                                    initial={
                                      reduceMotion
                                        ? false
                                        : { opacity: 0, y: 8 }
                                    }
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                      delay: reduceMotion
                                        ? 0
                                        : Math.min(rowIndex * 0.08, 0.4),
                                      duration: reduceMotion ? 0 : 0.4,
                                      ease: easing,
                                    }}
                                    onClick={() => props.onViewProject(project)}
                                  >
                                    <span className="min-w-0">
                                      <span className="flex items-center gap-2">
                                        <span className="truncate text-[13px] font-medium tracking-[-0.01em]">
                                          {project.title}
                                        </span>
                                        <StatusBadge status={project.status} />
                                      </span>
                                      <span className="mt-1 block truncate text-[11px] text-[var(--app-muted)]">
                                        {project.client || project.workType} ·{" "}
                                        {formatDate(project.dueDate, {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                      <span className="mt-2.5 block h-1 overflow-hidden rounded-sm bg-[var(--app-progress-track)]">
                                        <span
                                          className="block h-full rounded-sm bg-[var(--app-accent)]"
                                          style={{ width: `${progress}%` }}
                                        />
                                      </span>
                                    </span>
                                    <span className="flex flex-col items-end justify-between">
                                      <PriorityBadge project={project} />
                                      <span className="font-mono text-[11px] font-medium tabular-nums text-[var(--app-muted)]">
                                        {progress}%
                                      </span>
                                    </span>
                                  </motion.button>
                                );
                              })}
                          </div>
                          <div className="hidden overflow-x-auto sm:block">
                            <table
                              className="w-full min-w-[700px] border-collapse"
                              aria-label="Project ledger"
                            >
                              <caption className="sr-only">
                                Recent projects with type, due date, status,
                                progress, value, and actions.
                              </caption>
                              <thead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                  <tr
                                    key={headerGroup.id}
                                    className="border-y border-[var(--app-border)] bg-[var(--app-soft-panel)]/60"
                                  >
                                    {headerGroup.headers.map((header) => (
                                      <th
                                        key={header.id}
                                        aria-sort={
                                          header.column.getIsSorted() === "asc"
                                            ? "ascending"
                                            : header.column.getIsSorted() ===
                                                "desc"
                                              ? "descending"
                                              : "none"
                                        }
                                        className={cn(
                                          "h-8 px-3 text-left text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--app-subtle)]",
                                          header.column.id === "workType" &&
                                            "hidden 2xl:table-cell"
                                        )}
                                      >
                                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                          <button
                                            type="button"
                                            className="group inline-flex items-center gap-1 rounded-sm py-1 text-left transition-colors hover:text-[var(--app-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                                            onClick={header.column.getToggleSortingHandler()}
                                          >
                                            {flexRender(
                                              header.column.columnDef.header,
                                              header.getContext()
                                            )}
                                            <SortIcon
                                              direction={header.column.getIsSorted()}
                                            />
                                          </button>
                                        ) : (
                                          flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                          )
                                        )}
                                      </th>
                                    ))}
                                  </tr>
                                ))}
                              </thead>
                              <motion.tbody
                                key={`${props.query}-${props.statusFilter}-${props.kindFilter}-${props.clientFilter}-${props.dueFilter}-${props.billingFilter}-${props.sortKey}`}
                                className="divide-y divide-[var(--app-border)]"
                                initial={reduceMotion ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                  duration: reduceMotion ? 0 : 0.25,
                                }}
                              >
                                {table
                                  .getRowModel()
                                  .rows.slice(0, 5)
                                  .map((row, rowIndex) => (
                                    <motion.tr
                                      key={row.id}
                                      role="button"
                                      tabIndex={0}
                                      data-testid="project-row"
                                      data-project-title={row.original.title}
                                      data-project-id={row.original.id}
                                      aria-selected={
                                        selected?.id === row.original.id
                                      }
                                      aria-label={`Select ${row.original.title}. ${row.original.status}. Due ${formatDate(row.original.dueDate, { month: "short", day: "numeric" })}.`}
                                      className={cn(
                                        "h-[var(--workspace-row-height,58px)] cursor-pointer outline-none transition-colors hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)]",
                                        selected?.id === row.original.id &&
                                          "bg-[var(--app-active)] shadow-[inset_3px_0_0_var(--app-accent)]"
                                      )}
                                      initial={
                                        reduceMotion
                                          ? false
                                          : { opacity: 0, y: 8 }
                                      }
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{
                                        delay: reduceMotion
                                          ? 0
                                          : Math.min(rowIndex * 0.08, 0.4),
                                        duration: reduceMotion ? 0 : 0.4,
                                        ease: easing,
                                      }}
                                      whileTap={
                                        reduceMotion
                                          ? undefined
                                          : { scale: 0.998 }
                                      }
                                      onClick={() => {
                                        setSelectedId(row.original.id);
                                        if (
                                          window.matchMedia(
                                            "(max-width: 1279px)"
                                          ).matches
                                        ) {
                                          setMobileInspectorOpen(true);
                                        }
                                      }}
                                      onDoubleClick={() =>
                                        props.onViewProject(row.original)
                                      }
                                      onKeyDown={(event) =>
                                        handleRowKeyDown(
                                          event,
                                          row.original,
                                          rowIndex
                                        )
                                      }
                                    >
                                      {row.getVisibleCells().map((cell) => (
                                        <td
                                          key={cell.id}
                                          className={cn(
                                            "px-3 py-2 text-xs text-[var(--app-ink)]",
                                            cell.column.id === "workType" &&
                                              "hidden 2xl:table-cell"
                                          )}
                                        >
                                          {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                          )}
                                        </td>
                                      ))}
                                    </motion.tr>
                                  ))}
                              </motion.tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <motion.div
                          className="grid min-h-52 place-items-center px-6 text-center"
                          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: reduceMotion ? 0 : 0.4,
                            ease: easing,
                          }}
                        >
                          <div>
                            <div className="mx-auto grid size-10 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)]">
                              <FolderKanban
                                className="size-4 text-[var(--app-muted)]"
                                strokeWidth={1.75}
                              />
                            </div>
                            <p className="mt-4 text-sm font-medium tracking-[-0.01em]">
                              No projects in this view
                            </p>
                            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-[var(--app-muted)]">
                              {activeFilterCount || props.query
                                ? "No projects match the current filters."
                                : "Create the first project in your workspace."}
                            </p>
                            <div className="mt-5 flex justify-center gap-2">
                              {activeFilterCount || props.query ? (
                                <Button
                                  variant="outline"
                                  className="h-9 rounded-md shadow-none transition-transform active:scale-[0.98]"
                                  size="sm"
                                  onClick={clearFilters}
                                >
                                  Clear filters
                                </Button>
                              ) : null}
                              <Button
                                className="h-9 rounded-md bg-[var(--app-accent)] text-[var(--app-accent-foreground)] shadow-none hover:bg-[var(--app-accent)]/90"
                                size="sm"
                                onClick={props.onNewProject}
                                disabled={!props.canCreateProjects}
                              >
                                Create project
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </DataTableFrame>
                  </WorkspaceSection>
                </div>
              }
              secondary={
                <div className="h-full min-w-0">
                  <ProjectInspector
                    project={selected}
                    settings={props.settings}
                    onOpen={props.onViewProject}
                    onEdit={props.onEditProject}
                    canEdit={props.canEditProjects}
                  />
                </div>
              }
            />
          </motion.div>

          <motion.section
            className="order-1"
            initial={entry.initial}
            animate={entry.animate}
            transition={{
              delay: reduceMotion ? 0 : 0.12,
              duration: reduceMotion ? 0 : 0.55,
              ease: easing,
            }}
            aria-label="Workspace follow-up"
          >
            <SplitPane
              ratio="balanced"
              primary={
                <WorkspaceSection
                  title="Attention queue"
                  count={attentionContext.length}
                  icon={CalendarClock}
                  className="h-full"
                  action={
                    overdue.length ? (
                      <span className="font-mono text-[9px] text-[var(--app-danger)]">
                        {overdue.length} overdue
                      </span>
                    ) : null
                  }
                >
                  {attentionContext.length ? (
                    <div className="divide-y divide-[var(--app-border)]">
                      {attentionContext.map((project) => {
                        const days = daysFromToday(project.dueDate);
                        return (
                          <button
                            key={project.id}
                            type="button"
                            className={cn(
                              "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-left outline-none transition-colors hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)]",
                              selected?.id === project.id &&
                                "bg-[var(--app-active)]"
                            )}
                            onClick={() => {
                              setSelectedId(project.id);
                              if (
                                window.matchMedia("(max-width: 1279px)").matches
                              )
                                setMobileInspectorOpen(true);
                            }}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-medium text-[var(--app-ink)]">
                                {project.title}
                              </span>
                              <span className="mt-0.5 block truncate text-[10px] text-[var(--app-muted)]">
                                {project.client || project.workType}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "font-mono text-[10px] tabular-nums",
                                days < 0
                                  ? "text-[var(--app-danger)]"
                                  : "text-[var(--app-muted)]"
                              )}
                            >
                              {days < 0
                                ? `${Math.abs(days)}d late`
                                : days === 0
                                  ? "Today"
                                  : formatDate(project.dueDate, {
                                      month: "short",
                                      day: "numeric",
                                    })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptySection label="No deadlines, blockers, or reviews need attention." />
                  )}
                </WorkspaceSection>
              }
              secondary={
                <WorkspaceSection
                  title="Activity"
                  count={activity.length}
                  icon={Clock3}
                  className="h-full"
                  action={
                    <div className="flex rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] p-0.5">
                      <button
                        type="button"
                        className={cn(
                          "relative min-h-7 rounded px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.05em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]",
                          activityMode === "recent"
                            ? "text-[var(--app-highlight)]"
                            : "text-[var(--app-muted)]"
                        )}
                        aria-pressed={activityMode === "recent"}
                        onClick={() => changeActivityMode("recent")}
                      >
                        {activityMode === "recent" ? (
                          <motion.span
                            layoutId="activity-mode"
                            className="absolute inset-0 rounded bg-[var(--app-panel)]"
                          />
                        ) : null}
                        <span className="relative">Recent</span>
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "relative min-h-7 rounded px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.05em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]",
                          activityMode === "team"
                            ? "text-[var(--app-highlight)]"
                            : "text-[var(--app-muted)]"
                        )}
                        aria-pressed={activityMode === "team"}
                        onClick={() => changeActivityMode("team")}
                      >
                        {activityMode === "team" ? (
                          <motion.span
                            layoutId="activity-mode"
                            className="absolute inset-0 rounded bg-[var(--app-panel)]"
                          />
                        ) : null}
                        <span className="relative">Team</span>
                      </button>
                    </div>
                  }
                >
                  <div className="min-h-[224px]">
                    {props.teamLoading && activityMode === "team" ? (
                      <ActivitySkeleton />
                    ) : activity.length ? (
                      <motion.div
                        key={activityMode}
                        className="divide-y divide-[var(--app-border)]"
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: reduceMotion ? 0 : 0.3,
                          ease: easing,
                        }}
                      >
                        {activity.slice(0, 4).map((item, index) => (
                          <motion.div
                            key={item.id}
                            className="flex items-start gap-3 px-4 py-3"
                            initial={
                              reduceMotion ? false : { opacity: 0, y: 6 }
                            }
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: reduceMotion ? 0 : index * 0.08,
                              ease: easing,
                            }}
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md",
                                item.kind === "delivered"
                                  ? "bg-[var(--app-success-bg)] text-[var(--app-success)]"
                                  : "bg-[var(--app-active)] text-[var(--app-highlight)]"
                              )}
                            >
                              {item.kind === "delivered" ? (
                                <CheckCircle2
                                  className="size-3"
                                  strokeWidth={1.75}
                                />
                              ) : (
                                <MessageSquareText
                                  className="size-3"
                                  strokeWidth={1.75}
                                />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 block text-[11px] font-medium leading-4 text-[var(--app-ink)]">
                                {item.message}
                              </span>
                              <span className="mt-0.5 block font-mono text-[9px] text-[var(--app-muted)]">
                                {item.actor || props.teamName || "Workspace"} ·{" "}
                                {relativeActivityTime(item.createdAt)}
                              </span>
                            </span>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <EmptySection label="No activity has been recorded yet." />
                    )}
                  </div>
                </WorkspaceSection>
              }
            />
          </motion.section>
        </PageContent>

        <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
          <SheetContent
            side="right"
            className="w-full overflow-y-auto p-0 sm:max-w-md xl:hidden"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Project details</SheetTitle>
              <SheetDescription>
                Review the selected project and open its full workspace.
              </SheetDescription>
            </SheetHeader>
            <ProjectInspector
              project={selected}
              settings={props.settings}
              onOpen={props.onViewProject}
              onEdit={props.onEditProject}
              canEdit={props.canEditProjects}
              mobile
            />
          </SheetContent>
        </Sheet>
      </motion.div>
    </WorkspacePage>
  );
}

function WorkspaceSection({
  title,
  count,
  icon: Icon,
  action,
  className,
  children,
}: {
  title: string;
  count?: number;
  icon: typeof FolderKanban;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ContentSection
      aria-label={title}
      title={title}
      metadata={
        <>
          <Icon
            className="size-3.5 text-[var(--app-muted)]"
            strokeWidth={1.75}
          />
          {typeof count === "number" ? (
            <span className="rounded-full bg-[var(--app-soft-panel)] px-2 py-0.5 font-mono text-[10px] tabular-nums text-[var(--app-muted)]">
              {count}
            </span>
          ) : null}
        </>
      }
      actions={action}
      bodyMode="flush"
      className={cn(surface, className)}
    >
      {children}
    </ContentSection>
  );
}

function EmptySection({ label }: { label: string }) {
  const reduceMotion = useHydratedReducedMotion();
  return (
    <motion.div
      className="grid min-h-28 place-items-center px-6 text-center text-xs leading-relaxed text-[var(--app-muted)]"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {label}
    </motion.div>
  );
}

function ActivitySkeleton() {
  const reduceMotion = useHydratedReducedMotion();
  return (
    <div
      className="divide-y divide-[var(--app-border)]"
      aria-label="Loading team activity"
      aria-busy="true"
    >
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex items-start gap-3 px-4 py-3.5">
          <motion.span
            className="size-6 shrink-0 rounded-md bg-[var(--app-soft-panel)]"
            animate={reduceMotion ? undefined : { opacity: [0.45, 0.8, 0.45] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: item * 0.1,
            }}
          />
          <div className="flex-1 space-y-2">
            <motion.div
              className="h-2.5 rounded-sm bg-[var(--app-soft-panel)]"
              style={{ width: `${78 - item * 9}%` }}
              animate={
                reduceMotion ? undefined : { opacity: [0.45, 0.8, 0.45] }
              }
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: item * 0.1,
              }}
            />
            <div className="h-2 w-24 rounded-sm bg-[var(--app-soft-panel)] opacity-60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectInspector({
  project,
  settings,
  onOpen,
  onEdit,
  canEdit,
  mobile = false,
}: {
  project: WorkItem | null;
  settings: SettingsState;
  onOpen: (project: WorkItem) => void;
  onEdit: (project: WorkItem) => void;
  canEdit: boolean;
  mobile?: boolean;
}) {
  const reduceMotion = useHydratedReducedMotion();

  if (!project) {
    return (
      <motion.aside
        className={cn(
          surface,
          "min-h-[420px]",
          mobile
            ? "grid place-items-center rounded-none border-0 shadow-none"
            : "hidden xl:grid xl:place-items-center"
        )}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="px-8 text-center">
          <div className="mx-auto grid size-10 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)]">
            <FolderKanban
              className="size-4 text-[var(--app-muted)]"
              strokeWidth={1.75}
            />
          </div>
          <p className="mt-4 text-sm font-medium tracking-[-0.01em]">
            Select a project
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--app-muted)]">
            Project context will stay visible here.
          </p>
        </div>
      </motion.aside>
    );
  }

  const progress = progressFor(project);

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={project.id}
        className={cn(
          "border border-[var(--app-border)] bg-[var(--app-panel)]",
          mobile
            ? "min-h-dvh overflow-y-auto rounded-none border-0"
            : "hidden h-full overflow-hidden rounded-[10px] xl:block"
        )}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={{ duration: reduceMotion ? 0 : 0.35, ease: easing }}
      >
        <motion.div
          className={cn(
            "flex items-start gap-3 border-b border-[var(--app-border)]",
            mobile ? "p-5" : "p-3.5"
          )}
          layout
        >
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--app-accent)]" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-medium tracking-[-0.02em] leading-snug">
              {project.title}
            </h2>
            <div className="mt-2">
              <StatusBadge status={project.status} />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Project actions"
              >
                <MoreHorizontal strokeWidth={1.75} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onOpen(project)}>
                Open project
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canEdit && Boolean(project.teamId)}
                onSelect={() => onEdit(project)}
              >
                Edit project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>

        <div className={cn(mobile ? "space-y-4 p-5" : "space-y-3 p-3.5")}>
          <div
            className={cn(
              "grid grid-cols-2 gap-x-4",
              mobile ? "gap-y-4" : "gap-y-3"
            )}
          >
            <InspectorField
              icon={UsersRound}
              label="Client"
              value={project.client || "No client"}
            />
            <InspectorField
              icon={FolderKanban}
              label="Type"
              value={project.workType}
            />
            <InspectorField
              icon={CalendarClock}
              label="Due date"
              value={formatDate(project.dueDate, {
                month: "short",
                day: "numeric",
              })}
            />
            <InspectorField
              icon={AlertCircle}
              label="Priority"
              value={priorityFor(project)}
            />
          </div>

          <div
            className={cn(
              "border-t border-[var(--app-border)]",
              mobile ? "pt-4" : "pt-3"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--app-muted)]">
                Progress
              </p>
              <span className="font-mono text-[11px] tabular-nums text-[var(--app-muted)]">
                {progress}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-[var(--app-progress-track)]">
              <AnimatedProgress value={progress} />
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--app-muted)]">
              {progress === 100
                ? "Delivery complete"
                : `${Math.max(1, Math.round((100 - progress) / 10))} production steps remaining`}
            </p>
          </div>

          {project.notes ? (
            <div
              className={cn(
                "border-t border-[var(--app-border)]",
                mobile ? "pt-4" : "pt-3"
              )}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--app-muted)]">
                Project note
              </p>
              <p
                className={cn(
                  "mt-2 text-xs leading-5 text-[var(--app-ink)]/80",
                  !mobile && "line-clamp-2"
                )}
              >
                {project.notes}
              </p>
            </div>
          ) : null}

          <div
            className={cn(
              "flex items-end justify-between gap-4 border-t border-[var(--app-border)]",
              mobile ? "pt-4" : "pt-3"
            )}
          >
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--app-muted)]">
                Value
              </p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.02em] tabular-nums">
                {project.workType === settings.salaryWorkType
                  ? "Batch tracked"
                  : formatMoney(project.earnings, settings.currencyCode)}
              </p>
            </div>
            <Button
              className="h-8 rounded-md bg-[var(--app-accent)] px-3 text-[11px] font-semibold text-[var(--app-accent-foreground)] shadow-none hover:bg-[var(--app-accent)]/90"
              onClick={() => onOpen(project)}
              aria-label={`Open project ${project.title}`}
            >
              Open <ArrowRight className="size-3.5" strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

function InspectorField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        className="mt-0.5 size-3.5 text-[var(--app-muted)]"
        strokeWidth={1.75}
      />
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--app-subtle)]">
          {label}
        </p>
        <p className="mt-1 text-[13px] font-medium tracking-[-0.01em]">
          {value}
        </p>
      </div>
    </div>
  );
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc")
    return (
      <ArrowUp className="size-3 text-[var(--app-ink)]" strokeWidth={1.75} />
    );
  if (direction === "desc")
    return (
      <ArrowDown className="size-3 text-[var(--app-ink)]" strokeWidth={1.75} />
    );
  return (
    <ArrowUpDown
      className="size-3 opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70"
      strokeWidth={1.75}
    />
  );
}
