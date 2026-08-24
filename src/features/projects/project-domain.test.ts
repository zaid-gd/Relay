import { describe, expect, it } from "vitest";
import type { Client, SavedProjectTemplate, WorkItem } from "@/lib/types";
import {
  deriveProjectGroupSummary,
  normalizeProjectGroup,
  normalizeProjectGroups,
  projectStatusUpdate,
  validateNewProjectInput,
  type ProjectGroup,
} from "./project-domain";

const clients: Client[] = [
  { id: "client-a", name: "A", company: "", contactName: "", email: "", phone: "", notes: "", archived: false },
  { id: "client-b", name: "B", company: "", contactName: "", email: "", phone: "", notes: "", archived: false },
];

const template: SavedProjectTemplate = {
  id: "template-a",
  name: "Standard",
  description: "",
  projectType: "video",
  workType: "freelance",
  durationDays: 7,
  workflowStages: ["Planned", "Delivered"],
  deliverables: [],
  checklistItems: [],
};

function project(overrides: Partial<WorkItem>): WorkItem {
  const base: WorkItem = {
    id: "project",
    profileId: "profile",
    title: "Project",
    clientId: "client-a",
    status: "Planned",
    workType: "freelance",
    startDate: "2026-08-01",
    dueDate: "2026-08-31",
    earnings: 0,
    notes: "",
  };
  return { ...base, ...overrides };
}

describe("Project Group domain", () => {
  it("normalizes a valid group and rejects a missing Client", () => {
    const result = normalizeProjectGroup({ id: " group-a ", name: " Campaign ", clientId: " client-a ", archived: false, createdAt: "2026-08-24T00:00:00.000Z" }, clients);
    expect(result).toEqual({
      ok: true,
      value: { id: "group-a", name: "Campaign", clientId: "client-a", notes: "", archived: false, createdAt: "2026-08-24T00:00:00.000Z" },
    });
    expect(normalizeProjectGroup({ id: "group-b", name: "Run", clientId: "missing", archived: false }, clients)).toEqual({
      ok: false,
      errors: ["Client does not exist."],
    });
  });

  it("drops invalid stored Project Groups at the persistence boundary", () => {
    expect(normalizeProjectGroups([
      { id: "group-a", name: "Campaign", clientId: "client-a", archived: false, createdAt: "2026-08-24T00:00:00.000Z" },
      { id: "group-b", name: "Missing", clientId: "missing", archived: false },
    ], clients)).toHaveLength(1);
  });

  it("derives progress and delivered money from the group's Projects", () => {
    const group: ProjectGroup = { id: "group-a", name: "Campaign", clientId: "client-a", notes: "", archived: false, createdAt: "2026-08-24T00:00:00.000Z" };
    const projects = [
      project({ id: "paid", projectGroupId: "group-a", status: "Delivered", earnings: 400, paid: true }),
      project({ id: "unpaid", projectGroupId: "group-a", status: "Delivered", earnings: 250, paid: false }),
      project({ id: "active", projectGroupId: "group-a", status: "In Progress", earnings: 900 }),
      project({ id: "other", projectGroupId: "group-b", status: "Delivered", earnings: 999, paid: true }),
    ];

    expect(deriveProjectGroupSummary(group, projects)).toEqual({
      projectCount: 3,
      deliveredCount: 2,
      progress: 2 / 3,
      earned: 650,
      collected: 400,
      outstanding: 250,
    });
  });
});

describe("new Project input", () => {
  const groups: ProjectGroup[] = [
    { id: "group-a", name: "Campaign", clientId: "client-a", notes: "", archived: false, createdAt: "2026-08-24T00:00:00.000Z" },
    { id: "group-b", name: "Other", clientId: "client-b", notes: "", archived: false, createdAt: "2026-08-24T00:00:00.000Z" },
  ];

  it("accepts and normalizes the short form", () => {
    expect(validateNewProjectInput({
      name: " Launch film ",
      clientId: " client-a ",
      projectGroupId: " group-a ",
      workflowTemplateId: " template-a ",
      dueDate: "2026-09-01",
      financialType: "client",
    }, { clients, projectGroups: groups, workflowTemplates: [template] })).toEqual({
      ok: true,
      value: {
        name: "Launch film",
        clientId: "client-a",
        projectGroupId: "group-a",
        workflowTemplateId: "template-a",
        dueDate: "2026-09-01",
        financialType: "client",
      },
    });
  });

  it("rejects extra fields and a Project Group owned by another Client", () => {
    expect(validateNewProjectInput({
      name: "Launch film",
      clientId: "client-a",
      projectGroupId: "group-b",
      dueDate: "2026-09-01",
      financialType: "client",
      notes: "not part of the short form",
    }, { clients, projectGroups: groups, workflowTemplates: [template] })).toEqual({
      ok: false,
      errors: ["Unexpected field: notes.", "Project Group must belong to the selected Client."],
    });
  });
});

describe("Project delivery", () => {
  it("records the first delivery time and keeps it across later status changes", () => {
    const source = project({ status: "In Progress" });
    const delivered = projectStatusUpdate(source, "Delivered", "2026-08-24T12:00:00.000Z");
    expect(delivered).toEqual({ status: "Delivered", completedAt: "2026-08-24T12:00:00.000Z" });
    expect(projectStatusUpdate({ ...source, ...delivered }, "Revision", "2026-08-25T12:00:00.000Z")).toEqual({ status: "Revision", completedAt: delivered.completedAt });
  });
});
