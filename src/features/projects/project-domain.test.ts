import { describe, expect, it } from "vitest";
import type { Client, SalaryPlan, SavedProjectTemplate, WorkItem, WorkflowStage } from "@/lib/types";
import {
  deriveProjectGroupSummary,
  getProjectDeliveryConfirmation,
  getProjectStageMenuChoices,
  groupProjectsByStage,
  moveProjectToStage,
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
  workflowStages: [
    { id: "planned", label: "Planned", purpose: "planned" },
    { id: "delivered", label: "Delivered", purpose: "delivered" },
  ],
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
  const salaryPlan: SalaryPlan = {
    id: "plan-a",
    clientId: "client-a",
    requiredProjectCount: 5,
    amount: 1000,
    startDate: "2026-08-24",
    notes: "",
    archived: false,
  };

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

  it("requires an active Salary Plan and keeps it tied to its Client", () => {
    const references = { clients, projectGroups: groups, workflowTemplates: [template], salaryPlans: [salaryPlan] };
    expect(validateNewProjectInput({ name: "Salary edit", clientId: "client-a", dueDate: "2026-09-01", financialType: "salary-plan" }, references)).toMatchObject({ ok: false, errors: ["Salary Plan is required."] });
    expect(validateNewProjectInput({ name: "Salary edit", clientId: "client-b", dueDate: "2026-09-01", financialType: "salary-plan", salaryPlanId: "plan-a" }, references)).toMatchObject({ ok: false, errors: ["Salary Plan Client must match the selected Client."] });
    expect(validateNewProjectInput({ name: "Salary edit", clientId: "client-a", dueDate: "2026-09-01", financialType: "salary-plan", salaryPlanId: "plan-a" }, references)).toEqual({ ok: true, value: { name: "Salary edit", clientId: "client-a", dueDate: "2026-09-01", financialType: "salary-plan", salaryPlanId: "plan-a" } });
  });
});

describe("Project delivery", () => {
  it("records the delivery time, then clears current delivery state when reopened", () => {
    const source = project({ status: "In Progress" });
    const delivered = projectStatusUpdate(source, "Delivered", "2026-08-24T12:00:00.000Z");
    expect(delivered).toEqual({ status: "Delivered", completedAt: "2026-08-24T12:00:00.000Z" });
    expect(projectStatusUpdate({ ...source, ...delivered }, "Revision", "2026-08-25T12:00:00.000Z")).toEqual({ status: "Revision", completedAt: undefined });
    expect(moveProjectToStage({ ...source, ...delivered }, "Revision", "2026-08-25T12:00:00.000Z")).toMatchObject({ status: "Revision", completedAt: undefined });
  });

  it("does not replace an existing delivery time on a repeated Delivered update", () => {
    expect(projectStatusUpdate(project({ status: "Delivered", completedAt: "2026-08-24T12:00:00.000Z" }), "Delivered", "2026-08-25T12:00:00.000Z")).toEqual({ status: "Delivered", completedAt: "2026-08-24T12:00:00.000Z" });
  });

  it("requires confirmation and exposes the delivery effect before first delivery", () => {
    expect(getProjectDeliveryConfirmation(project({ id: "launch", title: "Launch Film", status: "Review" }), "Delivered", { kind: "earnings", amount: 400 })).toEqual({
      required: true,
      title: "Mark Launch Film as Delivered?",
      detail: "Relay will record the delivery time.",
      effect: { kind: "earnings", amount: 400 },
    });
    expect(getProjectDeliveryConfirmation(project({ status: "Delivered" }), "Delivered")).toEqual({ required: false });
  });
});

describe("Project workflow board", () => {
  it("groups projects in copied stage order and keeps empty stages", () => {
    const projects = [
      project({ id: "one", status: "Review", workflowStages: [
        { id: "planned", label: "Planned", purpose: "planned" },
        { id: "review", label: "Review", purpose: "client_review" },
        { id: "delivered", label: "Delivered", purpose: "delivered" },
      ] }),
      project({ id: "two", status: "Delivered", workflowStages: [
        { id: "planned", label: "Planned", purpose: "planned" },
        { id: "review", label: "Review", purpose: "client_review" },
        { id: "delivered", label: "Delivered", purpose: "delivered" },
      ] }),
    ];
    const stages: WorkflowStage[] = [
      { id: "planned", label: "Planned", purpose: "planned" },
      { id: "review", label: "Review", purpose: "client_review" },
      { id: "delivered", label: "Delivered", purpose: "delivered" },
    ];
    expect(groupProjectsByStage(projects, stages).map(({ stage, projects: items }) => [stage.id, items.map(({ id }) => id)])).toEqual([
      ["planned", []],
      ["review", ["one"]],
      ["delivered", ["two"]],
    ]);
  });

  it("offers an accessible normal move menu with the current stage disabled", () => {
    expect(getProjectStageMenuChoices({ title: "Launch Film", status: "Review" }, [
      { id: "planned", label: "Planned", purpose: "planned" },
      { id: "review", label: "Review", purpose: "client_review" },
      { id: "delivered", label: "Delivered", purpose: "delivered" },
    ])).toEqual([
      { stage: { id: "planned", label: "Planned", purpose: "planned" }, label: "Planned", current: false, disabled: false, ariaLabel: "Move Launch Film to Planned" },
      { stage: { id: "review", label: "Review", purpose: "client_review" }, label: "Review", current: true, disabled: true, ariaLabel: "Launch Film, current stage Review" },
      { stage: { id: "delivered", label: "Delivered", purpose: "delivered" }, label: "Delivered", current: false, disabled: false, ariaLabel: "Move Launch Film to Delivered" },
    ]);
  });
});
