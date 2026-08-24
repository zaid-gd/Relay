"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Clock3,
  Download,
  FolderKanban,
  MessageSquareText,
  Plus,
  Search,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Client, SalaryBatch, SettingsState, WorkItem } from "@/lib/types";
import { useHydratedReducedMotion } from "@/lib/motion";
import { paymentStatusTone, projectStatusTone } from "@/lib/project-status-style";
import {
  buildPayoutReport,
  payoutReportToCsv,
  type PayoutPeriod,
} from "@/lib/payout-reporting";
import {
  buildInvoiceDrafts,
  invoiceDraftsToCsv,
} from "@/lib/invoice-reporting";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ContentSection,
  FillViewport,
  MasterDetail,
  MetricItem,
  MetricStrip,
  PageContent,
  PageHeader,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";

function delivered(project: WorkItem) {
  return project.status === "Delivered";
}

function active(project: WorkItem) {
  return !delivered(project) && project.status !== "Cancelled";
}

function review(project: WorkItem) {
  return ["Review", "Revision", "Client Review"].includes(project.status)
    || /review|feedback|approval|revision/i.test(project.notes);
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function priorDateRange(start: string, end: string) {
  if (!start || !end) return undefined;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const days = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  const priorEnd = new Date(startDate);
  priorEnd.setDate(priorEnd.getDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setDate(priorStart.getDate() - days + 1);
  return { start: priorStart.toISOString().slice(0, 10), end: priorEnd.toISOString().slice(0, 10) };
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function clientInitials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL";
}

type ClientRecord = Client & {
  projects: WorkItem[];
  active: number;
  delivered: number;
  earned: number;
  collected: number;
  outstanding: number;
};

const revealTransition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;

export function PrecisionClients({
  projects,
  settings,
  onAddClient,
  onUpdateClient,
  onViewProject,
}: {
  projects: WorkItem[];
  settings: SettingsState;
  onAddClient: (client: Omit<Client, "id" | "archived">) => void;
  onUpdateClient: (client: Client) => void;
  onViewProject: (project: WorkItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newClient, setNewClient] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [copiedName, setCopiedName] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const reduceMotion = useHydratedReducedMotion();

  const clients = useMemo(() => {
    const records = settings.clients.length ? settings.clients : settings.customClients.map((name) => ({ id: `client-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name, company: "", contactName: "", email: "", phone: "", notes: "", archived: false }));
    const map = new Map(records.map((client) => [client.id, { client, projects: [] as WorkItem[] }]));
    for (const project of projects) {
      const name = project.client?.trim();
      if (!name) continue;
      const entry = (project.clientId ? map.get(project.clientId) : undefined) ?? [...map.values()].find(({ client }) => client.name.toLowerCase() === name.toLowerCase());
      if (entry) entry.projects.push(project);
    }
    return Array.from(map.values())
      .map(({ client, projects: clientProjects }): ClientRecord => {
        const deliveredProjects = clientProjects.filter(delivered);
        const earned = deliveredProjects.reduce((sum, project) => sum + (Number(project.earnings) || 0), 0);
        const collected = deliveredProjects.filter((project) => project.paid).reduce((sum, project) => sum + (Number(project.earnings) || 0), 0);
        return {
          ...client,
          projects: clientProjects,
          active: clientProjects.filter(active).length,
          delivered: deliveredProjects.length,
          earned,
          collected,
          outstanding: earned - collected,
        };
      })
      .filter((client) => showArchived || !client.archived)
      .filter((client) => !query.trim() || [client.name, client.company, client.contactName, client.email].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())))
      .sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name));
  }, [projects, query, settings.clients, settings.customClients, showArchived]);

  useEffect(() => {
    if (!clients.some((client) => client.name === selectedName)) setSelectedName(clients[0]?.name ?? "");
  }, [clients, selectedName]);

  useEffect(() => {
    if (!copiedName) return;
    const timeout = window.setTimeout(() => setCopiedName(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedName]);

  const selected = clients.find((client) => client.name === selectedName) ?? clients[0] ?? null;

  function addClient() {
    const name = newClient.trim();
    if (!name) return;
    onAddClient({ name, company: newCompany.trim(), contactName: newContactName.trim(), email: newEmail.trim(), phone: newPhone.trim(), notes: newNotes.trim() });
    setSelectedName(name);
    setNewClient("");
    setNewCompany("");
    setNewContactName("");
    setNewEmail("");
    setNewPhone("");
    setNewNotes("");
    setAddOpen(false);
  }

  async function copyClientName(name: string) {
    try {
      await navigator.clipboard.writeText(name);
      setCopiedName(name);
    } catch {
      setCopiedName("");
    }
  }

  return (
    <WorkspacePage family="master-detail" mode="fill">
      <PageHeader
        title="Clients"
        description="Projects, delivery history, and account context in one focused directory."
        actions={<div className="flex gap-2"><Button variant="outline" className="h-9" aria-pressed={showArchived} onClick={() => setShowArchived((value) => !value)}>Archived</Button><Button className="h-9" onClick={() => setAddOpen(true)}><Plus /> New Client</Button></div>}
      />

      <PageContent mode="fill">
      <MetricStrip columns={3}>
        <MetricItem label="Clients" value={clients.length} icon={<UsersRound className="size-4" />} />
        <MetricItem label="Active projects" value={projects.filter(active).length} icon={<FolderKanban className="size-4" />} />
        <MetricItem label="Delivered" value={projects.filter(delivered).length} icon={<CheckCircle2 className="size-4" />} />
      </MetricStrip>

      <FillViewport bodyLabel="Client workspace" bodyClassName="overflow-visible lg:overflow-hidden">
      <MasterDetail
        className="min-h-full lg:h-full lg:min-h-0 lg:overflow-hidden"
        master={(
        <aside className="flex min-h-0 flex-col border-b border-[var(--app-border)] bg-[var(--app-soft-panel)] lg:h-full lg:border-b-0 lg:border-r">
          <div className="border-b border-[var(--app-border)] p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--app-muted)]" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients..." aria-label="Search clients" className="h-9 bg-[var(--app-panel)] pl-8 pr-8 text-xs" />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear client search"
                  className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-highlight)]"
                  onClick={() => setQuery("")}
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="min-h-0 flex-1 divide-y divide-[var(--app-border)] overflow-y-auto overscroll-contain" tabIndex={0} aria-label="Scrollable client directory">
            {clients.map((client, index) => (
              <motion.button
                key={client.name}
                type="button"
                aria-pressed={selected?.name === client.name}
                initial={reduceMotion ? false : { opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduceMotion ? { duration: 0 } : { ...revealTransition, delay: Math.min(index * 0.025, 0.18) }}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                className={cn(
                  "relative flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--app-hover)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-highlight)]",
                  selected?.name === client.name && "bg-[var(--app-active)]",
                )}
                aria-label={`${client.name}, ${client.projects.length} projects, ${client.active} active`}
                onClick={() => setSelectedName(client.name)}
              >
                {selected?.name === client.name ? (
                  <motion.span
                    layoutId="client-directory-selection"
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--app-highlight)]"
                    transition={reduceMotion ? { duration: 0 } : revealTransition}
                  />
                ) : null}
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--app-panel)] text-xs font-semibold text-[var(--app-highlight)] ring-1 ring-[var(--app-border)]">{clientInitials(client.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">{client.name}</span>
                  <span className="mt-0.5 block text-[10px] text-[var(--app-muted)]">{client.projects.length} projects · {client.active} active</span>
                </span>
                <ArrowRight className="size-3.5 text-[var(--app-muted)]" />
              </motion.button>
            ))}
            {!clients.length ? <div className="p-6 text-center text-xs text-[var(--app-muted)]">No clients match this view.</div> : null}
          </div>
        </aside>
        )}
        detail={(
          <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.main
              key={selected.name}
              initial={reduceMotion ? false : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -6 }}
              transition={reduceMotion ? { duration: 0 } : revealTransition}
              className="flex min-h-0 min-w-0 flex-col lg:h-full"
            >
            <div className="flex flex-col gap-4 border-b border-[var(--app-border)] p-5 sm:flex-row sm:items-start">
              <span className="grid size-12 shrink-0 place-items-center rounded-[6px] bg-[var(--app-active)] text-sm font-semibold text-[var(--app-highlight)]">{clientInitials(selected.name)}</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold">{selected.name}</h2>
                <p className="mt-1 text-xs text-[var(--app-muted)]">{selected.company || `${selected.active} active projects · ${selected.delivered} delivered`}</p>
              </div>
              <Button variant="outline" className="h-8 self-start text-xs" onClick={() => setEditingClient(selected)}>Edit</Button>
              <Button variant="outline" className="h-8 self-start text-xs" onClick={() => onUpdateClient({ ...selected, archived: !selected.archived })}>{selected.archived ? "Restore" : "Archive"}</Button>
              <Button
                variant="outline"
                className="h-8 self-start border-[var(--app-border)] bg-[var(--app-panel)] text-xs"
                onClick={() => void copyClientName(selected.name)}
                aria-label={copiedName === selected.name ? `${selected.name} copied` : `Copy ${selected.name} to clipboard`}
              >
                {copiedName === selected.name ? <CheckCircle2 /> : <Copy />}
                {copiedName === selected.name ? "Copied" : "Copy name"}
              </Button>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-[var(--app-border)] border-b border-[var(--app-border)] sm:grid-cols-4 sm:divide-y-0">
              <ClientMetric label="Projects" value={String(selected.projects.length)} />
              <ClientMetric label="Earned" value={money(selected.earned, settings.currencyCode)} />
              <ClientMetric label="Collected" value={money(selected.collected, settings.currencyCode)} />
              <ClientMetric label="Outstanding" value={money(selected.outstanding, settings.currencyCode)} />
            </div>
            {[selected.contactName, selected.email, selected.phone, selected.notes].some(Boolean) ? (
              <dl className="grid gap-3 border-b border-[var(--app-border)] p-5 text-xs sm:grid-cols-2">
                {[
                  ["Contact", selected.contactName],
                  ["Email", selected.email],
                  ["Phone", selected.phone],
                  ["Notes", selected.notes],
                ].filter((entry) => entry[1]).map(([label, value]) => (
                  <div key={label}><dt className="text-[10px] uppercase tracking-[0.08em] text-[var(--app-muted)]">{label}</dt><dd className="mt-1 text-[var(--app-ink)]">{value}</dd></div>
                ))}
              </dl>
            ) : null}
            <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5" tabIndex={0} aria-label="Scrollable client project history">
              <div className="mb-3 flex items-center justify-between">
                <div><h3 className="text-sm font-semibold">Project history</h3><p className="mt-0.5 text-[11px] text-[var(--app-muted)]">Current and completed work for this client.</p></div>
              </div>
              {selected.projects.length ? (
                <div className="divide-y divide-[var(--app-border)] overflow-hidden rounded-[6px] border border-[var(--app-border)]">
                  {selected.projects.slice().sort((a, b) => b.dueDate.localeCompare(a.dueDate)).map((project, index) => (
                    <motion.button
                      key={project.id}
                      type="button"
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={reduceMotion ? { duration: 0 } : { ...revealTransition, delay: Math.min(index * 0.025, 0.15) }}
                      whileTap={reduceMotion ? undefined : { scale: 0.995 }}
                      className="grid w-full gap-2 px-3 py-3 text-left transition-colors hover:bg-[var(--app-hover)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-highlight)] sm:grid-cols-[minmax(0,1fr)_120px_100px_auto] sm:items-center"
                      aria-label={`Open ${project.title}`}
                      onClick={() => onViewProject(project)}
                    >
                      <span className="min-w-0"><span className="block truncate text-xs font-semibold">{project.title}</span><span className="mt-0.5 block truncate text-[10px] text-[var(--app-muted)]">{project.notes || project.workType}</span></span>
                      <span className="text-[11px] text-[var(--app-muted)]">{formatDate(project.dueDate)}</span>
                      <Badge variant="outline" className={cn("h-5 w-fit rounded px-1.5 text-[10px]", projectStatusTone(project.status))}>{project.status}</Badge>
                      <ArrowRight className="size-3.5 text-[var(--app-muted)]" />
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-56 place-items-center rounded-[6px] border border-dashed border-[var(--app-border)] text-center"><div><BriefcaseBusiness className="mx-auto size-6 text-[var(--app-muted)]" /><p className="mt-2 text-sm font-semibold">No projects yet</p><p className="mt-1 text-xs text-[var(--app-muted)]">Assign this client when creating a project.</p></div></div>
              )}
            </section>
            </motion.main>
          ) : (
            <motion.main
              key="empty-clients"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              className="grid min-h-[420px] place-items-center p-6 text-center"
            >
              <div><UsersRound className="mx-auto size-7 text-[var(--app-muted)]" /><p className="mt-2 text-sm font-semibold">Add your first client</p><p className="mt-1 text-xs text-[var(--app-muted)]">Client records organize project history and delivery context.</p><Button className="mt-3 h-8" size="sm" onClick={() => setAddOpen(true)}><Plus /> New Client</Button></div>
            </motion.main>
          )}
          </AnimatePresence>
        )}
      />
      </FillViewport>
      </PageContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Client</DialogTitle>
            <DialogDescription>Create a client record now and assign it to projects later.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={newClient} onChange={(event) => setNewClient(event.target.value)} placeholder="Client name" aria-label="Client name" autoFocus />
            <Input value={newCompany} onChange={(event) => setNewCompany(event.target.value)} placeholder="Company (optional)" aria-label="Company" />
            <Input value={newContactName} onChange={(event) => setNewContactName(event.target.value)} placeholder="Contact name (optional)" aria-label="Contact name" />
            <Input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="Email (optional)" aria-label="Email" type="email" />
            <Input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} placeholder="Phone (optional)" aria-label="Phone" />
            <Input value={newNotes} onChange={(event) => setNewNotes(event.target.value)} placeholder="Notes (optional)" aria-label="Notes" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addClient} disabled={!newClient.trim()}>New Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingClient)} onOpenChange={(open) => { if (!open) setEditingClient(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update the durable client record without changing its project links.</DialogDescription>
          </DialogHeader>
          {editingClient ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(["name", "company", "contactName", "email", "phone", "notes"] as const).map((field) => (
                <Input
                  key={field}
                  aria-label={{ name: "Client name", company: "Company", contactName: "Contact name", email: "Email", phone: "Phone", notes: "Notes" }[field]}
                  value={editingClient[field]}
                  type={field === "email" ? "email" : "text"}
                  onChange={(event) => setEditingClient({ ...editingClient, [field]: event.target.value })}
                />
              ))}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClient(null)}>Cancel</Button>
            <Button disabled={!editingClient?.name.trim()} onClick={() => { if (editingClient) onUpdateClient({ ...editingClient, name: editingClient.name.trim() }); setEditingClient(null); }}>Save Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  );
}

export function PrecisionFeedback({
  projects,
  onViewProject,
}: {
  projects: WorkItem[];
  onViewProject: (project: WorkItem) => void;
}) {
  const [filter, setFilter] = useState<"All" | "Review" | "Revision">("All");
  const [selectedId, setSelectedId] = useState("");
  const reduceMotion = useHydratedReducedMotion();
  const queue = useMemo(() => projects
    .filter((project) => review(project) || (active(project) && /client|approval/i.test(project.notes)))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [projects]);
  const visibleQueue = useMemo(() => queue.filter((project) => {
    if (filter === "Revision") return project.status === "Revision";
    if (filter === "Review") return project.status !== "Revision";
    return true;
  }), [filter, queue]);
  const deliveredCount = projects.filter(delivered).length;
  const revisionCount = projects.filter((project) => project.status === "Revision").length;
  const selected = visibleQueue.find((project) => project.id === selectedId) ?? visibleQueue[0] ?? null;

  useEffect(() => {
    if (!visibleQueue.some((project) => project.id === selectedId)) {
      setSelectedId(visibleQueue[0]?.id ?? "");
    }
  }, [selectedId, visibleQueue]);

  return (
    <WorkspacePage family="master-detail">
      <PageHeader eyebrow="Client review" title="Feedback" description="Track review notes, revisions, and approval state without losing production context." />
      <PageContent>
      <MetricStrip columns={3}>
        <MetricItem label="Awaiting review" value={queue.length} icon={<MessageSquareText className="size-4" />} />
        <MetricItem label="Revisions" value={revisionCount} icon={<Clock3 className="size-4" />} />
        <MetricItem label="Delivered" value={deliveredCount} icon={<CheckCircle2 className="size-4" />} />
      </MetricStrip>
      <MasterDetail
        variant="detail-rail"
        master={(
        <ContentSection
          title="Review Queue"
          description="Active work requiring client or editor attention."
          bodyMode="flush"
          actions={(
          <div className="flex items-center gap-1" role="group" aria-label="Filter review queue">
            {(["All", "Review", "Revision"] as const).map((option) => {
              const count = option === "All"
                ? queue.length
                : queue.filter((project) => option === "Revision" ? project.status === "Revision" : project.status !== "Revision").length;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                  className={cn(
                    "h-7 rounded-md px-2.5 text-[10px] font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-highlight)]",
                    filter === option && "bg-[var(--app-active)] text-[var(--app-highlight)]",
                  )}
                >
                  {option} <span className="ml-1 tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
          )}
        >
        <span className="sr-only" aria-live="polite">{visibleQueue.length} {filter.toLowerCase()} queue items shown</span>
        <div className="border-t border-[var(--app-border)]">
          <AnimatePresence mode="wait" initial={false}>
            {visibleQueue.length ? (
              <motion.div
                key={filter}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
                className="divide-y divide-[var(--app-border)]"
              >
                {visibleQueue.map((project, index) => (
                  <motion.button
                    key={project.id}
                    type="button"
                    initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduceMotion ? { duration: 0 } : { ...revealTransition, delay: Math.min(index * 0.03, 0.18) }}
                    whileTap={reduceMotion ? undefined : { scale: 0.996 }}
                    aria-pressed={selected?.id === project.id}
                    className={cn(
                      "grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-[var(--app-hover)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-highlight)] sm:grid-cols-[minmax(0,1fr)_150px_120px_auto] sm:items-center",
                      selected?.id === project.id && "bg-[var(--app-active)] shadow-[inset_2px_0_var(--app-highlight)]",
                    )}
                    onClick={() => setSelectedId(project.id)}
                    onDoubleClick={() => onViewProject(project)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) onViewProject(project);
                    }}
                  >
                <span className="min-w-0"><span className="block truncate text-[13px] font-semibold">{project.title}</span><span className="mt-1 block truncate text-[11px] text-[var(--app-muted)]">{project.client || project.workType} · {project.notes || "No review note"}</span></span>
                <span className="text-[11px] text-[var(--app-muted)]">Due {formatDate(project.dueDate)}</span>
                <Badge variant="outline" className={cn("h-5 w-fit rounded px-1.5 text-[10px]", projectStatusTone(project.status))}>{project.status}</Badge>
                <span className="inline-flex h-7 items-center gap-1 justify-self-start rounded-md px-2 text-xs font-medium text-[var(--app-highlight)] sm:justify-self-end">Open <ArrowRight className="size-3.5" /></span>
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={`empty-${filter}`}
                initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                transition={reduceMotion ? { duration: 0 } : revealTransition}
                className="grid min-h-72 place-items-center px-5 text-center"
              >
                <div><CheckCircle2 className="mx-auto size-7 text-[var(--app-success)]" /><p className="mt-2 text-sm font-semibold">{filter === "All" ? "Review queue is clear" : `No ${filter.toLowerCase()} items`}</p><p className="mt-1 text-xs text-[var(--app-muted)]">Projects waiting for feedback or revision will appear here.</p></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </ContentSection>
        )}
        detail={(
          <ContentSection
            data-slot="review-detail"
            title={selected?.title ?? "Review context"}
            description={selected ? `${selected.client || selected.workType} · due ${formatDate(selected.dueDate)}` : "Select a queue item to inspect its review context."}
          >
            {selected ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={selected.id}
                  initial={reduceMotion ? false : { opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: -6 }}
                  transition={reduceMotion ? { duration: 0 } : revealTransition}
                  className="space-y-5"
                >
                  <Badge variant="outline" className={cn("h-5 rounded px-1.5 text-[10px]", projectStatusTone(selected.status))}>{selected.status}</Badge>
                  <dl className="grid grid-cols-2 gap-4">
                    <ClientMetric label="Client" value={selected.client || "No client"} />
                    <ClientMetric label="Work type" value={selected.workType} />
                  </dl>
                  <div className="border-t border-[var(--app-border)] pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--app-muted)]">Latest review note</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--app-ink)]">{selected.notes || "No review note has been recorded yet."}</p>
                  </div>
                  <div className="border-t border-[var(--app-border)] pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--app-muted)]">Review history</p>
                    <div className="mt-3 space-y-3">
                      <div className="flex gap-3 text-xs">
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--app-highlight)]" />
                        <div><p className="font-medium">{selected.status === "Revision" ? "Revision requested" : "Review requested"}</p><p className="mt-0.5 text-[11px] text-[var(--app-muted)]">Current production stage</p></div>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--app-border)]" />
                        <div><p className="font-medium">Project prepared for feedback</p><p className="mt-0.5 text-[11px] text-[var(--app-muted)]">Open the project for files and comments</p></div>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => onViewProject(selected)}>
                    Open review workspace <ArrowRight className="size-4" />
                  </Button>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="grid min-h-56 place-items-center text-center">
                <div><MessageSquareText className="mx-auto size-7 text-[var(--app-muted)]" /><p className="mt-2 text-sm font-semibold">Select a review item</p><p className="mt-1 text-xs text-[var(--app-muted)]">Revision notes and project context will appear here.</p></div>
              </div>
            )}
          </ContentSection>
        )}
      />
      </PageContent>
    </WorkspacePage>
  );
}

export function PrecisionReports({
  projects,
  salaryBatches,
  settings,
  editors,
  currentUserId,
  canManageFinance,
  onUpdateBatchPayment,
}: {
  projects: WorkItem[];
  salaryBatches: SalaryBatch[];
  settings: SettingsState;
  editors: Array<{ userId: string; name: string }>;
  currentUserId?: string;
  canManageFinance: boolean;
  onUpdateBatchPayment: (batchId: string, paid: boolean) => void;
}) {
  const [trendRange, setTrendRange] = useState<3 | 6 | "all">(6);
  const [period, setPeriod] = useState<PayoutPeriod>("all");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const reduceMotion = useHydratedReducedMotion();
  const reportProjects = useMemo(
    () => canManageFinance ? projects : projects.map((project) => ({ ...project, earnings: 0, paid: false, paidDate: "" })),
    [canManageFinance, projects],
  );
  const reportBatches = useMemo(
    () => canManageFinance ? salaryBatches : salaryBatches.map((batch) => ({ ...batch, amount: 0, paid: false, paidDate: "" })),
    [canManageFinance, salaryBatches],
  );
  const report = useMemo(() => buildPayoutReport({
    projects: reportProjects,
    salaryBatches: reportBatches,
    salaryWorkType: settings.salaryWorkType,
    salaryBatchAmount: Number(settings.salaryBatchAmount) || 0,
    profileName: settings.profileName,
    editors,
    currentUserId,
    period,
    customRange,
  }), [currentUserId, customRange, editors, period, reportBatches, reportProjects, settings.profileName, settings.salaryBatchAmount, settings.salaryWorkType]);
  const salaryEdits = report.deliveredProjects.filter((project) => project.isSalaryEdit).length;
  const priorRange = priorDateRange(report.periodStart, report.periodEnd);
  const priorReport = useMemo(() => priorRange ? buildPayoutReport({
    projects: reportProjects,
    salaryBatches: reportBatches,
    salaryWorkType: settings.salaryWorkType,
    salaryBatchAmount: Number(settings.salaryBatchAmount) || 0,
    profileName: settings.profileName,
    editors,
    currentUserId,
    period: "custom",
    customRange: priorRange,
  }) : null, [currentUserId, editors, priorRange, reportBatches, reportProjects, settings.profileName, settings.salaryBatchAmount, settings.salaryWorkType]);
  const deliveredIds = new Set(report.deliveredProjects.map((project) => project.id));
  const completedProjects = reportProjects.filter((project) => deliveredIds.has(project.id));
  const outputCount = completedProjects.reduce((total, project) => total + (project.templateDeliverables?.length ?? 0), 0);
  const turnaroundProjects = completedProjects.filter((project) => project.startDate && project.completedAt);
  const averageTurnaround = turnaroundProjects.length
    ? Math.round(turnaroundProjects.reduce((total, project) => total + Math.max(0, (new Date(project.completedAt!).getTime() - new Date(`${project.startDate}T00:00:00`).getTime()) / 86_400_000), 0) / turnaroundProjects.length)
    : 0;
  const delayedStages = projects.filter((project) => active(project) && project.dueDate && project.dueDate < new Date().toISOString().slice(0, 10)).length;
  const invoiceDrafts = useMemo(() => buildInvoiceDrafts({
    projects: reportProjects,
    salaryWorkType: settings.salaryWorkType,
    currencyCode: settings.currencyCode,
    period,
    customRange,
  }), [customRange, period, reportProjects, settings.currencyCode, settings.salaryWorkType]);
  const trendSeries = useMemo(() => {
    const map = new Map<string, { label: string; earned: number; delivered: number }>();
    const addPoint = (dateValue: string, earned: number, deliveredCount: number) => {
      const date = new Date(`${dateValue}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const existing = map.get(key) ?? {
        label: new Intl.DateTimeFormat("en", { month: "short" }).format(date),
        earned: 0,
        delivered: 0,
      };
      existing.earned += earned;
      existing.delivered += deliveredCount;
      map.set(key, existing);
    };
    for (const project of report.deliveredProjects) addPoint(project.date, project.amount, 1);
    for (const batch of report.batches) addPoint(batch.date, batch.amount, 0);
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
  }, [report.batches, report.deliveredProjects]);
  const trendData = trendRange === "all" ? trendSeries : trendSeries.slice(-trendRange);

  const mixData = useMemo(() => {
    const map = new Map<string, number>();
    for (const project of report.deliveredProjects) map.set(project.workType, (map.get(project.workType) ?? 0) + 1);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [report.deliveredProjects]);
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  const editorSummary = report.editors.length
    ? report.editors.map((editor) => ({
      userId: editor.id,
      name: editor.name,
      delivered: editor.deliveredProjects,
      value: editor.totalEarnings,
    }))
    : [{ userId: "workspace", name: settings.profileName || "Workspace owner", delivered: 0, value: 0 }];

  function downloadCsv(csv: string, fileName: string) {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportReport() {
    downloadCsv(payoutReportToCsv(report, settings.currencyCode), `cutlab-payout-report-${period}.csv`);
  }

  function exportInvoiceDrafts() {
    downloadCsv(invoiceDraftsToCsv(invoiceDrafts), `cutlab-invoice-drafts-${period}.csv`);
  }

  return (
    <WorkspacePage family="data-index">
      <PageHeader
        eyebrow="Performance"
        title="Reports"
        description="Earnings, delivery throughput, work mix, and salary batch payout state."
        actions={(
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as PayoutPeriod)}>
            <SelectTrigger className="h-8 w-[138px] text-xs" aria-label="Payout period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="quarter">This quarter</SelectItem>
              <SelectItem value="year">This year</SelectItem>
              <SelectItem value="custom">Custom dates</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8" onClick={exportReport} disabled={!canManageFinance}>
            <Download /> Export CSV
          </Button>
        </div>
        )}
      />
      <PageContent>
      {period === "custom" ? (
        <div className="flex flex-wrap gap-2" aria-label="Custom report dates">
          <Input type="date" aria-label="Report start date" value={customRange.start} onChange={(event) => setCustomRange((range) => ({ ...range, start: event.target.value }))} />
          <Input type="date" aria-label="Report end date" value={customRange.end} onChange={(event) => setCustomRange((range) => ({ ...range, end: event.target.value }))} />
        </div>
      ) : null}
      <MetricStrip columns={4}>
        <MetricItem label="Earned" value={canManageFinance ? money(report.earned, settings.currencyCode) : "Restricted"} supporting={priorReport && canManageFinance ? `${money(report.earned - priorReport.earned, settings.currencyCode)} vs prior period` : "Delivered project and batch value"} icon={<CircleDollarSign className="size-4" />} />
        <MetricItem label="Collected" value={canManageFinance ? money(report.collected, settings.currencyCode) : "Restricted"} supporting="Delivered and paid" icon={<CircleDollarSign className="size-4" />} />
        <MetricItem label="Outstanding" value={canManageFinance ? money(report.outstanding, settings.currencyCode) : "Restricted"} supporting="Delivered and unpaid" icon={<Clock3 className="size-4" />} />
        <MetricItem label="Delivered edits" value={String(report.deliveredProjects.length)} supporting={`${salaryEdits} salary edits`} icon={<CheckCircle2 className="size-4" />} />
      </MetricStrip>

      <ContentSection title="Period summary" description="Completed work, linked outputs, turnaround, and delayed active stages.">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ClientMetric label="Completed projects" value={String(report.deliveredProjects.length)} />
          <ClientMetric label="Linked outputs" value={String(outputCount)} />
          <ClientMetric label="Avg turnaround" value={turnaroundProjects.length ? `${averageTurnaround} days` : "No data"} />
          <ClientMetric label="Stage delays" value={String(delayedStages)} />
        </dl>
      </ContentSection>

      <ContentSection title="Client totals" description="Delivered value split by payment state." bodyMode="flush">
        <div className="divide-y divide-[var(--app-border)] border-t border-[var(--app-border)]">
          {report.clients.map((client) => (
            <div key={client.id} className="grid grid-cols-[minmax(0,1fr)_repeat(3,auto)] gap-4 px-4 py-3 text-xs">
              <span className="truncate font-semibold">{client.name}</span>
              <span>{client.deliveredProjects} projects</span>
              <span>{canManageFinance ? money(client.collected, settings.currencyCode) : "Restricted"}</span>
              <span>{canManageFinance ? money(client.outstanding, settings.currencyCode) : "Restricted"}</span>
            </div>
          ))}
          {!report.clients.length ? <div className="grid min-h-24 place-items-center text-xs text-[var(--app-muted)]">No client totals for this period.</div> : null}
        </div>
      </ContentSection>

      <SplitPane
        primary={(
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { ...revealTransition, delay: 0.08 }}
          className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><h2 className="text-sm font-semibold">Delivery and earnings trend</h2><p className="mt-0.5 text-[10px] text-[var(--app-muted)]">Delivered value and salary batches grouped by month.</p></div>
            <div className="flex items-center gap-1" role="group" aria-label="Earnings trend range">
              {([
                { value: 3 as const, label: "3M" },
                { value: 6 as const, label: "6M" },
                { value: "all" as const, label: "All" },
              ]).map((option) => (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={trendRange === option.value}
                  onClick={() => setTrendRange(option.value)}
                  className={cn(
                    "h-7 rounded-md px-2.5 text-[10px] font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-highlight)]",
                    trendRange === option.value && "bg-[var(--app-active)] text-[var(--app-highlight)]",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <motion.div
            key={trendRange}
            role="img"
            aria-label={`Earnings trend for ${trendData.length} months. ${trendData.map((item) => `${item.label}: ${money(item.earned, settings.currencyCode)}`).join(", ")}`}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className="mt-4 h-[260px]"
          >
            {trendData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="report-earned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--app-chart-grid)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--app-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--app-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ChartTooltip contentStyle={{ background: "var(--app-panel)", border: "1px solid var(--app-border)", borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="earned" stroke="var(--chart-1)" strokeWidth={2} fill="url(#report-earned)" isAnimationActive={!reduceMotion} animationDuration={420} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-xs text-[var(--app-muted)]">Delivered projects will create the earnings trend.</div>
            )}
          </motion.div>
          <p className="mt-3 rounded-md bg-[var(--app-soft-panel)] px-3 py-2 text-[11px] leading-4 text-[var(--app-muted)]" aria-label="Earnings trend summary">
            {trendData.length
              ? `${trendData.reduce((sum, item) => sum + item.delivered, 0)} delivered edits generated ${money(trendData.reduce((sum, item) => sum + item.earned, 0), settings.currencyCode)} across ${trendData.length} month${trendData.length === 1 ? "" : "s"}.`
              : "No delivery data is available for this period yet."}
          </p>
        </motion.section>
        )}
        secondary={(
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { ...revealTransition, delay: 0.12 }}
          className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-4"
        >
          <div><h2 className="text-sm font-semibold">Work mix</h2><p className="mt-0.5 text-[10px] text-[var(--app-muted)]">Distribution across project types.</p></div>
          <div className="mt-3 h-[190px]" role="img" aria-label={mixData.length ? `Work mix: ${mixData.map((item) => `${item.name}, ${item.value} projects`).join("; ")}` : "No work mix data available"}>
            {mixData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mixData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={74} paddingAngle={2} isAnimationActive={!reduceMotion} animationDuration={420}>
                    {mixData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                  </Pie>
                  <ChartTooltip contentStyle={{ background: "var(--app-panel)", border: "1px solid var(--app-border)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="grid h-full place-items-center rounded-md border border-dashed border-[var(--app-border)] px-4 text-center text-xs text-[var(--app-muted)]">Delivered projects will build this breakdown.</div>}
          </div>
          <div className="space-y-2">
            {mixData.map((item, index) => (
              <div key={item.name} className="flex items-center text-[11px]"><span className="mr-2 size-2 rounded-full" style={{ background: colors[index % colors.length] }} /><span className="truncate">{item.name}</span><span className="ml-auto font-semibold">{item.value}</span></div>
            ))}
          </div>
        </motion.section>
        )}
      />

      <ContentSection title="Invoice drafts" description="Local CSV drafts for delivered client projects. Payment collection still requires a trusted payment provider." bodyMode="flush" actions={<Button variant="outline" size="sm" className="h-8" onClick={exportInvoiceDrafts} disabled={!invoiceDrafts.length}><Download /> Export invoices</Button>}>
        <div className="overflow-x-auto border-t border-[var(--app-border)]">
          <table className="w-full min-w-[760px] border-collapse">
            <thead><tr className="bg-[var(--app-soft-panel)] text-left text-[10px] font-semibold uppercase text-[var(--app-subtle)]"><th className="h-8 px-4">Draft</th><th className="px-4">Client</th><th className="px-4">Projects</th><th className="px-4">Due</th><th className="px-4 text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {invoiceDrafts.map((draft) => (
                <tr key={draft.id} className="h-12 text-xs transition-colors hover:bg-[var(--app-hover)]">
                  <td className="px-4 font-semibold">{draft.invoiceNumber}</td>
                  <td className="px-4 text-[var(--app-muted)]">{draft.client}</td>
                  <td className="px-4">{draft.lineItems.length}</td>
                  <td className="px-4 text-[var(--app-muted)]">{formatDate(draft.dueDate)}</td>
                  <td className="px-4 text-right font-semibold">{money(draft.total, settings.currencyCode)}</td>
                </tr>
              ))}
              {!invoiceDrafts.length ? <tr><td colSpan={5} className="h-28 text-center text-xs text-[var(--app-muted)]">Delivered freelance projects with client names and positive earnings will appear here.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </ContentSection>
      <ContentSection title="Salary Batch Ledger" description="Completed edit batches and payout status." metadata={<span className="text-[11px] text-muted-foreground">{report.batches.length} batches</span>} bodyMode="flush">
        <div className="overflow-x-auto border-t border-[var(--app-border)]">
          <table className="w-full min-w-[720px] border-collapse">
            <thead><tr className="bg-[var(--app-soft-panel)] text-left text-[10px] font-semibold uppercase text-[var(--app-subtle)]"><th className="h-8 px-4">Batch</th><th className="px-4">Completed</th><th className="px-4">Edits</th><th className="px-4">Amount</th><th className="px-4">Payment</th><th className="px-4 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {report.batches.map((batch) => (
                <tr key={batch.id} className="h-12 text-xs transition-colors hover:bg-[var(--app-hover)]">
                  <td className="px-4 font-semibold">Batch #{batch.number}</td>
                  <td className="px-4 text-[var(--app-muted)]">{batch.date ? formatDate(batch.date) : "Pending"}</td>
                  <td className="px-4">{settings.salaryBatchSize}</td>
                  <td className="px-4 font-medium">{money(batch.amount, settings.currencyCode)}</td>
                  <td className="px-4"><Badge variant="outline" className={cn("h-5 rounded px-1.5 text-[10px]", paymentStatusTone(batch.paid))}>{batch.paid ? "Paid" : "Unpaid"}</Badge></td>
                  <td className="px-4 text-right"><Button variant="ghost" size="sm" className="h-7 text-xs" aria-label={`${batch.paid ? "Mark unpaid" : "Mark paid"} for batch ${batch.number}`} onClick={() => onUpdateBatchPayment(batch.id, !batch.paid)}>{batch.paid ? "Mark unpaid" : "Mark paid"}</Button></td>
                </tr>
              ))}
              {!report.batches.length ? <tr><td colSpan={6} className="h-32 text-center text-xs text-[var(--app-muted)]">Completed salary batches will appear here automatically.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </ContentSection>

      <SplitPane
        ratio="balanced"
        primary={(
        <ContentSection title="Editor Summary" description="Delivered work attributed to workspace editors." metadata={<span className="text-[11px] text-muted-foreground">{editorSummary.length} editors</span>} bodyMode="flush">
          <div className="divide-y divide-[var(--app-border)] border-t border-[var(--app-border)]">
            {editorSummary.map((editor) => (
              <div key={editor.userId} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-8 place-items-center rounded-full bg-[var(--app-active)] text-[10px] font-semibold text-[var(--app-highlight)]">
                  {editor.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
                </span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{editor.name}</span><span className="mt-0.5 block text-[10px] text-[var(--app-muted)]">{editor.delivered} delivered edits</span></span>
                <span className="text-xs font-semibold">{money(editor.value, settings.currencyCode)}</span>
              </div>
            ))}
          </div>
        </ContentSection>
        )}
        secondary={(
        <ContentSection title="Delivered Projects" description="Most recently completed editing work." metadata={<span className="text-[11px] text-muted-foreground">{report.deliveredProjects.length} projects</span>} bodyMode="flush">
          <div className="divide-y divide-[var(--app-border)] border-t border-[var(--app-border)]">
            {report.deliveredProjects.slice(0, 6).map((project) => (
              <div key={project.id} className="grid grid-cols-[minmax(0,1fr)_100px_auto] items-center gap-3 px-4 py-3">
                <span className="min-w-0"><span className="block truncate text-xs font-semibold">{project.title}</span><span className="mt-0.5 block truncate text-[10px] text-[var(--app-muted)]">{project.editorName} · {project.workType}</span></span>
                <span className="text-[10px] text-[var(--app-muted)]">{formatDate(project.date)}</span>
                <span className="text-xs font-semibold">{project.isSalaryEdit ? "Batch" : money(project.amount, settings.currencyCode)}</span>
              </div>
            ))}
            {!report.deliveredProjects.length ? <div className="grid min-h-28 place-items-center text-xs text-[var(--app-muted)]">Delivered projects will appear here.</div> : null}
          </div>
        </ContentSection>
        )}
      />
      </PageContent>
    </WorkspacePage>
  );
}

function ClientMetric({ label, value }: { label: string; value: string }) {
  return <div className="px-4 py-3"><p className="text-[9px] font-semibold uppercase text-[var(--app-subtle)]">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}
