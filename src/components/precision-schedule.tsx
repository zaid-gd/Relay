"use client";

import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Download,
  Milestone,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { SettingsState, WorkItem } from "@/lib/types";
import { useHydratedReducedMotion } from "@/lib/motion";
import { projectStatusColor, projectStatusTone } from "@/lib/project-status-style";
import { cn } from "@/lib/utils";
import { calendarFeedIcs, deriveCalendarEvents, type WorkspaceOutput } from "@/features/workspace-discovery/workspace-discovery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ContentSection,
  FillViewport,
  PageContent,
  PageHeader,
  PageToolbar,
  PageEmptyState,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string, format: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat("en", format).format(date) : "No date";
}

function isDelivered(project: WorkItem) {
  return project.status === "Delivered";
}

function daysUntil(value: string) {
  const date = parseDate(value);
  if (!date) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

const revealTransition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;

function weekdayIndex(day: string) {
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
  return index >= 0 ? index : 1;
}

function calendarMonthDays(month: Date, weekStart: string) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  const offset = (first.getDay() - weekdayIndex(weekStart) + 7) % 7;
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

function iso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatLongDate(value: string) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(date) : "Select a date";
}

function statusPalette(status: WorkItem["status"]) {
  if (status === "Delivered") return { fg: "var(--app-success)", bg: "color-mix(in srgb,var(--app-success)_14%,transparent)" };
  if (status === "In Progress") return { fg: "var(--app-warning)", bg: "color-mix(in srgb,var(--app-warning)_14%,transparent)" };
  if (status === "Cancelled") return { fg: "var(--app-danger)", bg: "color-mix(in srgb,var(--app-danger)_14%,transparent)" };
  if (status === "Review" || status === "Revision" || status === "Client Review") return { fg: "var(--app-warning)", bg: "color-mix(in srgb,var(--app-warning)_14%,transparent)" };
  return { fg: "var(--app-highlight)", bg: "var(--app-active)" };
}

function projectProgress(status: WorkItem["status"]) {
  if (status === "Delivered") return 100;
  if (status === "Review" || status === "Revision" || status === "Client Review") return 72;
  if (status === "In Progress") return 48;
  if (status === "Cancelled") return 0;
  return 18;
}

export function PrecisionCalendar({
  projects,
  outputs = [],
  settings,
  onViewProject,
}: {
  projects: WorkItem[];
  outputs?: readonly WorkspaceOutput[];
  settings: SettingsState;
  onViewProject: (project: WorkItem) => void;
}) {
  const firstProjectDate = projects.find((project) => parseDate(project.dueDate))?.dueDate;
  const initialDate = firstProjectDate ? parseDate(firstProjectDate)! : todayDate();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(iso(todayDate()));
  const [viewMode, setViewMode] = useState<"month" | "week" | "agenda">("month");
  const reduceMotion = useHydratedReducedMotion();
  const events = useMemo(() => deriveCalendarEvents(projects, outputs, { salaryWorkType: settings.salaryWorkType }), [outputs, projects, settings.salaryWorkType]);

  const monthDays = useMemo(() => calendarMonthDays(visibleMonth, settings.weekStart), [visibleMonth, settings.weekStart]);
  const weekdays = useMemo(() => orderedWeekdays(settings.weekStart), [settings.weekStart]);
  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(visibleMonth);
  const selectedEvents = useMemo(() => events.filter((event) => event.date === selectedDate), [events, selectedDate]);
  const monthProjectCount = useMemo(() => events.filter((event) => {
    const due = parseDate(event.date);
    return due?.getFullYear() === visibleMonth.getFullYear() && due.getMonth() === visibleMonth.getMonth();
  }).length, [events, visibleMonth]);
  const visibleMonthProjects = useMemo(() => projects
    .filter((project) => {
      const due = parseDate(project.dueDate);
      return due?.getFullYear() === visibleMonth.getFullYear() && due.getMonth() === visibleMonth.getMonth();
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title)), [projects, visibleMonth]);
  const selectedWeekDays = useMemo(() => {
    const selected = parseDate(selectedDate) ?? todayDate();
    const weekOffset = settings.weekStart === "Sun" ? selected.getDay() : (selected.getDay() + 6) % 7;
    const start = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() - weekOffset);
    return Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [selectedDate, settings.weekStart]);
  const calendarViewRows = useMemo<Array<{ project: WorkItem | null; dateKey: string }>>(() => {
    if (viewMode === "agenda") {
      return visibleMonthProjects.map((project) => ({ project, dateKey: project.dueDate }));
    }
    if (viewMode === "week") {
      return selectedWeekDays.flatMap((date): Array<{ project: WorkItem | null; dateKey: string }> => {
        const dateKey = iso(date);
        const matches = projects.filter((project) => project.dueDate === dateKey);
        return matches.length
          ? matches.map((project) => ({ project, dateKey }))
          : [{ project: null, dateKey }];
      });
    }
    return [];
  }, [projects, selectedWeekDays, viewMode, visibleMonthProjects]);

  function shiftMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function jumpToToday() {
    const today = todayDate();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(iso(today));
  }

  function downloadFeed() {
    const url = URL.createObjectURL(new Blob([calendarFeedIcs(events)], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "relay-workspace-calendar.ics";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <WorkspacePage family="canvas" mode="fill">
      <PageHeader
        title="Calendar"
        description="A delivery-date calendar for planned, active, and delivered work."
        actions={(
          <div className="flex gap-2">
            <Button variant="outline" className="h-10" onClick={downloadFeed} disabled={!events.length}><Download className="size-4" /> Subscribe .ics</Button>
            <Button variant="outline" className="h-10 border-[var(--app-highlight)] px-4 text-[var(--app-highlight)] hover:bg-[var(--app-active)]" onClick={jumpToToday}><CalendarDays className="size-4" />Today</Button>
          </div>
        )}
      />

      <PageContent mode="fill">
      <PageToolbar
        data-family-toolbar="calendar"
        primary={(
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Previous month" className="size-9 border-[var(--app-border)] text-[var(--app-highlight)]" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous month</TooltipContent>
            </Tooltip>
            <div className="min-w-[170px]">
              <p className="text-sm font-semibold text-[var(--app-ink)]">{monthLabel}</p>
              <p className="text-[10px] text-[var(--app-muted)]">{monthProjectCount} scheduled items</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Next month" className="size-9 border-[var(--app-border)] text-[var(--app-highlight)]" onClick={() => shiftMonth(1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next month</TooltipContent>
            </Tooltip>
          </>
        )}
        secondary={(
          <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-[10px] text-[var(--app-muted)] sm:inline">{monthProjectCount} scheduled</span>
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value === "week" || value === "agenda" ? value : "month")}
            className="block"
          >
            <TabsList aria-label="Calendar view" className="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] p-0.5">
              {(["month", "week", "agenda"] as const).map((mode) => (
                <TabsTrigger key={mode} value={mode} className="h-8 px-3 text-xs capitalize">
                  {mode}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          </div>
        )}
      />
      <FillViewport bodyLabel="Calendar workspace" className="min-h-0" bodyClassName="overflow-auto">
        <SplitPane
          ratio="inspector"
          className="min-h-full"
          primary={viewMode === "month" ? (
            <ContentSection bodyMode="flush" className="h-full">
              <>
              <div className="grid grid-cols-7 border-l border-t border-[var(--app-border)]">
            {weekdays.map((day) => (
              <div key={day} className="border-b border-r border-[var(--app-border)] px-2 py-2 text-[11px] font-semibold uppercase text-[var(--app-muted)]">
                {day}
              </div>
            ))}
            {monthDays.map((day) => {
              const key = iso(day.date);
              const dayEvents = events.filter((event) => event.date === key);
              const isCurrentMonth = day.date.getMonth() === visibleMonth.getMonth();
              const isSelected = selectedDate === key;
              const isToday = key === iso(todayDate());

              return (
                <motion.button
                  key={key}
                  type="button"
                  whileTap={reduceMotion ? undefined : { scale: 0.995 }}
                  aria-label={`Select ${formatDate(key, { month: "long", day: "numeric", year: "numeric" })} with ${dayEvents.length} scheduled ${dayEvents.length === 1 ? "commitment" : "commitments"}`}
                  onClick={() => setSelectedDate(key)}
                  className={cn(
                    "min-h-[84px] border-b border-r border-[var(--app-border)] p-1.5 text-left outline-none transition-colors hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-highlight)] sm:min-h-[108px] sm:p-2",
                    isSelected ? "bg-[var(--app-active)]" : isCurrentMonth ? "bg-[var(--app-panel)]" : "bg-[var(--app-soft-panel)] opacity-55",
                    isToday && !isSelected && "shadow-[inset_0_0_0_2px_var(--app-highlight)]",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("text-[13px] font-semibold", (isSelected || isToday) ? "text-[var(--app-highlight)]" : "text-[var(--app-ink)]")}>{day.date.getDate()}</span>
                    {dayEvents.length ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--app-active)] px-1 text-[11px] font-semibold text-[var(--app-highlight)]">{dayEvents.length}</span> : null}
                  </span>
                  <span className="mt-2 block space-y-1">
                    {dayEvents.slice(0, 1).map((event) => {
                      const project = projects.find((item) => item.id === event.projectId);
                      const palette = statusPalette(project?.status ?? "Planned");
                      return (
                          <span key={event.id} className="block truncate rounded border border-black/5 px-1.5 py-1 text-[11px] font-semibold" style={{ background: palette.bg, color: palette.fg }}>
                          {event.title}
                        </span>
                      );
                    })}
                    {dayEvents.length > 1 ? <span className="block text-[11px] text-[var(--app-muted)]">+{dayEvents.length - 1} more</span> : null}
                  </span>
                </motion.button>
              );
            })}
              </div>
              </>
            </ContentSection>
          ) : (
            <ContentSection
              title={viewMode === "week" ? `Week of ${formatDate(iso(selectedWeekDays[0]), { month: "short", day: "numeric" })}` : `${monthLabel} agenda`}
              description={viewMode === "week" ? "Seven-day delivery and review window." : `${visibleMonthProjects.length} scheduled projects ordered by due date.`}
              bodyMode="flush"
              className="h-full"
            >
              <div className="divide-y divide-[var(--app-border)]">
                {calendarViewRows.map(({ project, dateKey }, index) => (
                  <button
                    key={`${dateKey}-${project?.id ?? "empty"}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedDate(dateKey);
                      if (project) onViewProject(project);
                    }}
                    className="grid w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--app-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-highlight)] sm:grid-cols-[120px_minmax(0,1fr)_120px] sm:items-center"
                  >
                    <span className="text-xs font-medium text-[var(--app-muted)]">{formatDate(dateKey, { weekday: "short", month: "short", day: "numeric" })}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{project?.title ?? "No scheduled delivery"}</span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--app-muted)]">{project ? project.client || project.workType : "Open production time"}</span>
                    </span>
                    {project ? <Badge variant="outline" className={cn("h-5 w-fit rounded px-1.5 text-[10px]", projectStatusTone(project.status))}>{project.status}</Badge> : null}
                  </button>
                ))}
              </div>
            </ContentSection>
          )}
          secondary={(
            <ContentSection title={formatLongDate(selectedDate)} description={`${selectedEvents.length} scheduled commitments`} className="h-full" bodyClassName="h-full">
          <div className="mt-8 space-y-3">
            {selectedEvents.length ? selectedEvents.map((event) => {
              const project = projects.find((item) => item.id === event.projectId);
              if (!project) return null;
              const palette = statusPalette(project.status);
              return (
                <motion.div
                  key={event.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduceMotion ? { duration: 0 } : revealTransition}
                  className="rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{event.title}</p>
                      <p className="mt-1 truncate text-xs text-[var(--app-muted)]">{event.detail ?? event.kind}</p>
                    </div>
                    <Badge variant="outline" className="h-5 shrink-0 rounded px-1.5 text-[10px] capitalize">{event.kind}</Badge>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--app-progress-track)]">
                    <div className="h-full rounded-full bg-[var(--app-highlight)]" style={{ width: `${projectProgress(project.status)}%` }} />
                  </div>
                  <Button variant="ghost" className="mt-3 h-8 px-0 text-xs text-[var(--app-highlight)] hover:bg-transparent" onClick={() => onViewProject(project)}>
                    Open project <ArrowRight className="size-3.5" />
                  </Button>
                </motion.div>
              );
            }) : (
              <PageEmptyState
                icon={<CalendarDays className="size-5" />}
                title="Nothing scheduled"
                description="Select a date with project deliveries or add a project due date."
                className="min-h-[20rem]"
              />
            )}
          </div>
            </ContentSection>
          )}
        />
      </FillViewport>
      </PageContent>
    </WorkspacePage>
  );
}

type MonthGroup = {
  key: string;
  label: string;
  projects: WorkItem[];
};

export function PrecisionTimeline({
  projects,
  onViewProject,
}: {
  projects: WorkItem[];
  onViewProject: (project: WorkItem) => void;
}) {
  const [filter, setFilter] = useState<"All" | "Active" | "Review" | "Delivered">("All");
  const reduceMotion = useHydratedReducedMotion();
  const visibleProjects = useMemo(() => projects.filter((project) => {
    if (filter === "Active") return !isDelivered(project) && project.status !== "Cancelled";
    if (filter === "Review") return ["Review", "Revision", "Client Review"].includes(project.status);
    if (filter === "Delivered") return isDelivered(project);
    return true;
  }), [filter, projects]);
  const groups = useMemo(() => {
    const sorted = visibleProjects
      .filter((project) => parseDate(project.dueDate))
      .slice()
      .sort((a, b) => (parseDate(a.dueDate)?.getTime() ?? 0) - (parseDate(b.dueDate)?.getTime() ?? 0));
    const map = new Map<string, MonthGroup>();
    for (const project of sorted) {
      const date = parseDate(project.dueDate)!;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const existing = map.get(key);
      if (existing) {
        existing.projects.push(project);
      } else {
        map.set(key, {
          key,
          label: new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date),
          projects: [project],
        });
      }
    }
    return Array.from(map.values());
  }, [visibleProjects]);
  const active = projects.filter((project) => !isDelivered(project) && project.status !== "Cancelled").length;
  const review = projects.filter((project) => ["Review", "Revision", "Client Review"].includes(project.status)).length;
  const delivered = projects.filter(isDelivered).length;

  return (
    <WorkspacePage family="data-index">
      <PageHeader
        title="Delivery timeline"
        description="A chronological view of project milestones, reviews, and completed deliveries."
        actions={(
          <div className="flex flex-wrap items-center gap-2 text-xs" aria-label="Timeline summary">
          <span className="rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] px-2.5 py-1.5"><strong className="text-base tabular-nums text-[var(--app-ink)]">{active}</strong><span className="ml-1 text-[var(--app-muted)]">active</span></span>
          <span className="rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] px-2.5 py-1.5"><strong className="text-base tabular-nums text-[var(--app-warning)]">{review}</strong><span className="ml-1 text-[var(--app-muted)]">in review</span></span>
          <span className="rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] px-2.5 py-1.5"><strong className="text-base tabular-nums text-[var(--app-success)]">{delivered}</strong><span className="ml-1 text-[var(--app-muted)]">delivered</span></span>
          </div>
        )}
      />

      <PageContent>
      <PageToolbar
        primary={(
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter timeline">
        {(["All", "Active", "Review", "Delivered"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
            className={cn(
              "h-8 rounded-md px-3 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-highlight)]",
              filter === option && "bg-[var(--app-active)] text-[var(--app-highlight)]",
            )}
          >
            <span>{option}</span>
            <span className="ml-1 text-[10px] tabular-nums opacity-70">{option === "All" ? projects.length : option === "Active" ? active : option === "Review" ? review : delivered}</span>
          </button>
        ))}
          </div>
        )}
        secondary={<span className="text-[10px] text-[var(--app-muted)]" aria-live="polite">{visibleProjects.length} milestones shown</span>}
      />

      {groups.length ? (
        <motion.div
          key={filter}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
          className="mt-6 space-y-8"
        >
          {groups.map((group, groupIndex) => (
            <motion.section
              key={group.key}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { ...revealTransition, delay: groupIndex * 0.035 }}
              className="grid gap-4"
            >
              <div className="relative border-l border-[var(--app-strong-border)] pl-6">
                <ContentSection
                  title={group.label}
                  description={`${group.projects.length} milestone${group.projects.length === 1 ? "" : "s"}`}
                  bodyMode="flush"
                  className="overflow-visible"
                >
                  <div className="divide-y divide-[var(--app-border)]">
                  {group.projects.map((project, projectIndex) => (
                    <motion.button
                      key={project.id}
                      type="button"
                      initial={reduceMotion ? false : { opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={reduceMotion ? { duration: 0 } : { ...revealTransition, delay: (groupIndex * 0.035) + (projectIndex * 0.025) }}
                      whileTap={reduceMotion ? undefined : { scale: 0.995 }}
                      aria-label={`${project.title}, ${project.status}, due ${formatDate(project.dueDate, { month: "long", day: "numeric", year: "numeric" })}`}
                      className="relative grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-[var(--app-hover)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-highlight)] sm:grid-cols-[120px_minmax(0,1fr)_120px_90px] sm:items-center"
                      onClick={() => onViewProject(project)}
                    >
                      <span className="absolute -left-[31px] top-1/2 grid size-3 -translate-y-1/2 place-items-center rounded-full border-2 border-[var(--app-panel)]" style={{ background: projectStatusColor(project.status) }} />
                      <span>
                        <span className="block text-[10px] font-semibold uppercase text-[var(--app-subtle)]">{isDelivered(project) ? "Delivered" : "Expected"}</span>
                        <span className="mt-1 block text-xs font-medium">{formatDate(project.dueDate, { month: "short", day: "numeric" })}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">{project.title}</span>
                        <span className="mt-1 block truncate text-[11px] text-[var(--app-muted)]">{project.client || project.workType} · {project.notes || "No note"}</span>
                      </span>
                      <Badge variant="outline" className={cn("h-5 w-fit rounded px-1.5 text-[10px]", projectStatusTone(project.status))}>{project.status}</Badge>
                      <span className="flex items-center justify-end gap-1 text-[10px] text-[var(--app-muted)]">
                        {isDelivered(project) ? <CheckCircle2 className="size-3.5 text-[var(--app-success)]" /> : <Clock3 className="size-3.5" />}
                        {isDelivered(project) ? "Complete" : daysUntil(project.dueDate) < 0 ? "Overdue" : `${Math.max(0, daysUntil(project.dueDate))}d`}
                      </span>
                    </motion.button>
                  ))}
                  </div>
                </ContentSection>
              </div>
            </motion.section>
          ))}
        </motion.div>
      ) : (
        <ContentSection className="mt-6">
          <PageEmptyState icon={<Milestone className="size-5" />} title="No timeline milestones yet" description="Projects with due dates will appear here." />
        </ContentSection>
      )}
      </PageContent>
    </WorkspacePage>
  );
}
