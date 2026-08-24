"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
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
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  AnimatePresence,
  motion,
  MotionConfig,
} from "motion/react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { SettingsState, WorkItem } from "@/lib/types";
import { useHydratedReducedMotion } from "@/lib/motion";
import { projectStatusTone } from "@/lib/project-status-style";
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
  onNewProject: (scope: WorkspaceScope) => void;
  onViewProject: (item: WorkItem) => void;
  onEditProject: (item: WorkItem) => void;
  onDeleteProject: (id: string) => void;
  canCreateProjects: boolean;
  canCreateTeamProjects: boolean;
  canEditProjects: boolean;
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

export function PrecisionProjects(props: PrecisionProjectsProps) {
  const [scope, setScope] = useState<WorkspaceScope>("personal");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedId, setSelectedId] = useState("");
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const reduceMotion = useHydratedReducedMotion();
  const deferredQuery = useDeferredValue(query);
  const deferredStatus = useDeferredValue(status);
  const hasTeam = Boolean(props.teamName);
  const source = scope === "team" ? props.teamProjects : props.personalProjects;
  const isUpdating = deferredQuery !== query || deferredStatus !== status;
  const springTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 430, damping: 38, mass: 0.75 };
  const contentTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };

  useEffect(() => {
    if (!hasTeam && scope === "team") setScope("personal");
  }, [hasTeam, scope]);

  const projects = useMemo(() => source.filter((project) => {
    const haystack = `${project.title} ${project.client || ""} ${project.notes} ${project.workType}`.toLowerCase();
    return (!deferredQuery.trim() || haystack.includes(deferredQuery.trim().toLowerCase()))
      && (deferredStatus === "All" || project.status === deferredStatus);
  }), [deferredQuery, deferredStatus, source]);

  useEffect(() => {
    if (!projects.some((project) => project.id === selectedId)) {
      setSelectedId(projects[0]?.id ?? "");
    }
  }, [projects, selectedId]);

  const selected = source.find((project) => project.id === selectedId) ?? projects[0] ?? null;
  const summary = useMemo(() => ({
    active: source.filter((project) => !delivered(project) && project.status !== "Cancelled").length,
    review: source.filter((project) => ["Review", "Revision", "Client Review"].includes(project.status)).length,
    delivered: source.filter(delivered).length,
    dueSoon: source.filter((project) => {
      if (delivered(project) || project.status === "Cancelled") return false;
      const due = new Date(`${project.dueDate}T00:00:00`).getTime();
      const now = Date.now();
      return due >= now && due <= now + (7 * 86_400_000);
    }).length,
    earned: source.filter(delivered).reduce((total, project) => total + project.earnings, 0),
  }), [source]);

  const columns = useMemo(() => [
    columnHelper.accessor("title", {
      header: "Project",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <ProjectVideoThumbnail project={row.original} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{row.original.title}</p>
            <p className="mt-0.5 max-w-[300px] truncate text-[11px] text-[var(--app-muted)]">
              {row.original.client ? `${row.original.client} · ` : ""}{row.original.notes || "No notes"}
            </p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor("dueDate", {
      header: "Due date",
      cell: (info) => <span className="whitespace-nowrap text-xs">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => <Badge variant="outline" className={cn("h-5 rounded px-1.5 text-[10px] font-semibold", projectStatusTone(info.getValue()))}>{info.getValue()}</Badge>,
    }),
    columnHelper.display({
      id: "progress",
      header: "Progress",
      cell: ({ row }) => {
        const value = progress(row.original);
        return (
          <div className="w-[130px]">
            <div className="mb-1 flex items-center justify-between text-[10px]"><span>{value}%</span><span className={value === 100 ? "text-[var(--app-success)]" : "text-[var(--app-muted)]"}>{value === 100 ? "Done" : "Active"}</span></div>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--app-progress-track)]">
              <motion.div
                className="h-full origin-left rounded-full bg-[var(--app-accent)]"
                initial={false}
                animate={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("earnings", {
      id: "amount",
      header: "Value",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs font-medium">
          {row.original.workType === props.settings.salaryWorkType ? "Batch tracked" : money(row.original.earnings, props.settings.currencyCode)}
        </span>
      ),
    }),
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
            <DropdownMenuItem className="text-destructive focus:text-destructive" disabled={!props.canDeleteProject(row.original)} onSelect={() => props.onDeleteProject(row.original.id)}><Trash2 /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ], [
    props.canDeleteProject,
    props.canEditProjects,
    props.onDeleteProject,
    props.onEditProject,
    props.onViewProject,
    props.settings.currencyCode,
    props.settings.salaryWorkType,
  ]);

  const table = useReactTable({
    data: projects,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project, client, or note..." aria-label="Search projects" className="h-9 bg-[var(--app-panel)] pl-8 text-xs transition-shadow focus-visible:ring-2" />
        </div>
        <div className="flex min-w-[150px] items-center gap-2">
          <SlidersHorizontal className="size-4 shrink-0 text-[var(--app-muted)]" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter projects by status" className="h-9 w-full bg-[var(--app-panel)] text-xs transition-colors"><SelectValue /></SelectTrigger>
            <SelectContent>{["All", "Planned", "In Progress", "Review", "Client Review", "Revision", "Delivered", "Cancelled"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        </>
        }
        secondary={
        <>
        <Button variant="outline" className="h-9" onClick={() => props.onManageProjectGroups(scope)}>Project Groups</Button>
        <div className="relative inline-flex w-fit rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] p-0.5">
          <button
            type="button"
            aria-pressed={scope === "personal"}
            className={cn("relative min-h-9 rounded px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] active:scale-[0.98]", scope === "personal" ? "text-[var(--app-highlight)]" : "text-[var(--app-muted)] hover:text-[var(--app-ink)]")}
            onClick={() => setScope("personal")}
          >
            {scope === "personal" ? <motion.span layoutId="project-scope" className="absolute inset-0 rounded bg-[var(--app-active)]" /> : null}
            <span className="relative">My Projects <span className="ml-1 text-[10px]">{props.personalProjects.length}</span></span>
          </button>
          <button
            type="button"
            disabled={!hasTeam}
            aria-pressed={scope === "team"}
            className={cn("relative min-h-9 rounded px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] active:scale-[0.98] disabled:opacity-40", scope === "team" ? "text-[var(--app-highlight)]" : "text-[var(--app-muted)] hover:text-[var(--app-ink)]")}
            onClick={() => setScope("team")}
          >
            {scope === "team" ? <motion.span layoutId="project-scope" className="absolute inset-0 rounded bg-[var(--app-active)]" /> : null}
            <span className="relative">Team Projects <span className="ml-1 text-[10px]">{props.teamProjects.length}</span></span>
          </button>
        </div>
          <Select
            value={sorting[0]?.id ?? "updated"}
            onValueChange={(value) => setSorting(value === "updated" ? [] : [{ id: value, desc: value === "amount" }])}
          >
            <SelectTrigger aria-label="Sort projects" className="h-9 w-[140px] bg-[var(--app-panel)] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last updated</SelectItem>
              <SelectItem value="dueDate">Due date</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="amount">Value</SelectItem>
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
          <AnimatePresence>
            {isUpdating ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-[var(--app-progress-track)]"
              >
                <motion.span
                  className="block h-full w-1/3 bg-[var(--app-accent)]"
                  initial={reduceMotion ? false : { x: "-100%" }}
                  animate={{ x: reduceMotion ? "0%" : "300%" }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.8, ease: "easeInOut", repeat: Infinity }}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <header className="flex h-12 items-center justify-between px-4">
            <div>
              <h2 className="text-sm font-semibold">Project library</h2>
              <p className="text-[10px] text-[var(--app-muted)]">{scope === "team" ? props.teamName || "Team workspace" : "Private workspace"}</p>
            </div>
            <span className="flex items-center gap-2 text-[11px] text-[var(--app-muted)]" aria-live="polite">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={`${scope}-${deferredStatus}-${projects.length}`}
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

          {projects.length ? (
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
                          aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : "none"}
                          className={cn(
                            "h-8 px-3 text-left text-[10px] font-semibold uppercase text-[var(--app-subtle)]",
                            header.column.id === "title" && "w-[38%]",
                            header.column.id === "dueDate" && "w-[14%]",
                            header.column.id === "status" && "w-[14%]",
                            header.column.id === "progress" && "w-[17%]",
                            header.column.id === "amount" && "w-[13%]",
                            header.column.id === "actions" && "w-[4%]",
                          )}
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button
                              type="button"
                              className="group inline-flex items-center gap-1 rounded-sm py-1 text-left transition-colors hover:text-[var(--app-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <SortIcon direction={header.column.getIsSorted()} />
                            </button>
                          ) : flexRender(header.column.columnDef.header, header.getContext())}
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
                <p className="mt-2 text-sm font-semibold">{query || status !== "All" ? "No projects match these filters" : "No projects in this workspace"}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                  {query || status !== "All" ? "Adjust the search or status filter to bring projects back into view." : "Create the first project to start tracking production work here."}
                </p>
                {query || status !== "All" ? (
                  <Button variant="outline" className="mt-3 h-8 active:scale-[0.98]" size="sm" onClick={() => { setQuery(""); setStatus("All"); }}>
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
        className={cn("rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-6 text-center text-xs text-[var(--app-muted)]", className)}
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
        "workspace-scrollbar-hidden h-full min-h-0 overflow-y-auto overscroll-contain rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]",
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

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ArrowUp className="size-3 text-[var(--app-highlight)]" />;
  if (direction === "desc") return <ArrowDown className="size-3 text-[var(--app-highlight)]" />;
  return <ArrowUpDown className="size-3 opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70" />;
}

function ProjectTableSkeleton({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div className="min-h-72 border-t border-[var(--app-border)]" aria-label="Updating projects">
      {Array.from({ length: 4 }, (_, index) => (
        <motion.div
          key={index}
          className="grid h-[58px] grid-cols-[minmax(180px,1.6fr)_minmax(80px,0.7fr)_minmax(100px,0.9fr)_minmax(72px,0.7fr)_minmax(100px,1fr)] items-center gap-3 border-b border-[var(--app-border)] px-3"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reduceMotion ? { opacity: 0.65 } : { opacity: [0.45, 0.8, 0.45] }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1.2, delay: index * 0.06, repeat: Infinity }}
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
