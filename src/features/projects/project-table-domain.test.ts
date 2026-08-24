import { describe, expect, it } from "vitest";
import type { Client, WorkItem } from "@/lib/types";
import {
  DEFAULT_PROJECT_TABLE_STATE,
  filterProjectTableProjects,
  getProjectPaymentState,
  getProjectTableDeletionWarning,
  parseProjectTableSearch,
  projectBelongsToDefaultEditorScope,
  serializeProjectTableSearch,
  shouldShowProjectAssignees,
  sortProjectTableProjects,
  type ProjectTableRules,
  type ProjectTableState,
} from "./project-table-domain";

const clients: Client[] = [
  { id: "client-a", name: "A", company: "", contactName: "", email: "", phone: "", notes: "", archived: false },
  { id: "client-b", name: "B", company: "", contactName: "", email: "", phone: "", notes: "", archived: false },
];

const rules: ProjectTableRules = {
  isBillableProject: (project) => project.status === "Delivered" && project.earnings > 0 && project.workType === "Freelance",
  isSalaryProject: (project) => project.workType === "Job / Salary",
};

function project(overrides: Partial<WorkItem>): WorkItem {
  const base: WorkItem = {
    id: "project",
    profileId: "profile",
    title: "Project",
    clientId: "client-a",
    status: "Planned",
    workType: "Freelance",
    startDate: "2026-08-01",
    dueDate: "2026-08-31",
    earnings: 0,
    notes: "",
  };
  return { ...base, ...overrides };
}

describe("Project table URL state", () => {
  it("parses useful filters, sorting, and view state while ignoring invalid values", () => {
    expect(parseProjectTableSearch("?q=launch&client=client-a&stage=Review&payment=unpaid&salary=client&assignee=editor-1&view=board&sort=due&dir=desc&archive=all")).toEqual({
      query: "launch",
      clientId: "client-a",
      stage: "Review",
      payment: "unpaid",
      salary: "client",
      assigneeUserId: "editor-1",
      view: "board",
      sort: "due",
      direction: "desc",
      archive: "all",
    });
    expect(parseProjectTableSearch("?stage=invalid&view=invalid&sort=invalid&dir=sideways&archive=invalid")).toEqual(DEFAULT_PROJECT_TABLE_STATE);
  });

  it("serializes non-default state in a stable, shareable order", () => {
    const state: ProjectTableState = {
      ...DEFAULT_PROJECT_TABLE_STATE,
      query: "launch film",
      stage: "Delivered",
      view: "board",
      sort: "name",
      direction: "desc",
    };
    expect(serializeProjectTableSearch(state)).toBe("q=launch+film&stage=Delivered&view=board&sort=name&dir=desc");
    expect(serializeProjectTableSearch(DEFAULT_PROJECT_TABLE_STATE)).toBe("");
  });
});

describe("Project table selection", () => {
  const projects = [
    project({ id: "launch", title: "Launch Film", clientId: "client-a", status: "Review", dueDate: "2026-08-20", workType: "Freelance", earnings: 400 }),
    project({ id: "salary", title: "Salary Edit", clientId: "client-b", status: "In Progress", dueDate: "2026-08-10", workType: "Job / Salary", teamId: "team-a", ownerUserId: "owner", assigneeUserIds: ["editor-1"] }),
    project({ id: "paid", title: "Paid Film", clientId: "client-a", status: "Delivered", dueDate: "2026-08-30", workType: "Freelance", earnings: 200, paid: true }),
    project({ id: "archived", title: "Old Film", archived: true }),
  ];

  it("filters by query, Client, stage, payment, salary marker, archive state, and assignee", () => {
    const state: ProjectTableState = {
      ...DEFAULT_PROJECT_TABLE_STATE,
      query: "salary",
      clientId: "client-b",
      stage: "In Progress",
      salary: "salary",
      assigneeUserId: "editor-1",
    };
    expect(filterProjectTableProjects(projects, state, { clients, ...rules, scope: { kind: "team", currentUserId: "editor-1", role: "Editor", allowAllTeamProjects: false } }).map((item) => item.id)).toEqual(["salary"]);
    expect(filterProjectTableProjects(projects, { ...DEFAULT_PROJECT_TABLE_STATE, archive: "archived" }, { clients, ...rules, scope: { kind: "team", currentUserId: "editor-1", role: "Editor", allowAllTeamProjects: false } }).map((item) => item.id)).toEqual(["archived"]);
  });

  it("sorts by due date and keeps ties deterministic", () => {
    const result = sortProjectTableProjects(projects.slice(0, 3), { ...DEFAULT_PROJECT_TABLE_STATE, sort: "due", direction: "asc" }, { clients, ...rules });
    expect(result.map((item) => item.id)).toEqual(["salary", "launch", "paid"]);
  });

  it("applies the Editor assigned-project default while Owners see all team projects", () => {
    expect(projectBelongsToDefaultEditorScope(projects[1], { kind: "team", currentUserId: "editor-1", role: "Editor", allowAllTeamProjects: false })).toBe(true);
    expect(projectBelongsToDefaultEditorScope(projects[1], { kind: "team", currentUserId: "editor-2", role: "Editor", allowAllTeamProjects: false })).toBe(false);
    expect(projectBelongsToDefaultEditorScope(projects[1], { kind: "team", currentUserId: "owner", role: "Owner", allowAllTeamProjects: false })).toBe(true);
    expect(projectBelongsToDefaultEditorScope(projects[1], { kind: "team", currentUserId: "editor-2", role: "Editor", allowAllTeamProjects: true })).toBe(true);
  });
});

describe("Project table presentation rules", () => {
  it("shows assignees only when the workspace has multiple active members", () => {
    expect(shouldShowProjectAssignees({ isTeamWorkspace: false, activeMemberCount: 4 })).toBe(false);
    expect(shouldShowProjectAssignees({ isTeamWorkspace: true, activeMemberCount: 1 })).toBe(false);
    expect(shouldShowProjectAssignees({ isTeamWorkspace: true, activeMemberCount: 2 })).toBe(true);
  });

  it("derives payment state from the shared billable rule", () => {
    expect(getProjectPaymentState(project({ status: "Delivered", earnings: 200, paid: true, workType: "Freelance" }), rules)).toBe("paid");
    expect(getProjectPaymentState(project({ status: "Delivered", earnings: 200, paid: false, workType: "Freelance" }), rules)).toBe("unpaid");
    expect(getProjectPaymentState(project({ status: "Delivered", earnings: 0, workType: "Freelance" }), rules)).toBe("not-billable");
  });

  it("explains the effects of permanent deletion", () => {
    expect(getProjectTableDeletionWarning("Launch Film")).toBe("Permanently deleting Launch Film removes its files, versions, client portal, and Activity history. This cannot be undone.");
  });
});
