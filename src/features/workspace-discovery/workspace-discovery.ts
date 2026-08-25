import type { Client, ProjectGroup, WorkItem } from "@/lib/types";

export type WorkspaceOutput = {
  id: string;
  projectId: string;
  title: string;
  dueDate?: string;
  reviewState?: string;
  archived?: boolean;
  updatedAt?: string;
};

export type WorkspaceFile = {
  id: string;
  projectId: string;
  projectOutputId?: string;
  title: string;
  fileName?: string;
  category: string;
  status?: string;
  updatedAt: string;
  archived?: boolean;
  url?: string;
};

export type CalendarEventKind = "project" | "output" | "review" | "payment";

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  date: string;
  title: string;
  projectId: string;
  projectTitle: string;
  detail?: string;
  readOnly: true;
};

export type SearchRecordKind = "client" | "project" | "group" | "output" | "file" | "action";

export type SearchRecord = {
  id: string;
  kind: SearchRecordKind;
  title: string;
  detail: string;
  href?: string;
  keywords?: string;
  archived?: boolean;
};

export type WorkspaceDiscoveryInput = {
  clients?: readonly Client[];
  groups?: readonly ProjectGroup[];
  projects?: readonly WorkItem[];
  outputs?: readonly WorkspaceOutput[];
  files?: readonly WorkspaceFile[];
};

export type CalendarEventOptions = {
  salaryWorkType?: string;
};

const DAY = 24 * 60 * 60 * 1000;

function validDate(value: string | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? value.slice(0, 10) : undefined;
}

function normalized(value: string | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function addEvent(
  events: CalendarEvent[],
  event: Omit<CalendarEvent, "readOnly">,
) {
  const date = validDate(event.date);
  if (!date) return;
  events.push({ ...event, date, readOnly: true });
}

/** Derive display-only commitments. No event returned here can be written back. */
export function deriveCalendarEvents(
  projects: readonly WorkItem[],
  outputs: readonly WorkspaceOutput[] = [],
  options: CalendarEventOptions = {},
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const activeProjects = projects.filter((project) => !project.archived);
  const projectById = new Map(activeProjects.map((project) => [project.id, project]));

  for (const project of activeProjects) {
    addEvent(events, {
      id: `project:${project.id}:due`,
      kind: "project",
      date: project.dueDate,
      title: project.title,
      projectId: project.id,
      projectTitle: project.title,
      detail: `Project due · ${project.client || "No client"}`,
    });
    const isClientPayment = project.status === "Delivered" && project.earnings > 0 && !project.salaryPlanId && project.workType !== (options.salaryWorkType ?? "Job / Salary");
    if (isClientPayment) {
      addEvent(events, {
        id: `project:${project.id}:payment`,
        kind: "payment",
        date: project.paidDate || project.dueDate,
        title: project.paid ? `${project.title} paid` : `${project.title} payment due`,
        projectId: project.id,
        projectTitle: project.title,
        detail: project.paid ? "Payment received" : "Payment outstanding",
      });
    }
  }

  for (const output of outputs) {
    const project = projectById.get(output.projectId);
    if (!project || output.archived) continue;
    addEvent(events, {
      id: `output:${output.id}:due`,
      kind: "output",
      date: output.dueDate || project.dueDate,
      title: output.title,
      projectId: project.id,
      projectTitle: project.title,
      detail: "Project Output due",
    });
    const reviewDate = ["sent_to_client", "changes_requested", "approved", "final_delivered"].includes(output.reviewState ?? "")
      ? output.updatedAt
      : undefined;
    addEvent(events, {
      id: `output:${output.id}:review`,
      kind: "review",
      date: reviewDate ?? "",
      title: output.title,
      projectId: project.id,
      projectTitle: project.title,
      detail: output.reviewState === "changes_requested" ? "Changes requested" : "Review activity",
    });
  }

  return events.sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title));
}

export type CalendarFeedOptions = {
  calendarName?: string;
  productName?: string;
};

function icsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/[;,\n]/g, (character) => character === "\n" ? "\\n" : `\\${character}`);
}

function icsDate(date: string) {
  return date.replaceAll("-", "");
}

/** Create an importable, read-only iCalendar snapshot. */
export function calendarFeedIcs(events: readonly CalendarEvent[], options: CalendarFeedOptions = {}) {
  const productName = options.productName ?? "Relay";
  const calendarName = options.calendarName ?? "Relay Workspace";
  const body = events.map((event) => {
    const end = new Date(`${event.date}T00:00:00Z`).getTime() + DAY;
    const endDate = new Date(end).toISOString().slice(0, 10);
    return [
      "BEGIN:VEVENT",
      `UID:${icsText(event.id)}@relay`,
      `DTSTAMP:${icsDate(new Date().toISOString().slice(0, 10))}T000000Z`,
      `DTSTART;VALUE=DATE:${icsDate(event.date)}`,
      `DTEND;VALUE=DATE:${icsDate(endDate)}`,
      `SUMMARY:${icsText(event.title)}`,
      `DESCRIPTION:${icsText(event.detail ?? event.kind)}`,
      `CATEGORIES:${icsText(event.kind)}`,
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ].join("\r\n");
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Relay//Workspace Calendar//EN",
    `X-WR-CALNAME:${icsText(calendarName)}`,
    `X-WR-CALDESC:${icsText(`${productName} read-only workspace feed`)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...body,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function recordSearchText(record: SearchRecord) {
  return normalized(`${record.title} ${record.detail} ${record.keywords}`);
}

/** Build the allowed active-record search index. Archived records stay opt-in. */
export function buildWorkspaceSearchIndex(input: WorkspaceDiscoveryInput, includeArchived = false): SearchRecord[] {
  const records: SearchRecord[] = [];
  for (const client of input.clients ?? []) {
    if (client.archived && !includeArchived) continue;
    records.push({ id: client.id, kind: "client", title: client.name, detail: client.company || "Client", href: `/clients?client=${encodeURIComponent(client.id)}`, keywords: `${client.email} ${client.contactName}`, archived: client.archived });
  }
  for (const group of input.groups ?? []) {
    if (group.archived && !includeArchived) continue;
    records.push({ id: group.id, kind: "group", title: group.name, detail: "Project Group", href: `/projects?group=${encodeURIComponent(group.id)}`, keywords: group.notes, archived: group.archived });
  }
  for (const project of input.projects ?? []) {
    if (project.archived && !includeArchived) continue;
    records.push({ id: project.id, kind: "project", title: project.title, detail: `${project.client || "No client"} · ${project.status}`, href: `/projects/${encodeURIComponent(project.id)}`, keywords: `${project.notes} ${project.workType}`, archived: project.archived });
  }
  for (const output of input.outputs ?? []) {
    if (output.archived && !includeArchived) continue;
    records.push({ id: output.id, kind: "output", title: output.title, detail: "Project Output", href: `/projects/${encodeURIComponent(output.projectId)}?view=outputs`, keywords: output.reviewState, archived: output.archived });
  }
  for (const file of input.files ?? []) {
    if (file.archived && !includeArchived) continue;
    records.push({ id: file.id, kind: "file", title: file.title, detail: `${file.category} · ${file.fileName ?? "file"}`, href: `/projects/${encodeURIComponent(file.projectId)}?view=files`, keywords: `${file.status} ${file.fileName}`, archived: file.archived });
  }
  records.push(
    { id: "action:new-project", kind: "action", title: "Create new project", detail: "Action", href: "/projects?new=1", keywords: "add project" },
    { id: "action:calendar", kind: "action", title: "Open calendar", detail: "Action", href: "/calendar", keywords: "schedule planning" },
    { id: "action:files", kind: "action", title: "Open files", detail: "Action", href: "/files", keywords: "workspace files material" },
  );
  return records;
}

export function filterWorkspaceSearch(records: readonly SearchRecord[], query: string, limit = 30) {
  const needle = normalized(query);
  if (!needle) return records.slice(0, limit);
  return records.filter((record) => recordSearchText(record).includes(needle)).slice(0, limit);
}

export function filterWorkspaceFiles(files: readonly WorkspaceFile[], query: string) {
  const needle = normalized(query);
  if (!needle) return files.filter((file) => !file.archived);
  return files.filter((file) => !file.archived && normalized(`${file.title} ${file.fileName} ${file.category} ${file.status}`).includes(needle));
}
