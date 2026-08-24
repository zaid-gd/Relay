import type { Client, WorkItem } from "../../lib/types";
import type { StoredProjectStatus, StoredTeamRole } from "../../lib/domain-values";

export type ProjectTableView = "table" | "board";
export type ProjectTableSort = "name" | "due" | "stage" | "payment" | "salary";
export type ProjectTableDirection = "asc" | "desc";
export type ProjectTablePayment = "all" | "paid" | "unpaid" | "not-billable";
export type ProjectTableSalary = "all" | "salary" | "client";
export type ProjectTableArchive = "active" | "archived" | "all";

export type ProjectTableState = {
  query: string;
  clientId: string;
  stage: StoredProjectStatus | "all";
  payment: ProjectTablePayment;
  salary: ProjectTableSalary;
  assigneeUserId: string;
  view: ProjectTableView;
  sort: ProjectTableSort;
  direction: ProjectTableDirection;
  archive: ProjectTableArchive;
};

export const DEFAULT_PROJECT_TABLE_STATE: ProjectTableState = {
  query: "",
  clientId: "",
  stage: "all",
  payment: "all",
  salary: "all",
  assigneeUserId: "",
  view: "table",
  sort: "due",
  direction: "asc",
  archive: "active",
};

export type ProjectTableRules = {
  isBillableProject: (project: WorkItem) => boolean;
  isSalaryProject: (project: WorkItem) => boolean;
};

type ProjectTableScope =
  | { kind: "personal" }
  | { kind: "team"; currentUserId: string; role: StoredTeamRole; allowAllTeamProjects: boolean };

type ProjectTableContext = ProjectTableRules & { clients: readonly Client[]; scope: ProjectTableScope };

function nonEmpty(value: string | null) {
  return value?.trim() ?? "";
}

function parseStage(value: string | null): ProjectTableState["stage"] {
  if (value === "Planned" || value === "In Progress" || value === "Review" || value === "Revision" || value === "Delivered" || value === "Cancelled" || value === "Client Review") return value;
  return "all";
}

function parsePayment(value: string | null): ProjectTablePayment {
  return value === "paid" || value === "unpaid" || value === "not-billable" ? value : "all";
}

function parseSalary(value: string | null): ProjectTableSalary {
  return value === "salary" || value === "client" ? value : "all";
}

function parseView(value: string | null): ProjectTableView {
  return value === "board" ? "board" : "table";
}

function parseSort(value: string | null): ProjectTableSort {
  return value === "name" || value === "stage" || value === "payment" || value === "salary" ? value : "due";
}

function parseDirection(value: string | null): ProjectTableDirection {
  return value === "desc" ? "desc" : "asc";
}

function parseArchive(value: string | null): ProjectTableArchive {
  return value === "archived" || value === "all" ? value : "active";
}

function toSearchParams(search: string | URLSearchParams) {
  if (search instanceof URLSearchParams) return new URLSearchParams(search);
  const queryStart = search.indexOf("?");
  const query = queryStart >= 0 ? search.slice(queryStart + 1) : search;
  return new URLSearchParams(query.split("#")[0]);
}

export function parseProjectTableSearch(search: string | URLSearchParams): ProjectTableState {
  const params = toSearchParams(search);
  return {
    query: nonEmpty(params.get("q")),
    clientId: nonEmpty(params.get("client")),
    stage: parseStage(params.get("stage")),
    payment: parsePayment(params.get("payment")),
    salary: parseSalary(params.get("salary")),
    assigneeUserId: nonEmpty(params.get("assignee")),
    view: parseView(params.get("view")),
    sort: parseSort(params.get("sort")),
    direction: parseDirection(params.get("dir")),
    archive: parseArchive(params.get("archive")),
  };
}

export function serializeProjectTableSearch(state: ProjectTableState) {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.clientId) params.set("client", state.clientId);
  if (state.stage !== "all") params.set("stage", state.stage);
  if (state.payment !== "all") params.set("payment", state.payment);
  if (state.salary !== "all") params.set("salary", state.salary);
  if (state.assigneeUserId) params.set("assignee", state.assigneeUserId);
  if (state.view !== DEFAULT_PROJECT_TABLE_STATE.view) params.set("view", state.view);
  if (state.sort !== DEFAULT_PROJECT_TABLE_STATE.sort) params.set("sort", state.sort);
  if (state.direction !== DEFAULT_PROJECT_TABLE_STATE.direction) params.set("dir", state.direction);
  if (state.archive !== DEFAULT_PROJECT_TABLE_STATE.archive) params.set("archive", state.archive);
  return params.toString();
}

function clientName(project: WorkItem, clients: readonly Client[]) {
  const record = project.clientId ? clients.find((client) => client.id === project.clientId) : undefined;
  return record?.name ?? project.client ?? "";
}

export function projectBelongsToDefaultEditorScope(project: WorkItem, scope: ProjectTableScope) {
  if (scope.kind === "personal" || !project.teamId || scope.role !== "Editor" || scope.allowAllTeamProjects) return true;
  return project.ownerUserId === scope.currentUserId || (project.assigneeUserIds ?? []).includes(scope.currentUserId);
}

export function shouldShowProjectAssignees({ isTeamWorkspace, activeMemberCount }: { isTeamWorkspace: boolean; activeMemberCount: number }) {
  return isTeamWorkspace && activeMemberCount > 1;
}

export type ProjectPaymentState = "paid" | "unpaid" | "not-billable";

export function getProjectPaymentState(project: WorkItem, rules: ProjectTableRules): ProjectPaymentState {
  if (!rules.isBillableProject(project)) return "not-billable";
  return project.paid ? "paid" : "unpaid";
}

export function filterProjectTableProjects(
  projects: readonly WorkItem[],
  state: ProjectTableState,
  context: ProjectTableContext,
) {
  const query = state.query.toLowerCase();
  return projects.filter((project) => {
    const payment = getProjectPaymentState(project, context);
    const salary = context.isSalaryProject(project);
    const searchable = `${project.title} ${clientName(project, context.clients)} ${project.notes} ${project.workType}`.toLowerCase();
    if (state.archive === "active" && project.archived) return false;
    if (state.archive === "archived" && !project.archived) return false;
    if (query && !searchable.includes(query)) return false;
    if (state.clientId && project.clientId !== state.clientId) return false;
    if (state.stage !== "all" && project.status !== state.stage) return false;
    if (state.payment !== "all" && payment !== state.payment) return false;
    if (state.salary === "salary" && !salary) return false;
    if (state.salary === "client" && salary) return false;
    if (state.assigneeUserId && !(project.assigneeUserIds ?? []).includes(state.assigneeUserId)) return false;
    return projectBelongsToDefaultEditorScope(project, context.scope);
  });
}

function compareText(left: string, right: string) {
  return left.localeCompare(right) || 0;
}

function compareProjects(left: WorkItem, right: WorkItem, state: ProjectTableState, context: ProjectTableRules & { clients: readonly Client[] }) {
  let result = 0;
  if (state.sort === "name") result = compareText(left.title, right.title);
  else if (state.sort === "stage") result = compareText(left.status, right.status);
  else if (state.sort === "payment") result = compareText(getProjectPaymentState(left, context), getProjectPaymentState(right, context));
  else if (state.sort === "salary") result = Number(context.isSalaryProject(left)) - Number(context.isSalaryProject(right));
  else result = (left.dueDate || "9999-12-31").localeCompare(right.dueDate || "9999-12-31");
  if (state.direction === "desc") result = -result;
  return result || compareText(left.title, right.title) || compareText(left.id, right.id);
}

export function sortProjectTableProjects(
  projects: readonly WorkItem[],
  state: ProjectTableState,
  context: ProjectTableRules & { clients: readonly Client[] },
) {
  return [...projects].sort((left, right) => compareProjects(left, right, state, context));
}

export function getProjectTableDeletionWarning(projectTitle: string) {
  return `Permanently deleting ${projectTitle} removes its files, versions, client portal, and Activity history. This cannot be undone.`;
}
