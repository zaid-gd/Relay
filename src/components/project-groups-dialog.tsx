"use client";

import { useMemo, useState } from "react";
import { deriveProjectGroupSummary, normalizeProjectGroup } from "@/features/projects/project-domain";
import type { Client, ProjectGroup, WorkItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ProjectGroupsDialogProps = {
  open: boolean;
  teamId?: string;
  clients: readonly Client[];
  groups: readonly ProjectGroup[];
  projects: readonly WorkItem[];
  currency: string;
  onClose: () => void;
  onChange: (groups: ProjectGroup[]) => void;
};

const money = (value: number, currency: string) => new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

export function ProjectGroupsDialog({ open, teamId, clients, groups, projects, currency, onClose, onChange }: ProjectGroupsDialogProps) {
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const visibleGroups = useMemo(() => groups.filter((group) => group.teamId === teamId), [groups, teamId]);
  const activeClients = clients.filter((client) => !client.archived);
  const editing = visibleGroups.find((group) => group.id === editingId);
  const editingHasProjects = editing ? projects.some((project) => project.projectGroupId === editing.id) : false;

  function reset() {
    setEditingId("");
    setName("");
    setClientId("");
    setNotes("");
    setError("");
  }

  function edit(group: ProjectGroup) {
    setEditingId(group.id);
    setName(group.name);
    setClientId(group.clientId);
    setNotes(group.notes);
    setError("");
  }

  function save() {
    const id = editingId || `group-${crypto.randomUUID()}`;
    const result = normalizeProjectGroup({ id, teamId, name, clientId, notes, archived: editing?.archived ?? false, createdAt: editing?.createdAt }, clients);
    if (!result.ok) {
      setError(result.errors[0] ?? "Project Group is invalid.");
      return;
    }
    onChange(editingId ? groups.map((group) => group.id === editingId ? result.value : group) : [result.value, ...groups]);
    reset();
  }

  function toggleArchive(group: ProjectGroup) {
    onChange(groups.map((item) => item.id === group.id ? { ...item, archived: !item.archived } : item));
    if (editingId === group.id) reset();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-background text-foreground sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Project Groups</DialogTitle>
          <DialogDescription>Group related Projects for one Client. Progress and money come from the Projects.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="divide-y divide-border border-y">
            {visibleGroups.length ? visibleGroups.map((group) => {
              const client = clients.find((record) => record.id === group.clientId);
              const summary = deriveProjectGroupSummary(group, projects);
              return (
                <section key={group.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="truncate text-sm font-semibold">{group.name}</h3><p className="mt-1 text-xs text-muted-foreground">{client?.name ?? "Unknown Client"}{group.archived ? " · Archived" : ""}</p></div>
                    <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => edit(group)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => toggleArchive(group)}>{group.archived ? "Restore" : "Archive"}</Button></div>
                  </div>
                  <dl className="mt-3 grid grid-cols-4 gap-2 text-xs">
                    <div><dt className="text-muted-foreground">Projects</dt><dd className="mt-1 font-semibold">{summary.projectCount}</dd></div>
                    <div><dt className="text-muted-foreground">Progress</dt><dd className="mt-1 font-semibold">{Math.round(summary.progress * 100)}%</dd></div>
                    <div><dt className="text-muted-foreground">Earned</dt><dd className="mt-1 font-semibold">{money(summary.earned, currency)}</dd></div>
                    <div><dt className="text-muted-foreground">Outstanding</dt><dd className="mt-1 font-semibold">{money(summary.outstanding, currency)}</dd></div>
                  </dl>
                </section>
              );
            }) : <p className="py-8 text-center text-sm text-muted-foreground">No Project Groups yet.</p>}
          </div>
          <div className="grid content-start gap-4 border-l pl-5">
            <h3 className="text-sm font-semibold">{editing ? "Edit Project Group" : "New Project Group"}</h3>
            <FieldLayout label="Name"><Input value={name} onChange={(event) => setName(event.target.value)} /></FieldLayout>
            <FieldLayout label="Client" description={editingHasProjects ? "The Client cannot change after Projects use this group." : undefined}>
              <Select value={clientId} disabled={editingHasProjects} onValueChange={setClientId}><SelectTrigger><SelectValue placeholder="Choose a Client" /></SelectTrigger><SelectContent>{activeClients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select>
            </FieldLayout>
            <FieldLayout label="Notes" description="Optional"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></FieldLayout>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">{editing ? <Button variant="ghost" onClick={reset}>Cancel</Button> : null}<Button onClick={save}>{editing ? "Save changes" : "Create Group"}</Button></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
