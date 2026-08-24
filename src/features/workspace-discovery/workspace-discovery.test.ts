import { describe, expect, it } from "vitest";
import {
  buildWorkspaceSearchIndex,
  calendarFeedIcs,
  deriveCalendarEvents,
  filterWorkspaceFiles,
  filterWorkspaceSearch,
} from "./workspace-discovery";

const project = {
  id: "project-1",
  profileId: "video-editing",
  title: "Launch film",
  client: "Acme",
  status: "Delivered" as const,
  workType: "Freelance",
  startDate: "2026-08-01",
  dueDate: "2026-08-12",
  earnings: 1200,
  paid: false,
  notes: "Final launch cut",
};

describe("workspace discovery", () => {
  it("derives read-only project, output, review, and payment events", () => {
    const events = deriveCalendarEvents([project], [{
      id: "output-1",
      projectId: "project-1",
      title: "Main cut",
      dueDate: "2026-08-10",
      reviewState: "sent_to_client",
      updatedAt: "2026-08-08T10:00:00.000Z",
    }]);

    expect(events.map(({ kind }) => kind)).toEqual(["review", "output", "project", "payment"]);
    expect(events.every(({ readOnly }) => readOnly)).toBe(true);
  });

  it("publishes an importable calendar snapshot without write semantics", () => {
    const ics = calendarFeedIcs(deriveCalendarEvents([project]));
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("METHOD:PUBLISH");
    expect(ics).toContain("TRANSP:TRANSPARENT");
    expect(ics).toContain("Launch film payment due");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("keeps archived records out of the default search index", () => {
    const records = buildWorkspaceSearchIndex({
      clients: [{ id: "active", name: "Acme", company: "Studio", contactName: "", email: "", phone: "", notes: "", archived: false }, { id: "old", name: "Old", company: "", contactName: "", email: "", phone: "", notes: "", archived: true }],
      projects: [project],
    });
    expect(filterWorkspaceSearch(records, "old")).toEqual([]);
    expect(filterWorkspaceSearch(records, "launch").map(({ id }) => id)).toEqual(["project-1"]);
    expect(buildWorkspaceSearchIndex({ clients: [{ id: "old", name: "Old", company: "", contactName: "", email: "", phone: "", notes: "", archived: true }] }, true).some(({ id }) => id === "old")).toBe(true);
  });

  it("searches files without changing their owner or write controls", () => {
    const files = [
      { id: "file-1", projectId: "project-1", title: "Launch brief", category: "Reference", updatedAt: "2026-08-01" },
      { id: "file-2", projectId: "project-1", title: "Old export", category: "Deliverable", updatedAt: "2026-08-01", archived: true },
    ];
    expect(filterWorkspaceFiles(files, "brief").map(({ id }) => id)).toEqual(["file-1"]);
    expect(filterWorkspaceFiles(files, "").map(({ id }) => id)).toEqual(["file-1"]);
  });
});

