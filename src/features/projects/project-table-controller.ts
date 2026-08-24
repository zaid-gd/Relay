"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { StoredTeamRole } from "@/lib/domain-values";
import type { Client, WorkItem } from "@/lib/types";
import { DEFAULT_PROJECT_TABLE_STATE, filterProjectTableProjects, getProjectPaymentState, parseProjectTableSearch, serializeProjectTableSearch, shouldShowProjectAssignees, sortProjectTableProjects, type ProjectTableState } from "./project-table-domain";

type ProjectTableControllerOptions = {
  scope: "personal" | "team";
  personalProjects: WorkItem[];
  teamProjects: WorkItem[];
  clients: readonly Client[];
  salaryWorkType: string;
  currentUserId: string;
  currentUserRole?: StoredTeamRole;
  allowAllTeamProjects: boolean;
  activeTeamMemberCount: number;
};

export function useProjectTableController(options: ProjectTableControllerOptions) {
  const [state, setState] = useState<ProjectTableState>(DEFAULT_PROJECT_TABLE_STATE);
  const [ready, setReady] = useState(false);
  const deferredState = useDeferredValue(state);

  useEffect(() => {
    const parsed = parseProjectTableSearch(window.location.search);
    const rememberedView = window.localStorage.getItem("relay-project-view");
    const hasUrlView = new URLSearchParams(window.location.search).has("view");
    setState(!hasUrlView && rememberedView === "board" ? { ...parsed, view: "board" } : parsed);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const query = serializeProjectTableSearch(state);
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    window.localStorage.setItem("relay-project-view", state.view);
  }, [ready, state]);

  const source = options.scope === "team" ? (options.currentUserRole ? options.teamProjects : []) : options.personalProjects;
  const rules = useMemo(() => ({
    isBillableProject: (project: WorkItem) => project.earnings > 0 && project.workType !== options.salaryWorkType,
    isSalaryProject: (project: WorkItem) => project.workType === options.salaryWorkType,
  }), [options.salaryWorkType]);
  const projects = useMemo(() => sortProjectTableProjects(
    filterProjectTableProjects(source, deferredState, {
      ...rules,
      clients: options.clients,
      scope: options.scope === "team" && options.currentUserRole
        ? { kind: "team", currentUserId: options.currentUserId, role: options.currentUserRole, allowAllTeamProjects: options.allowAllTeamProjects }
        : { kind: "personal" },
    }),
    deferredState,
    { ...rules, clients: options.clients },
  ), [deferredState, options.allowAllTeamProjects, options.clients, options.currentUserId, options.currentUserRole, options.scope, rules, source]);
  const summary = useMemo(() => {
    const delivered = source.filter((project) => project.status === "Delivered");
    return {
      active: source.filter((project) => project.status !== "Delivered" && project.status !== "Cancelled").length,
      review: source.filter((project) => ["Review", "Revision", "Client Review"].includes(project.status)).length,
      delivered: delivered.length,
      dueSoon: source.filter((project) => {
        if (project.status === "Delivered" || project.status === "Cancelled") return false;
        const due = new Date(`${project.dueDate}T00:00:00`).getTime();
        const now = Date.now();
        return due >= now && due <= now + (7 * 86_400_000);
      }).length,
      earned: delivered.reduce((total, project) => total + project.earnings, 0),
    };
  }, [source]);

  return {
    state,
    deferredState,
    setState,
    isUpdating: deferredState !== state,
    source,
    projects,
    summary,
    hasFilters: Boolean(state.query || state.clientId || state.assigneeUserId) || state.stage !== "all" || state.payment !== "all" || state.salary !== "all" || state.archive !== "active",
    showAssignees: shouldShowProjectAssignees({ isTeamWorkspace: options.scope === "team", activeMemberCount: options.activeTeamMemberCount }),
    getPaymentState: (project: WorkItem) => getProjectPaymentState(project, rules),
    isSalaryProject: rules.isSalaryProject,
  };
}
