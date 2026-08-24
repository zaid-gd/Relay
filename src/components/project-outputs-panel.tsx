"use client";

import { useState } from "react";
import { ExternalLink, History, Plus } from "lucide-react";
import type { WorkItem } from "@/lib/types";
import type { FileCategory } from "@/lib/domain-values";
import { useProjectOutputs } from "@/lib/project-output-data";
import type { ProjectOutput, ProjectOutputReviewState } from "@/features/project-outputs/project-output-domain";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { FieldLayout } from "./ui/field-layout";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const reviewStates: Array<{ value: ProjectOutputReviewState; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "sent_to_client", label: "Sent to Client" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "approved", label: "Approved" },
  { value: "final_delivered", label: "Final Delivered" },
];
const categories: FileCategory[] = ["Deliverable", "Reference", "Asset"];
const nextAction: Record<ProjectOutputReviewState, string> = {
  draft: "Add or send a Media Version",
  sent_to_client: "Await Client review",
  changes_requested: "Upload the requested revision",
  approved: "Deliver the approved version",
  final_delivered: "No action needed",
};

type OutputForm = { title: string; category: FileCategory; dueDate: string };
const blankOutput = (): OutputForm => ({ title: "", category: "Deliverable", dueDate: "" });

export function ProjectOutputsPanel({ project, canEdit }: { project: WorkItem; canEdit: boolean }) {
  const data = useProjectOutputs(project, canEdit);
  const [outputDialog, setOutputDialog] = useState(false);
  const [editing, setEditing] = useState<ProjectOutput | null>(null);
  const [outputForm, setOutputForm] = useState<OutputForm>(blankOutput);
  const [versionOutput, setVersionOutput] = useState<ProjectOutput | null>(null);
  const [versionUrl, setVersionUrl] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [versionNotes, setVersionNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  function openOutput(output?: ProjectOutput) {
    setEditing(output ?? null);
    setOutputForm(output ? { title: output.title, category: output.category, dueDate: output.dueDate ?? "" } : blankOutput());
    setFormError("");
    setOutputDialog(true);
  }

  async function saveOutput() {
    if (!outputForm.title.trim()) {
      setFormError("Project Output title is required.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      if (editing) {
        await data.updateOutput({ outputId: editing.id, title: outputForm.title, category: outputForm.category, dueDate: outputForm.dueDate || null });
      } else {
        await data.createOutput({ id: crypto.randomUUID(), projectId: project.id, title: outputForm.title, category: outputForm.category, dueDate: outputForm.dueDate || undefined });
      }
      setOutputDialog(false);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not save the Project Output.");
    } finally {
      setBusy(false);
    }
  }

  async function saveVersion() {
    if (!versionOutput) return;
    setBusy(true);
    setFormError("");
    try {
      await data.addMediaVersion({ id: crypto.randomUUID(), outputId: versionOutput.id, url: versionUrl, label: versionLabel, notes: versionNotes });
      setVersionOutput(null);
      setVersionUrl("");
      setVersionLabel("");
      setVersionNotes("");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not add the Media Version.");
    } finally {
      setBusy(false);
    }
  }

  async function runOutputAction(action: () => Promise<unknown>) {
    setFormError("");
    try {
      await action();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not update the Project Output.");
    }
  }

  if (data.loading) return <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading Project Outputs...</p>;

  return (
    <>
      <section aria-labelledby="project-outputs-title" className="min-h-0 overflow-y-auto pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <h2 id="project-outputs-title" className="text-base font-semibold">Project Outputs</h2>
            <p className="mt-1 text-sm text-muted-foreground">Promised results and their retained Media Version history.</p>
          </div>
          {canEdit ? <Button id="add-project-output" type="button" size="sm" onClick={() => openOutput()}><Plus aria-hidden="true" />Add Output</Button> : null}
        </div>
        {data.error ? <p role="alert" className="mt-3 text-sm text-destructive">{data.error}</p> : null}

        {data.outputs.length ? (
          <div className="divide-y divide-border">
            {data.outputs.map((output) => {
              const versions = data.versions.filter((version) => version.projectOutputId === output.id).sort((left, right) => right.versionNumber - left.versionNumber);
              const current = data.currentVersion(output);
              const unresolvedOld = data.unresolvedOldComments(output);
              return (
                <article key={output.id} className="py-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{output.title}</h3>
                        <Badge variant="outline">{output.category}</Badge>
                        <Badge variant="secondary">{reviewStates.find(({ value }) => value === output.reviewState)?.label ?? output.reviewState}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{output.dueDate ? `Due ${output.dueDate}` : "No output due date"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Next: {nextAction[output.reviewState]}</p>
                      {unresolvedOld ? <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300">{unresolvedOld} unresolved {unresolvedOld === 1 ? "Comment" : "Comments"} on older versions</p> : null}
                    </div>
                    {canEdit ? (
                      <div className="flex flex-wrap gap-2">
                        <select aria-label={`Review state for ${output.title}`} value={output.reviewState} onChange={(event) => {
                          const state = reviewStates.find(({ value }) => value === event.target.value);
                          if (state) void runOutputAction(() => data.setReviewState(output.id, state.value));
                        }} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                          {reviewStates.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}
                        </select>
                        <Button type="button" size="sm" variant="outline" onClick={() => { setVersionOutput(output); setVersionLabel(`Version ${versions.length + 1}`); setFormError(""); }}><Plus aria-hidden="true" />Media Version</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => openOutput(output)}>Edit</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => void runOutputAction(() => data.archiveOutput(output.id))}>Archive</Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 border-l pl-4">
                    {current ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Current: {current.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Version {current.versionNumber} · {current.source.provider === "external" ? "External link" : current.source.provider === "youtube" ? "YouTube" : "Vimeo"}</p>
                        </div>
                        <Button asChild type="button" size="sm" variant="outline"><a href={current.source.url} target="_blank" rel="noreferrer">Open <ExternalLink aria-hidden="true" /></a></Button>
                      </div>
                    ) : <p className="text-sm text-muted-foreground">No Media Version yet.</p>}
                    {versions.length > 1 ? (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium"><History aria-hidden="true" className="mr-2 inline size-4" />Version history ({versions.length})</summary>
                        <ol className="mt-3 divide-y divide-border">
                          {versions.map((version) => <li key={version.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span>v{version.versionNumber} · {version.label}{version.id === current?.id ? " · Current" : " · Internal"}</span><a href={version.source.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open</a></li>)}
                        </ol>
                      </details>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm font-medium">No Project Outputs yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Add the first promised result for this Project.</p>
            {canEdit ? <Button type="button" className="mt-4" onClick={() => openOutput()}>Add first output</Button> : null}
          </div>
        )}
      </section>

      <Dialog open={outputDialog} onOpenChange={setOutputDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Project Output" : "Add Project Output"}</DialogTitle><DialogDescription>One promised result inside this Project.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <FieldLayout label="Title" error={formError || undefined}><Input value={outputForm.title} onChange={(event) => setOutputForm({ ...outputForm, title: event.target.value })} autoFocus /></FieldLayout>
            <FieldLayout label="Category"><select value={outputForm.category} onChange={(event) => {
              const category = categories.find((value) => value === event.target.value);
              if (category) setOutputForm({ ...outputForm, category });
            }} className="h-9 rounded-md border border-input bg-background px-3 text-sm">{categories.map((category) => <option key={category}>{category}</option>)}</select></FieldLayout>
            <FieldLayout label="Due date"><Input type="date" value={outputForm.dueDate} onChange={(event) => setOutputForm({ ...outputForm, dueDate: event.target.value })} /></FieldLayout>
          </div>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setOutputDialog(false)}>Cancel</Button><Button type="button" disabled={busy} onClick={() => void saveOutput()}>{busy ? "Saving..." : "Save Output"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(versionOutput)} onOpenChange={(open) => { if (!open) setVersionOutput(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Media Version</DialogTitle><DialogDescription>{versionOutput ? `Add the next linked version for ${versionOutput.title}.` : "Add a linked version."}</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <FieldLayout label="YouTube, Vimeo, or link" error={formError || undefined}><Input type="url" value={versionUrl} onChange={(event) => setVersionUrl(event.target.value)} placeholder="https://" autoFocus /></FieldLayout>
            <FieldLayout label="Version label"><Input value={versionLabel} onChange={(event) => setVersionLabel(event.target.value)} /></FieldLayout>
            <FieldLayout label="Internal notes"><Textarea value={versionNotes} onChange={(event) => setVersionNotes(event.target.value)} /></FieldLayout>
          </div>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setVersionOutput(null)}>Cancel</Button><Button type="button" disabled={busy} onClick={() => void saveVersion()}>{busy ? "Adding..." : "Add Media Version"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
