import type {
  Client,
  ProjectGroup,
  SalaryPlan,
  SavedProjectTemplate,
  WorkItem,
  WorkflowStage,
} from "@/lib/types";
import type { StoredProjectStatus } from "@/lib/domain-values";
import {
  DEFAULT_WORKFLOW_STAGES,
  normalizeWorkflowStages,
} from "@/lib/workflow-templates";
import { z } from "zod";

export type { ProjectGroup } from "@/lib/types";

export type ProjectGroupSummary = {
  projectCount: number;
  deliveredCount: number;
  progress: number;
  earned: number;
  collected: number;
  outstanding: number;
};

export const newProjectFormSchema = z.strictObject({
  name: z.string().trim().min(1, "Project name is required."),
  clientId: z.string().min(1, "Client is required."),
  projectGroupId: z.string().optional(),
  workflowTemplateId: z.string().optional(),
  dueDate: z.iso.date("Choose a valid due date."),
  financialType: z.enum(["client", "salary-plan"]),
  salaryPlanId: z.string().optional(),
});

export type NewProjectInput = z.infer<typeof newProjectFormSchema>;
export type NewProjectFormValues = z.input<typeof newProjectFormSchema>;

type ValidationResult<T> =
  { ok: true; value: T } | { ok: false; errors: string[] };

function trimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeProjectGroup(
  input: Record<string, unknown>,
  clients: readonly Client[]
): ValidationResult<ProjectGroup> {
  const id = trimmedString(input.id);
  const name = trimmedString(input.name);
  const clientId = trimmedString(input.clientId);
  const teamId = trimmedString(input.teamId);
  const errors: string[] = [];

  if (!id) errors.push("Project Group id is required.");
  if (!name) errors.push("Project Group name is required.");
  if (!clientId) errors.push("Client is required.");
  else if (!clients.some((client) => client.id === clientId))
    errors.push("Client does not exist.");
  if (typeof input.archived !== "boolean")
    errors.push("Archive state is required.");

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

export function normalizeProjectGroups(
  input: unknown,
  clients: readonly Client[]
): ProjectGroup[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      return [];
    const result = normalizeProjectGroup(
      Object.fromEntries(Object.entries(candidate)),
      clients
    );
    return result.ok ? [result.value] : [];
  });
}

export function deriveProjectGroupSummary(
  group: ProjectGroup,
  projects: readonly WorkItem[]
): ProjectGroupSummary {
  const grouped = projects.filter(
    (project) => project.projectGroupId === group.id
  );
  const delivered = grouped.filter((project) => project.status === "Delivered");
  const earned = delivered.reduce(
    (total, project) => total + project.earnings,
    0
  );
  const collected = delivered.reduce(
    (total, project) => total + (project.paid ? project.earnings : 0),
    0
  );

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
  "salaryPlanId",
]);

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function validateNewProjectInput(
  input: Record<string, unknown>,
  references: {
    clients: readonly Client[];
    projectGroups: readonly ProjectGroup[];
    workflowTemplates: readonly SavedProjectTemplate[];
    salaryPlans?: readonly SalaryPlan[];
  }
): ValidationResult<NewProjectInput> {
  const name = trimmedString(input.name);
  const clientId = trimmedString(input.clientId);
  const projectGroupId = trimmedString(input.projectGroupId);
  const workflowTemplateId = trimmedString(input.workflowTemplateId);
  const dueDate = trimmedString(input.dueDate);
  const financialType =
    input.financialType === "client" || input.financialType === "salary-plan"
      ? input.financialType
      : undefined;
  const salaryPlanId = trimmedString(input.salaryPlanId);
  const errors = Object.keys(input)
    .filter((field) => !newProjectFields.has(field))
    .map((field) => `Unexpected field: ${field}.`);

  if (!name) errors.push("Project name is required.");
  if (
    !references.clients.some(
      (client) => client.id === clientId && !client.archived
    )
  ) {
    errors.push("Active Client does not exist.");
  }

  const group = projectGroupId
    ? references.projectGroups.find(
        (projectGroup) =>
          projectGroup.id === projectGroupId && !projectGroup.archived
      )
    : undefined;
  if (projectGroupId && !group)
    errors.push("Active Project Group does not exist.");
  else if (group && group.clientId !== clientId)
    errors.push("Project Group must belong to the selected Client.");

  if (
    workflowTemplateId &&
    !references.workflowTemplates.some(
      (item) => item.id === workflowTemplateId && !item.archived
    )
  ) {
    errors.push("Active Workflow Template does not exist.");
  }
  if (!isIsoDate(dueDate)) errors.push("Due date must be a valid ISO date.");
  if (!financialType) {
    errors.push("Financial type must be client or salary-plan.");
  }
  const salaryPlan = salaryPlanId
    ? references.salaryPlans?.find(
        (plan) => plan.id === salaryPlanId && !plan.archived
      )
    : undefined;
  const hasSalaryPlanCatalog = Boolean(references.salaryPlans?.length);
  if (salaryPlanId && hasSalaryPlanCatalog && !salaryPlan)
    errors.push("Active Salary Plan does not exist.");
  if (salaryPlan && salaryPlan.clientId !== clientId)
    errors.push("Salary Plan Client must match the selected Client.");
  if (hasSalaryPlanCatalog && financialType === "salary-plan" && !salaryPlanId)
    errors.push("Salary Plan is required.");
  if (financialType === "client" && salaryPlanId)
    errors.push("Salary Plan is only valid for Salary Projects.");

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
      ...(salaryPlanId ? { salaryPlanId } : {}),
    },
  };
}

export function projectStatusUpdate(
  project: WorkItem,
  status: StoredProjectStatus,
  changedAt: string
): Pick<WorkItem, "status" | "completedAt"> {
  return {
    status,
    completedAt:
      status === "Delivered"
        ? project.status === "Delivered"
          ? (project.completedAt ?? changedAt)
          : changedAt
        : undefined,
  };
}

export type ProjectStageGroup = {
  stage: WorkflowStage;
  projects: WorkItem[];
};

function stageMatches(stage: WorkflowStage, requested: string | WorkflowStage) {
  return typeof requested === "string"
    ? stage.id === requested || stage.label === requested
    : stage.id === requested.id;
}

export function getProjectWorkflowStages(
  project: Pick<WorkItem, "workflowStages">
): WorkflowStage[] {
  const stages = normalizeWorkflowStages(project.workflowStages);
  return stages.length
    ? stages
    : DEFAULT_WORKFLOW_STAGES.map((stage) => ({ ...stage }));
}

export function getProjectWorkflowStage(
  project: Pick<
    WorkItem,
    "workflowStageId" | "workflowStage" | "workflowStages" | "status"
  >
): WorkflowStage {
  const stages = getProjectWorkflowStages(project);
  const currentStage = project.workflowStageId ?? project.workflowStage;
  const current = currentStage
    ? stages.find((stage) => stageMatches(stage, currentStage))
    : undefined;
  if (current) return current;
  if (project.status === "Delivered")
    return (
      stages.find((stage) => stage.purpose === "delivered") ??
      stages.at(-1) ??
      DEFAULT_WORKFLOW_STAGES.at(-1)!
    );
  if (project.status === "Planned")
    return (
      stages.find((stage) => stage.purpose === "planned") ??
      stages[0] ??
      DEFAULT_WORKFLOW_STAGES[0]
    );
  const exact = stages.find((stage) => stage.label === project.status);
  if (exact) return exact;
  const matchingPurpose = stages.find(
    (stage) => getWorkflowStageStatus(project, stage) === project.status
  );
  return (
    matchingPurpose ?? stages[1] ?? stages[0] ?? DEFAULT_WORKFLOW_STAGES[0]
  );
}

export function getProjectProgress(
  project: Pick<
    WorkItem,
    "workflowStageId" | "workflowStage" | "workflowStages" | "status"
  >
) {
  if (project.status === "Cancelled") return 0;
  if (project.status === "Delivered") return 100;
  const stages = getProjectWorkflowStages(project);
  const current = getProjectWorkflowStage(project);
  const index = stages.findIndex((stage) => stage.id === current.id);
  return stages.length > 1
    ? Math.round((Math.max(0, index) / (stages.length - 1)) * 100)
    : 0;
}

export function getWorkflowStageStatus(
  project: Pick<WorkItem, "workflowStages">,
  stage: string | WorkflowStage
): StoredProjectStatus {
  const stages = getProjectWorkflowStages(project);
  const resolved = stages.find((candidate) => stageMatches(candidate, stage));
  if (resolved) {
    if (resolved.purpose === "delivered") return "Delivered";
    if (resolved.purpose === "planned") return "Planned";
    if (resolved.purpose === "revisions") return "Revision";
    if (resolved.purpose === "client_review" || resolved.purpose === "approved")
      return "Review";
    return "In Progress";
  }
  const normalized =
    typeof stage === "string"
      ? stage.trim().toLowerCase()
      : stage.label.trim().toLowerCase();
  if (normalized === "cancelled" || normalized === "canceled")
    return "Cancelled";
  if (
    normalized.includes("deliver") ||
    normalized.includes("publish") ||
    normalized.includes("export")
  )
    return "Delivered";
  if (normalized.includes("revision")) return "Revision";
  if (normalized.includes("review") || normalized.includes("approv"))
    return "Review";
  return "In Progress";
}

export function resolveProjectWorkflowStage(
  project: Pick<WorkItem, "workflowStages">,
  requestedStage: string | WorkflowStage
): string {
  const stages = getProjectWorkflowStages(project);
  const resolved = stages.find((stage) => stageMatches(stage, requestedStage));
  if (resolved) return resolved.id;
  const requestedStatus = getWorkflowStageStatus(
    { workflowStages: DEFAULT_WORKFLOW_STAGES },
    requestedStage
  );
  return (
    stages.find(
      (stage) => getWorkflowStageStatus(project, stage) === requestedStatus
    )?.id ??
    (typeof requestedStage === "string" ? requestedStage : requestedStage.id)
  );
}

/** Keeps empty workflow columns visible while preserving projects in unknown stages. */
export function groupProjectsByStage(
  projects: readonly WorkItem[],
  stages: readonly (WorkflowStage | string)[] = [
    ...new Set(
      projects.flatMap(getProjectWorkflowStages).map((stage) => stage.id)
    ),
  ]
): ProjectStageGroup[] {
  const availableStages = projects.flatMap(getProjectWorkflowStages);
  const knownStages = [
    ...new Map(
      stages.flatMap((stage) => {
        if (typeof stage !== "string") return [[stage.id, stage] as const];
        const resolved = availableStages.find((candidate) =>
          stageMatches(candidate, stage)
        );
        return resolved ? [[resolved.id, resolved] as const] : [];
      })
    ),
  ].map(([, stage]) => stage);
  const unknownStages = projects
    .map(getProjectWorkflowStage)
    .filter(
      (stage) => !knownStages.some((knownStage) => knownStage.id === stage.id)
    );

  const allStages = [
    ...new Map(
      [...knownStages, ...unknownStages].map(
        (stage) => [stage.id, stage] as const
      )
    ).values(),
  ];
  return allStages.map((stage) => ({
    stage,
    projects: projects.filter(
      (project) => getProjectWorkflowStage(project).id === stage.id
    ),
  }));
}

export type ProjectStageMenuChoice = {
  stage: WorkflowStage;
  label: string;
  current: boolean;
  disabled: boolean;
  ariaLabel: string;
};

/** Produces the non-drag stage choices used by keyboard and pointer users alike. */
export function getProjectStageMenuChoices(
  project: Pick<
    WorkItem,
    "status" | "title" | "workflowStageId" | "workflowStage" | "workflowStages"
  >,
  stages: readonly (WorkflowStage | string)[] = getProjectWorkflowStages(
    project
  )
): ProjectStageMenuChoice[] {
  const availableStages = getProjectWorkflowStages(project);
  const choices = [
    ...new Map(
      stages.flatMap((stage) => {
        const resolved =
          typeof stage === "string"
            ? availableStages.find((candidate) =>
                stageMatches(candidate, stage)
              )
            : stage;
        return resolved ? [[resolved.id, resolved] as const] : [];
      })
    ),
  ].map(([, stage]) => stage);
  const currentStage = getProjectWorkflowStage({
    ...project,
    workflowStages: choices,
  });
  return choices.map((stage) => {
    const current = stage.id === currentStage.id;
    return {
      stage,
      label: stage.label,
      current,
      disabled: current,
      ariaLabel: current
        ? `${project.title}, current stage ${stage.label}`
        : `Move ${project.title} to ${stage.label}`,
    };
  });
}

export type ProjectDeliveryEffect =
  | { kind: "earnings"; amount: number }
  | {
      kind: "salary-plan";
      completedProjects: number;
      requiredProjects: number;
      batchAmount: number;
    };

export type ProjectDeliveryConfirmation = {
  required: boolean;
  title?: string;
  detail?: string;
  effect?: ProjectDeliveryEffect;
};

/** Returns the confirmation state before a project first enters Delivered. */
export function getProjectDeliveryConfirmation(
  project: Pick<WorkItem, "title" | "status">,
  nextStatus: StoredProjectStatus,
  effect?: ProjectDeliveryEffect
): ProjectDeliveryConfirmation {
  if (nextStatus !== "Delivered" || project.status === "Delivered")
    return { required: false };
  return {
    required: true,
    title: `Mark ${project.title} as Delivered?`,
    detail: "Relay will record the delivery time.",
    ...(effect ? { effect } : {}),
  };
}

export function moveProjectToStage(
  project: WorkItem,
  requestedStage: string | WorkflowStage,
  changedAt: string
): WorkItem {
  const workflowStage = resolveProjectWorkflowStage(project, requestedStage);
  const status = getWorkflowStageStatus(project, workflowStage);
  return {
    ...project,
    workflowStageId: workflowStage,
    workflowStage: undefined,
    ...projectStatusUpdate(project, status, changedAt),
  };
}
