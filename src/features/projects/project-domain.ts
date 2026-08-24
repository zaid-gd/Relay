import type { Client, ProjectGroup, SavedProjectTemplate, WorkItem } from "@/lib/types";

export type { ProjectGroup } from "@/lib/types";

export type ProjectWithGroup = WorkItem & { projectGroupId?: ProjectGroup["id"] };

export type ProjectGroupSummary = {
  projectCount: number;
  deliveredCount: number;
  progress: number;
  earned: number;
  collected: number;
  outstanding: number;
};

export type NewProjectInput = {
  name: string;
  clientId: Client["id"];
  projectGroupId?: ProjectGroup["id"];
  workflowTemplateId?: SavedProjectTemplate["id"];
  dueDate: string;
  financialType: "client" | "salary-plan";
};

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

function trimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeProjectGroup(
  input: Record<string, unknown>,
  clients: readonly Client[],
): ValidationResult<ProjectGroup> {
  const id = trimmedString(input.id);
  const name = trimmedString(input.name);
  const clientId = trimmedString(input.clientId);
  const teamId = trimmedString(input.teamId);
  const errors: string[] = [];

  if (!id) errors.push("Project Group id is required.");
  if (!name) errors.push("Project Group name is required.");
  if (!clientId) errors.push("Client is required.");
  else if (!clients.some((client) => client.id === clientId)) errors.push("Client does not exist.");
  if (typeof input.archived !== "boolean") errors.push("Archive state is required.");

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      id,
      ...(teamId ? { teamId } : {}),
      name,
      clientId,
      notes: typeof input.notes === "string" ? input.notes : "",
      archived: input.archived === true,
      createdAt: trimmedString(input.createdAt) || new Date().toISOString(),
    },
  };
}

export function normalizeProjectGroups(input: unknown, clients: readonly Client[]): ProjectGroup[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
    const result = normalizeProjectGroup(Object.fromEntries(Object.entries(candidate)), clients);
    return result.ok ? [result.value] : [];
  });
}

export function deriveProjectGroupSummary(
  group: ProjectGroup,
  projects: readonly ProjectWithGroup[],
): ProjectGroupSummary {
  const grouped = projects.filter((project) => project.projectGroupId === group.id);
  const delivered = grouped.filter((project) => project.status === "Delivered");
  const earned = delivered.reduce((total, project) => total + project.earnings, 0);
  const collected = delivered.reduce((total, project) => total + (project.paid ? project.earnings : 0), 0);

  return {
    projectCount: grouped.length,
    deliveredCount: delivered.length,
    progress: grouped.length ? delivered.length / grouped.length : 0,
    earned,
    collected,
    outstanding: earned - collected,
  };
}

const newProjectFields = new Set([
  "name",
  "clientId",
  "projectGroupId",
  "workflowTemplateId",
  "dueDate",
  "financialType",
]);

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateNewProjectInput(
  input: Record<string, unknown>,
  references: {
    clients: readonly Client[];
    projectGroups: readonly ProjectGroup[];
    workflowTemplates: readonly SavedProjectTemplate[];
  },
): ValidationResult<NewProjectInput> {
  const name = trimmedString(input.name);
  const clientId = trimmedString(input.clientId);
  const projectGroupId = trimmedString(input.projectGroupId);
  const workflowTemplateId = trimmedString(input.workflowTemplateId);
  const dueDate = trimmedString(input.dueDate);
  const financialType = input.financialType === "client" || input.financialType === "salary-plan"
    ? input.financialType
    : undefined;
  const errors = Object.keys(input)
    .filter((field) => !newProjectFields.has(field))
    .map((field) => `Unexpected field: ${field}.`);

  if (!name) errors.push("Project name is required.");
  if (!references.clients.some((client) => client.id === clientId && !client.archived)) {
    errors.push("Active Client does not exist.");
  }

  const group = projectGroupId
    ? references.projectGroups.find((projectGroup) => projectGroup.id === projectGroupId && !projectGroup.archived)
    : undefined;
  if (projectGroupId && !group) errors.push("Active Project Group does not exist.");
  else if (group && group.clientId !== clientId) errors.push("Project Group must belong to the selected Client.");

  if (workflowTemplateId && !references.workflowTemplates.some((item) => item.id === workflowTemplateId && !item.archived)) {
    errors.push("Active Workflow Template does not exist.");
  }
  if (!isIsoDate(dueDate)) errors.push("Due date must be a valid ISO date.");
  if (!financialType) {
    errors.push("Financial type must be client or salary-plan.");
  }

  if (errors.length || !financialType) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      clientId,
      ...(projectGroupId ? { projectGroupId } : {}),
      ...(workflowTemplateId ? { workflowTemplateId } : {}),
      dueDate,
      financialType,
    },
  };
}
