import { normalizeStoredProjectStatus } from "./domain-values";
import type { WorkItem } from "./types";
import { payoutPeriodRange, type PayoutDateRange, type PayoutPeriod } from "./payout-reporting";

export type InvoiceLineItem = {
  projectId: string;
  date: string;
  title: string;
  workType: string;
  amount: number;
};

export type InvoiceDraft = {
  id: string;
  invoiceNumber: string;
  client: string;
  issueDate: string;
  dueDate: string;
  currencyCode: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  total: number;
};

type BuildInvoiceDraftsOptions = {
  projects: WorkItem[];
  salaryWorkType: string;
  currencyCode: string;
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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isInRange(date: string, start: string, end: string) {
  if (!date) return false;
  return (!start || date >= start) && (!end || date <= end);
}

function safeAmount(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function invoiceSlug(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 18) || "CLIENT";
}

function csvCell(value: string | number) {
  const text = String(value);
  const needsQuoting = /[",\r\n]/.test(text);
  const startsWithFormula = /^[=+\-@]/.test(text);
  const escaped = text.replaceAll('"', '""');
  if (startsWithFormula) {
    return `"'${escaped}"`;
  }
  return needsQuoting ? `"${escaped}"` : text;
}

export function buildInvoiceDrafts({
  projects,
  salaryWorkType,
  currencyCode,
  period,
  customRange,
  now = new Date(),
}: BuildInvoiceDraftsOptions): InvoiceDraft[] {
  const range = payoutPeriodRange(period, now, customRange);
  const salaryKey = salaryWorkType.trim().toLowerCase();
  const issueDate = isoDate(now);
  const dueDate = isoDate(addDays(now, 14));
  const groups = new Map<string, InvoiceLineItem[]>();

  for (const project of projects) {
    if (normalizeStoredProjectStatus(project.status) !== "Delivered") continue;
    const completedDate = project.completedAt?.slice(0, 10) || project.dueDate;
    if (!isInRange(completedDate, range.start, range.end)) continue;
    if (project.workType.trim().toLowerCase() === salaryKey) continue;
    if (project.paid) continue;
    const amount = safeAmount(project.earnings);
    if (!amount) continue;
    const client = project.client?.trim() || "Unassigned client";
    const lineItems = groups.get(client) ?? [];
    lineItems.push({
      projectId: project.id,
      date: completedDate,
      title: project.title.trim() || "Untitled project",
      workType: project.workType,
      amount,
    });
    groups.set(client, lineItems);
  }

  return [...groups.entries()]
    .map(([client, lineItems], index): InvoiceDraft => {
      const sortedItems = lineItems.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
      const subtotal = sortedItems.reduce((total, item) => total + item.amount, 0);
      return {
        id: `${invoiceSlug(client).toLowerCase()}-${index + 1}`,
        invoiceNumber: `DRAFT-${issueDate.replaceAll("-", "")}-${invoiceSlug(client)}`,
        client,
        issueDate,
        dueDate,
        currencyCode,
        lineItems: sortedItems,
        subtotal,
        total: subtotal,
      };
    })
    .sort((a, b) => b.total - a.total || a.client.localeCompare(b.client));
}

export function invoiceDraftsToCsv(drafts: InvoiceDraft[]) {
  const rows: Array<Array<string | number>> = [[
    "Invoice number",
    "Client",
    "Issue date",
    "Due date",
    "Project date",
    "Project",
    "Work type",
    "Amount",
    "Currency",
  ]];
  for (const draft of drafts) {
    for (const item of draft.lineItems) {
      rows.push([
        draft.invoiceNumber,
        draft.client,
        draft.issueDate,
        draft.dueDate,
        item.date,
        item.title,
        item.workType,
        item.amount,
        draft.currencyCode,
      ]);
    }
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
