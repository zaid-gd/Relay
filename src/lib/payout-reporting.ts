import { normalizeStoredProjectStatus } from "./domain-values";
import type { SalaryBatch, WorkItem } from "./types";

export type PayoutPeriod = "month" | "quarter" | "year" | "all" | "custom";

export type PayoutDateRange = {
  start: string;
  end: string;
};

export type PayoutEditor = {
  userId: string;
  name: string;
};

export type PayoutProjectRow = {
  id: string;
  date: string;
  title: string;
  editorId: string;
  editorName: string;
  workType: string;
  amount: number;
  isSalaryEdit: boolean;
  paid: boolean;
  clientId?: string;
  clientName: string;
};

export type PayoutBatchRow = {
  id: string;
  number: number;
  date: string;
  editorName: string;
  amount: number;
  paid: boolean;
  paidDate: string;
  clientId?: string;
  clientName: string;
};

export type PayoutEditorRow = {
  id: string;
  name: string;
  deliveredProjects: number;
  salaryEdits: number;
  manualEarnings: number;
  batchEarnings: number;
  totalEarnings: number;
};

export type PayoutClientRow = {
  id: string;
  name: string;
  deliveredProjects: number;
  salaryBatches: number;
  earned: number;
  collected: number;
  outstanding: number;
};

export type PayoutMoneyTotals = {
  earned: number;
  collected: number;
  outstanding: number;
};

export type PayoutReport = {
  period: PayoutPeriod;
  periodStart: string;
  periodEnd: string;
  deliveredProjects: PayoutProjectRow[];
  batches: PayoutBatchRow[];
  editors: PayoutEditorRow[];
  clients: PayoutClientRow[];
  completedBatchCount: number;
  paidBatchCount: number;
  unpaidBatchCount: number;
  paidBatchEarnings: number;
  unpaidBatchEarnings: number;
  manualEarnings: number;
  paidManualEarnings: number;
  unpaidManualEarnings: number;
  batchEarnings: number;
  totalEarnings: number;
  earned: number;
  collected: number;
  outstanding: number;
  money: PayoutMoneyTotals;
};

type BuildPayoutReportOptions = {
  projects: WorkItem[];
  salaryBatches: SalaryBatch[];
  salaryWorkType: string;
  salaryBatchAmount: number;
  profileName: string;
  editors?: PayoutEditor[];
  currentUserId?: string;
  period: PayoutPeriod;
  customRange?: PayoutDateRange;
  now?: Date;
};

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKey(value: string | undefined) {
  const match = value?.trim().match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? "";
}

export function payoutPeriodRange(
  period: PayoutPeriod,
  now = new Date(),
  customRange?: PayoutDateRange,
): PayoutDateRange {
  if (period === "all") return { start: "", end: "" };
  if (period === "custom") {
    return {
      start: dateKey(customRange?.start),
      end: dateKey(customRange?.end),
    };
  }

  const year = now.getFullYear();
  const month = now.getMonth();
  const start = period === "year"
    ? new Date(year, 0, 1)
    : period === "quarter"
      ? new Date(year, Math.floor(month / 3) * 3, 1)
      : new Date(year, month, 1);
  const end = period === "year"
    ? new Date(year, 11, 31)
    : period === "quarter"
      ? new Date(year, Math.floor(month / 3) * 3 + 3, 0)
      : new Date(year, month + 1, 0);
  return { start: isoDate(start), end: isoDate(end) };
}

function isInRange(date: string, start: string, end: string) {
  if (!date) return false;
  return (!start || date >= start) && (!end || date <= end);
}

function safeAmount(value: number | undefined, fallback = 0) {
  const amount = value ?? fallback;
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function isSalaryProject(project: WorkItem, salaryKey: string) {
  return Boolean(project.salaryPlanId?.trim()) || project.workType.trim().toLowerCase() === salaryKey;
}

export function buildPayoutReport({
  projects,
  salaryBatches,
  salaryWorkType,
  salaryBatchAmount,
  profileName,
  editors = [],
  currentUserId,
  period,
  customRange,
  now,
}: BuildPayoutReportOptions): PayoutReport {
  const range = payoutPeriodRange(period, now, customRange);
  const editorNames = new Map(editors.map((editor) => [editor.userId, editor.name]));
  const personalEditorId = currentUserId?.trim() || (editors.length === 1 ? editors[0].userId : "personal");
  const personalEditorName = profileName.trim() || "You";
  const salaryKey = salaryWorkType.trim().toLowerCase();
  const projectById = new Map(projects.map((project) => [project.id, project]));

  const deliveredProjects = projects
    .filter((project) => normalizeStoredProjectStatus(project.status) === "Delivered")
    .map((project): PayoutProjectRow | undefined => {
      const date = dateKey(project.completedAt) || dateKey(project.dueDate);
      if (!isInRange(date, range.start, range.end)) return undefined;
      const editorId = project.assigneeUserIds?.[0] || project.ownerUserId || personalEditorId;
      const editorName = editorId === personalEditorId
        ? personalEditorName
        : editorNames.get(editorId) || "Unassigned";
      const isSalaryEdit = isSalaryProject(project, salaryKey);
      return {
        id: project.id,
        date,
        title: project.title,
        editorId,
        editorName,
        workType: project.workType,
        amount: isSalaryEdit ? 0 : safeAmount(project.earnings),
        isSalaryEdit,
        paid: project.paid === true,
        clientId: project.clientId,
        clientName: project.client?.trim() || "Unassigned client",
      };
    })
    .filter((project): project is PayoutProjectRow => project !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

  const batches = salaryBatches
    .map((batch): PayoutBatchRow | undefined => {
      const date = dateKey(batch.completedDate);
      if (!isInRange(date, range.start, range.end)) return undefined;
      const linkedProject = batch.projectIds
        ?.map((projectId) => projectById.get(projectId))
        .find((project): project is WorkItem => project !== undefined);
      const clientId = batch.clientId || linkedProject?.clientId;
      const clientName = batch.clientName?.trim() || linkedProject?.client?.trim() || "Unassigned client";
      return {
        id: batch.id,
        number: batch.number,
        date,
        editorName: personalEditorName,
        amount: safeAmount(batch.amount, salaryBatchAmount),
        paid: batch.paid === true,
        paidDate: dateKey(batch.paidDate),
        clientId,
        clientName,
      };
    })
    .filter((batch): batch is PayoutBatchRow => batch !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number);

  const editorRows = new Map<string, PayoutEditorRow>();
  const ensureEditor = (id: string, name: string) => {
    const existing = editorRows.get(id);
    if (existing) return existing;
    const row: PayoutEditorRow = {
      id,
      name,
      deliveredProjects: 0,
      salaryEdits: 0,
      manualEarnings: 0,
      batchEarnings: 0,
      totalEarnings: 0,
    };
    editorRows.set(id, row);
    return row;
  };

  for (const project of deliveredProjects) {
    const row = ensureEditor(project.editorId, project.editorName);
    row.deliveredProjects += 1;
    row.salaryEdits += project.isSalaryEdit ? 1 : 0;
    row.manualEarnings += project.amount;
  }
  for (const batch of batches) {
    ensureEditor(personalEditorId, personalEditorName).batchEarnings += batch.amount;
  }
  for (const row of editorRows.values()) {
    row.totalEarnings = row.manualEarnings + row.batchEarnings;
  }

  const clients = new Map<string, PayoutClientRow>();
  const ensureClient = (id: string | undefined, name: string) => {
    const clientId = id?.trim() || `name:${name.trim().toLowerCase()}`;
    const existing = clients.get(clientId);
    if (existing) return existing;
    const row: PayoutClientRow = {
      id: clientId,
      name,
      deliveredProjects: 0,
      salaryBatches: 0,
      earned: 0,
      collected: 0,
      outstanding: 0,
    };
    clients.set(clientId, row);
    return row;
  };

  for (const project of deliveredProjects) {
    if (project.isSalaryEdit) continue;
    const client = ensureClient(project.clientId, project.clientName);
    client.deliveredProjects += 1;
    client.earned += project.amount;
    if (project.paid) client.collected += project.amount;
    else client.outstanding += project.amount;
  }
  for (const batch of batches) {
    const client = ensureClient(batch.clientId, batch.clientName);
    client.salaryBatches += 1;
    client.earned += batch.amount;
    if (batch.paid) client.collected += batch.amount;
    else client.outstanding += batch.amount;
  }

  const paidBatches = batches.filter((batch) => batch.paid);
  const unpaidBatches = batches.filter((batch) => !batch.paid);
  const normalProjects = deliveredProjects.filter((project) => !project.isSalaryEdit);
  const manualEarnings = normalProjects.reduce((total, project) => total + project.amount, 0);
  const paidManualEarnings = normalProjects
    .filter((project) => project.paid)
    .reduce((total, project) => total + project.amount, 0);
  const unpaidManualEarnings = manualEarnings - paidManualEarnings;
  const batchEarnings = batches.reduce((total, batch) => total + batch.amount, 0);
  const paidBatchEarnings = paidBatches.reduce((total, batch) => total + batch.amount, 0);
  const unpaidBatchEarnings = unpaidBatches.reduce((total, batch) => total + batch.amount, 0);
  const earned = manualEarnings + batchEarnings;
  const collected = paidManualEarnings + paidBatchEarnings;
  const outstanding = unpaidManualEarnings + unpaidBatchEarnings;
  const money: PayoutMoneyTotals = { earned, collected, outstanding };

  return {
    period,
    periodStart: range.start,
    periodEnd: range.end,
    deliveredProjects,
    batches,
    editors: [...editorRows.values()].sort((a, b) => b.totalEarnings - a.totalEarnings || a.name.localeCompare(b.name)),
    clients: [...clients.values()].sort((a, b) => b.earned - a.earned || a.name.localeCompare(b.name)),
    completedBatchCount: batches.length,
    paidBatchCount: paidBatches.length,
    unpaidBatchCount: unpaidBatches.length,
    paidBatchEarnings,
    unpaidBatchEarnings,
    manualEarnings,
    paidManualEarnings,
    unpaidManualEarnings,
    batchEarnings,
    totalEarnings: earned,
    earned,
    collected,
    outstanding,
    money,
  };
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

export function payoutReportToCsv(report: PayoutReport, currencyCode: string) {
  const rows: Array<Array<string | number>> = [
    ["Record type", "Date", "Reference", "Editor", "Work type / status", "Amount", "Currency"],
    ...report.deliveredProjects.map((project): Array<string | number> => [
      "Delivered project",
      project.date,
      project.title,
      project.editorName,
      project.workType,
      project.amount,
      currencyCode,
    ]),
    ...report.batches.map((batch): Array<string | number> => [
      "Salary batch",
      batch.date,
      `Batch ${batch.number}`,
      batch.editorName,
      batch.paid ? "Paid" : "Unpaid",
      batch.amount,
      currencyCode,
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
