"use client";

import { CalendarDays, Download, ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { CalendarEventKind, WorkspaceOutput } from "@/features/workspace-discovery/workspace-discovery";
import { calendarFeedIcs, deriveCalendarEvents } from "@/features/workspace-discovery/workspace-discovery";
import type { WorkItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContent, PageHeader } from "@/components/workspace-page";

const eventFilters: Array<{ value: CalendarEventKind | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "project", label: "Projects" },
  { value: "output", label: "Outputs" },
  { value: "review", label: "Reviews" },
  { value: "payment", label: "Payments" },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function readableDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function downloadCalendar(events: ReturnType<typeof deriveCalendarEvents>, calendarName: string) {
  const blob = new Blob([calendarFeedIcs(events, { calendarName })], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${calendarName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "relay-calendar"}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

export type PrecisionCalendarDiscoveryProps = {
  projects: readonly WorkItem[];
  outputs?: readonly WorkspaceOutput[];
  salaryWorkType?: string;
  calendarName?: string;
  onViewProject?: (projectId: string) => void;
};

/** Read-only calendar panel for local, sample, and reactive cloud data. */
export function PrecisionCalendarDiscovery({
  projects,
  outputs = [],
  salaryWorkType,
  calendarName = "Relay Workspace",
  onViewProject,
}: PrecisionCalendarDiscoveryProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CalendarEventKind | "all">("all");
  const events = useMemo(
    () => deriveCalendarEvents(projects, outputs, { salaryWorkType }),
    [outputs, projects, salaryWorkType],
  );
  const visibleEvents = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return events.filter((event) => {
      if (filter !== "all" && event.kind !== filter) return false;
      return !needle || `${event.title} ${event.projectTitle} ${event.detail ?? ""}`.toLocaleLowerCase().includes(needle);
    });
  }, [events, filter, query]);

  return (
    <PageContent className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Planning"
        title="Calendar"
        description="Read-only commitments from Projects, Project Outputs, reviews, and client payments. Edit dates in the owning Project."
        actions={(
          <Button type="button" variant="outline" onClick={() => downloadCalendar(events, calendarName)} disabled={!events.length}>
            <Download className="size-4" aria-hidden="true" />
            Download .ics
          </Button>
        )}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commitments" aria-label="Search calendar commitments" className="pl-9" />
        </label>
        <p className="shrink-0 text-xs text-muted-foreground" aria-live="polite">{visibleEvents.length} {visibleEvents.length === 1 ? "event" : "events"}</p>
      </div>

      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Calendar event type">
        {eventFilters.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            onClick={() => setFilter(item.value)}
            className={`min-h-9 rounded-md px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${filter === item.value ? "bg-[var(--app-active)] font-semibold text-[var(--app-ink)]" : "text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-ink)]"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visibleEvents.length ? (
        <div className="divide-y rounded-md border" role="list" aria-label="Read-only calendar events">
          {visibleEvents.map((event) => (
            <div key={event.id} role="listitem" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{readableDate(event.date)} · {event.detail ?? event.kind}</p>
                  <p className="truncate text-xs text-muted-foreground">{event.projectTitle}</p>
                </div>
              </div>
              {onViewProject ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => onViewProject(event.projectId)}>
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  Open Project
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="border-y py-12 text-center">
          <p className="text-sm font-medium">No matching commitments</p>
          <p className="mt-1 text-xs text-muted-foreground">Project dates and payment events will appear here when available.</p>
        </div>
      )}
    </PageContent>
  );
}

