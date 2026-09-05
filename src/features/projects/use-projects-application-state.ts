"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectStatus } from "@/lib/domain-values";
import type { WorkItem } from "@/lib/types";
import {
  projectWorkspaceView,
  type ProjectActivityEvent,
  type ProjectWorkspaceView,
} from "./project-view";

export type ProjectKind = string;
export type DueFilter = "ALL" | "This Week" | "Overdue" | "Delivered";
export type ProjectSortKey =
  | "createdAt_desc"
  | "createdAt_asc"
  | "dueDate_asc"
  | "earnings_desc"
  | "earnings_asc";

export type ProjectDashboardActivity = {
  id: string;
  kind: "created" | "updated" | "status" | "delivered" | "team";
  message: string;
  projectId?: string;
  actor?: string;
  createdAt: string;
};

function readActivity(storageKey: string): ProjectActivityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(storageKey) ?? "[]"
    );
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (event): event is ProjectActivityEvent =>
          Boolean(event) &&
          typeof event === "object" &&
          "id" in event &&
          typeof event.id === "string" &&
          "projectId" in event &&
          typeof event.projectId === "string" &&
          "actorName" in event &&
          typeof event.actorName === "string" &&
          "kind" in event &&
          typeof event.kind === "string" &&
          "message" in event &&
          typeof event.message === "string" &&
          "createdAt" in event &&
          typeof event.createdAt === "string"
      )
      .slice(0, 500);
  } catch {
    return [];
  }
}

export function useProjectsApplicationState({
  projectId,
  projectView,
  sample,
  activityStorageKey,
  createEmptyForm,
}: {
  projectId?: string;
  projectView?: string;
  sample: boolean;
  activityStorageKey: string;
  createEmptyForm: () => WorkItem;
}) {
  const [activeProjectView, setActiveProjectView] =
    useState<ProjectWorkspaceView>(() =>
      projectWorkspaceView(
        projectView ??
          (typeof window === "undefined"
            ? null
            : window.localStorage.getItem("relay:last-project-workspace-view"))
      )
    );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectTemplateId, setNewProjectTemplateId] = useState(
    "relay-default-workflow"
  );
  const [projectGroupsOpen, setProjectGroupsOpen] = useState(false);
  const [projectGroupsScope, setProjectGroupsScope] = useState<
    "personal" | "team"
  >("personal");
  const [projectStartScope, setProjectStartScope] = useState<
    "personal" | "team"
  >("personal");
  const [editingId, setEditingId] = useState("");
  const [detailProjectId, setDetailProjectId] = useState(projectId ?? "");
  const [deleteTarget, setDeleteTarget] = useState<WorkItem | null>(null);
  const [form, setForm] = useState(createEmptyForm);
  const [formError, setFormError] = useState("");
  const projectLauncherTriggerRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">(
    "All"
  );
  const [kindFilter, setKindFilter] = useState<ProjectKind>("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [dueFilter, setDueFilter] = useState<DueFilter>("ALL");
  const [billingFilter, setBillingFilter] = useState<"ALL" | "Paid" | "Unpaid">(
    "ALL"
  );
  const [sortKey, setSortKey] = useState<ProjectSortKey>("dueDate_asc");
  const [dashboardActivity, setDashboardActivity] = useState<
    ProjectDashboardActivity[]
  >([]);
  const [localProjectActivity, setLocalProjectActivity] = useState(() =>
    readActivity(activityStorageKey)
  );

  useEffect(() => {
    if (projectId) setDetailProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    setActiveProjectView(
      projectWorkspaceView(
        projectView ??
          (typeof window === "undefined"
            ? null
            : window.localStorage.getItem("relay:last-project-workspace-view"))
      )
    );
  }, [projectId, projectView]);

  useEffect(() => {
    if (typeof window === "undefined" || sample) return;
    window.localStorage.setItem(
      activityStorageKey,
      JSON.stringify(localProjectActivity.slice(0, 500))
    );
  }, [activityStorageKey, localProjectActivity, sample]);

  return {
    activeProjectView,
    setActiveProjectView,
    dialogOpen,
    setDialogOpen,
    newProjectOpen,
    setNewProjectOpen,
    newProjectTemplateId,
    setNewProjectTemplateId,
    projectGroupsOpen,
    setProjectGroupsOpen,
    projectGroupsScope,
    setProjectGroupsScope,
    projectStartScope,
    setProjectStartScope,
    editingId,
    setEditingId,
    detailProjectId,
    setDetailProjectId,
    deleteTarget,
    setDeleteTarget,
    form,
    setForm,
    formError,
    setFormError,
    projectLauncherTriggerRef,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    kindFilter,
    setKindFilter,
    clientFilter,
    setClientFilter,
    dueFilter,
    setDueFilter,
    billingFilter,
    setBillingFilter,
    sortKey,
    setSortKey,
    dashboardActivity,
    setDashboardActivity,
    localProjectActivity,
    setLocalProjectActivity,
  };
}
