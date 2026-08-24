"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { StoredProjectStatus } from "@/lib/domain-values";
import type { Client, ProjectGroup, SavedProjectTemplate, WorkItem } from "@/lib/types";
import { applyProjectTemplate } from "@/lib/project-templates";
import { projectStatusUpdate, validateNewProjectInput, type NewProjectInput } from "./project-domain";

type ProjectControllerOptions = {
  setProjects: Dispatch<SetStateAction<WorkItem[]>>;
  canEditTeamProjects: boolean;
  canUpdateTeamStatus: boolean;
  notify: (message: string, tone?: "success" | "info" | "warning") => void;
  onStatusChanged: (project: WorkItem, previousStatus: StoredProjectStatus) => void;
};

export function useProjectController({ setProjects, canEditTeamProjects, canUpdateTeamStatus, notify, onStatusChanged }: ProjectControllerOptions) {
  const archiveProject = useCallback((project: WorkItem) => {
    if (project.teamId && !canEditTeamProjects) {
      notify("Your team role cannot archive team projects.", "warning");
      return;
    }
    const archived = !project.archived;
    setProjects((current) => current.map((item) => item.id === project.id ? { ...item, archived } : item));
    notify(`${project.title} ${archived ? "archived" : "restored"}.`);
  }, [canEditTeamProjects, notify, setProjects]);

  const updateProjectStatus = useCallback((project: WorkItem, status: StoredProjectStatus) => {
    if (project.teamId && !canUpdateTeamStatus && !canEditTeamProjects) {
      notify("Your team role cannot update project status.", "warning");
      return;
    }
    if (status === "Delivered" && project.status !== "Delivered" && !window.confirm(`Mark ${project.title} as Delivered? Relay will record the delivery time.`)) return;
    const updated = { ...project, ...projectStatusUpdate(project, status, new Date().toISOString()) };
    setProjects((current) => current.map((item) => item.id === project.id ? updated : item));
    onStatusChanged(updated, project.status);
    notify(`${project.title} status updated.`);
  }, [canEditTeamProjects, canUpdateTeamStatus, notify, onStatusChanged, setProjects]);

  return { archiveProject, updateProjectStatus };
}

type ProjectCreationControllerOptions = {
  clients: readonly Client[];
  projectGroups: readonly ProjectGroup[];
  workflowTemplates: readonly SavedProjectTemplate[];
  projectTags: readonly string[];
  salaryWorkType: string;
  profileId: string;
  baseNotes: string;
  scope: "personal" | "team";
  teamId?: string;
  ownerUserId?: string;
  setProjects: Dispatch<SetStateAction<WorkItem[]>>;
  notify: ProjectControllerOptions["notify"];
  onCreated: (project: WorkItem & { createdAt: string }) => void;
};

export function useProjectCreationController(options: ProjectCreationControllerOptions) {
  return useCallback((input: NewProjectInput) => {
    const validation = validateNewProjectInput(input, {
      clients: options.clients,
      projectGroups: options.projectGroups,
      workflowTemplates: options.workflowTemplates,
    });
    if (!validation.ok) {
      options.notify(validation.errors[0] ?? "Project details are invalid.", "warning");
      return;
    }
    const value = validation.value;
    const client = options.clients.find((record) => record.id === value.clientId);
    if (!client) return;
    const template = options.workflowTemplates.find((record) => record.id === value.workflowTemplateId);
    const freelanceTag = options.projectTags.find((tag) => tag.toLowerCase().includes("freelance"))
      ?? options.projectTags.find((tag) => tag.trim().toLowerCase() !== options.salaryWorkType.trim().toLowerCase())
      ?? "Freelance";
    const workType = value.financialType === "salary-plan" ? options.salaryWorkType : freelanceTag;
    const now = new Date().toISOString();
    const startDate = now.slice(0, 10);
    const teamId = options.scope === "team" ? options.teamId : undefined;
    const templateValues: Omit<WorkItem, "id"> = template
      ? applyProjectTemplate(template, { profileId: options.profileId, startDate, dueDate: value.dueDate, workType, baseNotes: options.baseNotes, teamId })
      : { profileId: options.profileId, title: "", status: "Planned", workType, startDate, dueDate: value.dueDate, earnings: 0, notes: "", teamId };
    const project: WorkItem & { createdAt: string } = {
      ...templateValues,
      id: crypto.randomUUID(),
      title: value.name,
      client: client.name,
      clientId: client.id,
      projectGroupId: value.projectGroupId,
      ownerUserId: options.scope === "team" ? options.ownerUserId : undefined,
      createdAt: now,
    };
    options.setProjects((current) => [project, ...current]);
    options.onCreated(project);
  }, [options]);
}
