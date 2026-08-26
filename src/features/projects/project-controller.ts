"use client";

import { useCallback } from "react";
import type { StoredProjectStatus } from "@/lib/domain-values";
import type {
  Client,
  ProjectGroup,
  SalaryPlan,
  SavedProjectTemplate,
  WorkItem,
} from "@/lib/types";
import { applyProjectTemplate } from "@/lib/project-templates";
import { DEFAULT_WORKFLOW_STAGES } from "@/lib/workflow-templates";
import {
  getProjectWorkflowStage,
  getWorkflowStageStatus,
  moveProjectToStage,
  resolveProjectWorkflowStage,
  validateNewProjectInput,
  type NewProjectInput,
} from "./project-domain";
import type { ProjectWorkflowPort } from "./project-workflow-port";
import type { ProjectPort } from "./project-port";

type ProjectControllerOptions = {
  projects: ProjectPort;
  canEditTeamProjects: boolean;
  canUpdateTeamStatus: boolean;
  salaryWorkType: string;
  currencyCode: string;
  workflow: ProjectWorkflowPort;
  confirmDelivery?: (message: string) => boolean;
  notify: (message: string, tone?: "success" | "info" | "warning") => void;
  onStatusChanged: (
    project: WorkItem,
    previousStatus: StoredProjectStatus
  ) => void;
};

export function useProjectController(options: ProjectControllerOptions) {
  const { canEditTeamProjects, canUpdateTeamStatus, notify, onStatusChanged } =
    options;
  const archiveProject = useCallback(
    (project: WorkItem) => {
      if (project.teamId && !canEditTeamProjects) {
        notify("Your team role cannot archive team projects.", "warning");
        return;
      }
      const archived = !project.archived;
      options.projects.update(project.id, (item) => ({ ...item, archived }));
      notify(`${project.title} ${archived ? "archived" : "restored"}.`);
    },
    [canEditTeamProjects, notify, options.projects]
  );

  const updateProjectStatus = useCallback(
    async (project: WorkItem, requestedStage: string) => {
      if (project.teamId && !canUpdateTeamStatus) {
        notify("Your team role cannot update project status.", "warning");
        return;
      }
      const stageId = resolveProjectWorkflowStage(project, requestedStage);
      const stage = project.workflowStages?.find(
        (candidate) => candidate.id === stageId
      );
      const status = getWorkflowStageStatus(project, stageId);
      if (status === "Delivered" && project.status !== "Delivered") {
        let preview;
        try {
          preview = await options.workflow.previewStage({
            projectId: project.id,
            stageId,
          });
        } catch {
          notify("Relay could not verify the delivery effect.", "warning");
          return;
        }
        const formatMoney = (amount: number) =>
          new Intl.NumberFormat("en", {
            style: "currency",
            currency: options.currencyCode,
            maximumFractionDigits: 0,
          }).format(amount);
        const effect =
          preview.kind === "salary"
            ? preview.batchCreated
              ? `This completes a ${preview.requiredProjectCount}-Project Salary Batch worth ${formatMoney(preview.amount)}.`
              : `This moves the current Salary Batch to ${preview.progress}/${preview.requiredProjectCount} Projects toward ${formatMoney(preview.amount)}.`
            : preview.kind === "client" && preview.earned > 0
              ? `This records ${formatMoney(preview.earned)} as earned.`
              : "This records delivery for the team Project.";
        const confirmDelivery =
          options.confirmDelivery ??
          ((message: string) => window.confirm(message));
        if (
          !confirmDelivery(
            `Mark ${project.title} as Delivered? Relay will record the delivery time.\n\n${effect}`
          )
        )
          return;
      }
      try {
        const result = await options.workflow.transitionStage({
          projectId: project.id,
          stageId,
        });
        const updated = moveProjectToStage(
          project,
          stageId,
          result.completedAt ?? new Date().toISOString()
        );
        onStatusChanged(updated, project.status);
        const resultMessage =
          result.kind === "salary" && result.batchCreated
            ? `${project.title} delivered. Salary Batch completed.`
            : result.kind === "salary"
              ? `${project.title} delivered. Salary Plan progress: ${result.progress}/${result.requiredProjectCount}.`
              : `${project.title} moved from ${getProjectWorkflowStage(project).label} to ${stage?.label ?? requestedStage}.`;
        notify(resultMessage);
      } catch {
        notify("Project stage could not be updated.", "warning");
      }
    },
    [canEditTeamProjects, canUpdateTeamStatus, notify, onStatusChanged, options]
  );

  return { archiveProject, updateProjectStatus };
}

type ProjectCreationControllerOptions = {
  clients: readonly Client[];
  projectGroups: readonly ProjectGroup[];
  workflowTemplates: readonly SavedProjectTemplate[];
  salaryPlans?: readonly SalaryPlan[];
  projectTags: readonly string[];
  salaryWorkType: string;
  profileId: string;
  baseNotes: string;
  scope: "personal" | "team";
  teamId?: string;
  ownerUserId?: string;
  projects: ProjectPort;
  notify: ProjectControllerOptions["notify"];
  onCreated: (project: WorkItem & { createdAt: string }) => void;
};

export function useProjectCreationController(
  options: ProjectCreationControllerOptions
) {
  return useCallback(
    (input: NewProjectInput) => {
      const validation = validateNewProjectInput(input, {
        clients: options.clients,
        projectGroups: options.projectGroups,
        workflowTemplates: options.workflowTemplates,
        salaryPlans: options.salaryPlans,
      });
      if (!validation.ok) {
        options.notify(
          validation.errors[0] ?? "Project details are invalid.",
          "warning"
        );
        return;
      }
      const value = validation.value;
      const client = options.clients.find(
        (record) => record.id === value.clientId
      );
      if (!client) return;
      const template = options.workflowTemplates.find(
        (record) => record.id === value.workflowTemplateId
      );
      const freelanceTag =
        options.projectTags.find((tag) =>
          tag.toLowerCase().includes("freelance")
        ) ??
        options.projectTags.find(
          (tag) =>
            tag.trim().toLowerCase() !==
            options.salaryWorkType.trim().toLowerCase()
        ) ??
        "Freelance";
      const workType =
        value.financialType === "salary-plan"
          ? options.salaryWorkType
          : freelanceTag;
      const now = new Date().toISOString();
      const startDate = now.slice(0, 10);
      const teamId = options.scope === "team" ? options.teamId : undefined;
      const templateValues: Omit<WorkItem, "id"> = template
        ? applyProjectTemplate(template, {
            profileId: options.profileId,
            startDate,
            dueDate: value.dueDate,
            workType,
            baseNotes: options.baseNotes,
            teamId,
          })
        : {
            profileId: options.profileId,
            title: "",
            status: "Planned",
            workflowStageId: DEFAULT_WORKFLOW_STAGES[0].id,
            workflowStages: DEFAULT_WORKFLOW_STAGES.map((stage) => ({
              ...stage,
            })),
            workType,
            startDate,
            dueDate: value.dueDate,
            earnings: 0,
            notes: "",
            teamId,
          };
      const project: WorkItem & { createdAt: string } = {
        ...templateValues,
        id: crypto.randomUUID(),
        title: value.name,
        client: client.name,
        clientId: client.id,
        projectGroupId: value.projectGroupId,
        salaryPlanId: value.salaryPlanId,
        earnings: value.salaryPlanId ? 0 : templateValues.earnings,
        ownerUserId: options.scope === "team" ? options.ownerUserId : undefined,
        createdAt: now,
      };
      options.projects.add(project);
      options.onCreated(project);
    },
    [options]
  );
}
