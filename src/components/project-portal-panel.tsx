"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProjectOutputs } from "@/lib/project-output-data";
import type { WorkItem } from "@/lib/types";
import {
  draftFromPortal,
  useProjectPortal,
  type ProjectPortalDraft,
} from "@/features/client-portals/internal/project-portal-data";

const reviewStateLabels: Record<string, string> = {
  draft: "Draft",
  sent_to_client: "Sent to Client",
  changes_requested: "Changes Requested",
  approved: "Approved",
  final_delivered: "Final Delivered",
};

type ProjectPortalPanelProps = {
  project: WorkItem;
  canEdit: boolean;
};

export function ProjectPortalPanel({
  project,
  canEdit,
}: ProjectPortalPanelProps) {
  const outputData = useProjectOutputs(project, canEdit);
  const outputs = useMemo(() => outputData.outputs.map((output) => ({
    id: output.id,
    title: output.title,
    reviewState: output.reviewState,
    hasCurrentVersion: Boolean(outputData.currentVersion(output)),
  })), [outputData]);
  const data = useProjectPortal(project.id, canEdit);
  const [draft, setDraft] = useState<ProjectPortalDraft>(() => draftFromPortal(null));
  const [busy, setBusy] = useState<"save" | "open" | "close" | "regenerate" | "" | "copy">("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!data.loading) setDraft(data.initialDraft);
  }, [data.initialDraft, data.loading]);

  const selectedOutputs = useMemo(
    () => new Set(draft.selectedOutputIds),
    [draft.selectedOutputIds],
  );

  function updateDraft(changes: Partial<ProjectPortalDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
    setFormError("");
  }

  function toggleOutput(outputId: string) {
    const next = new Set(selectedOutputs);
    if (next.has(outputId)) next.delete(outputId);
    else next.add(outputId);
    updateDraft({ selectedOutputIds: [...next] });
  }

  async function savePortal() {
    if (draft.pinProtected && !data.portal?.hasPin && !draft.pin.trim()) {
      setFormError("Enter a PIN before protecting this portal.");
      return;
    }
    setBusy("save");
    setFormError("");
    try {
      await data.save(draft);
      setDraft((current) => ({ ...current, pin: "" }));
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not save the Client Portal.");
    } finally {
      setBusy("");
    }
  }

  async function changeOpen(open: boolean) {
    if (!data.portal) return;
    setBusy(open ? "open" : "close");
    setFormError("");
    try {
      await data.changeOpen(data.portal.id, open);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not update portal access.");
    } finally {
      setBusy("");
    }
  }

  async function regenerate() {
    if (!data.portal) return;
    setBusy("regenerate");
    setFormError("");
    try {
      await data.regenerate(data.portal.id);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not regenerate the portal link.");
    } finally {
      setBusy("");
    }
  }

  async function copyPortalLink() {
    if (!data.portal || typeof window === "undefined" || !navigator.clipboard) return;
    setBusy("copy");
    setFormError("");
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/client-portal/${data.portal.token}`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not copy the portal link.");
    } finally {
      setBusy("");
    }
  }

  const portalUrl = data.portal?.token && typeof window !== "undefined"
    ? `${window.location.origin}/client-portal/${data.portal.token}`
    : "";

  if (!data.available && !data.loading) {
    return (
      <section aria-labelledby="project-portal-title" className="border-b py-5">
        <h2 id="project-portal-title" className="text-base font-semibold">Client Portal</h2>
        <p className="mt-2 max-w-[62ch] text-sm text-muted-foreground">Client Portals require a cloud account. Local records stay private to this browser.</p>
      </section>
    );
  }

  if (data.loading) {
    return <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading Client Portal settings...</p>;
  }

  return (
    <section aria-labelledby="project-portal-title" className="min-h-0 overflow-y-auto pb-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h2 id="project-portal-title" className="text-base font-semibold">Client Portal</h2>
          <p className="mt-1 text-sm text-muted-foreground">Share current Outputs and approved Project Files through one private link.</p>
        </div>
        {data.portal ? (
          <Badge variant="outline">{data.portal.status === "open" ? "Open" : data.portal.status === "draft" ? "Draft" : "Closed"}</Badge>
        ) : (
          <Badge variant="outline">Not published</Badge>
        )}
      </div>

      {data.error || formError ? <p role="alert" className="mt-3 text-sm text-destructive">{formError || data.error}</p> : null}

      <div className="grid gap-6 py-5">
        <section className="grid gap-4 border-b pb-6" aria-labelledby="portal-link-title">
          <div>
            <h3 id="portal-link-title" className="font-medium">Private link</h3>
            <p className="mt-1 text-sm text-muted-foreground">Regenerating the link immediately invalidates the previous URL.</p>
          </div>
          {data.portal ? (
            <>
              {portalUrl ? <div className="flex flex-col gap-2 sm:flex-row">
                <Input readOnly value={portalUrl} aria-label="Client Portal link" className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={() => void copyPortalLink()} disabled={busy !== ""}>
                  {busy === "copy" ? "Copying..." : "Copy link"}
                </Button>
                {portalUrl ? <Button asChild type="button" variant="outline"><a href={portalUrl} target="_blank" rel="noreferrer">Open <ExternalLink aria-hidden="true" /></a></Button> : null}
              </div> : <p className="text-sm text-muted-foreground">This browser no longer has the bearer link. Regenerate it to create and copy a new one.</p>}
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={data.portal.status === "open" ? "outline" : "default"} onClick={() => void changeOpen(data.portal?.status !== "open")} disabled={busy !== ""}>
                    {busy === "open" ? "Opening..." : busy === "close" ? "Closing..." : data.portal.status === "open" ? "Close portal" : "Open portal"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void regenerate()} disabled={busy !== ""}>
                    <RefreshCw aria-hidden="true" />{busy === "regenerate" ? "Regenerating..." : "Regenerate link"}
                  </Button>
                </div>
              ) : null}
            </>
          ) : <p className="text-sm text-muted-foreground">Save the settings below to create a private Client Portal link.</p>}
        </section>

        <section className="grid gap-4 border-b pb-6" aria-labelledby="portal-details-title">
          <div>
            <h3 id="portal-details-title" className="font-medium">Public details</h3>
            <p className="mt-1 text-sm text-muted-foreground">These fields are client-facing. Internal Project notes and dates stay private.</p>
          </div>
          <FieldLayout label="Public notes" description={`${draft.publicNotes.length}/2000 characters`}>
            <Textarea value={draft.publicNotes} onChange={(event) => updateDraft({ publicNotes: event.target.value })} maxLength={2000} disabled={!canEdit} />
          </FieldLayout>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={draft.showStartDate} onChange={(event) => updateDraft({ showStartDate: event.target.checked })} disabled={!canEdit} className="size-4 accent-primary" />Show the Project start date</label>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={draft.showDueDate} onChange={(event) => updateDraft({ showDueDate: event.target.checked })} disabled={!canEdit} className="size-4 accent-primary" />Show the Project due date</label>
          <details className="border-l pl-4">
            <summary className="cursor-pointer text-sm font-medium">Preview portal content</summary>
            <div className="mt-4 max-w-sm space-y-3 text-sm">
              <p className="text-lg font-semibold">{project.title}</p>
              {draft.publicNotes ? <p className="whitespace-pre-wrap text-muted-foreground">{draft.publicNotes}</p> : null}
              <p className="text-muted-foreground">{[draft.showStartDate ? `Start ${project.startDate}` : "", draft.showDueDate ? `Due ${project.dueDate}` : ""].filter(Boolean).join(" · ") || "No Project dates shared"}</p>
              <p>{draft.selectedOutputIds.length} Project {draft.selectedOutputIds.length === 1 ? "Output" : "Outputs"} selected</p>
            </div>
          </details>
        </section>

        <section className="grid gap-4 border-b pb-6" aria-labelledby="portal-outputs-title">
          <div>
            <h3 id="portal-outputs-title" className="font-medium">Shared Project Outputs</h3>
            <p className="mt-1 text-sm text-muted-foreground">Only the current Media Version of selected Outputs appears in the Client Portal.</p>
          </div>
          {outputs.length ? (
            <div className="grid gap-2">
              {outputs.map((output) => (
                <label key={output.id} className="flex items-start gap-3 border-b py-3 last:border-b-0">
                  <input type="checkbox" checked={selectedOutputs.has(output.id)} onChange={() => toggleOutput(output.id)} disabled={!canEdit} className="mt-1 size-4 accent-primary" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{output.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{reviewStateLabels[output.reviewState] ?? output.reviewState}{output.hasCurrentVersion ? " · Current version ready" : " · No current version"}</span>
                  </span>
                </label>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">Add a Project Output before choosing what to share.</p>}
        </section>

        <section className="grid gap-4 border-b pb-6" aria-labelledby="portal-access-title">
          <div>
            <h3 id="portal-access-title" className="font-medium">Access controls</h3>
            <p className="mt-1 text-sm text-muted-foreground">Use a short PIN only when the link itself is not enough. The PIN is never shown again.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLayout label="Expires" description="Optional. Uses your local time.">
              <Input type="datetime-local" value={draft.expiresAt} onChange={(event) => updateDraft({ expiresAt: event.target.value })} disabled={!canEdit} />
            </FieldLayout>
            <FieldLayout label="PIN" description={draft.pinProtected ? "Leave blank to keep the current PIN." : "Optional. Four or more characters."}>
              <Input type="password" value={draft.pin} onChange={(event) => updateDraft({ pin: event.target.value })} minLength={4} maxLength={128} autoComplete="new-password" disabled={!canEdit || !draft.pinProtected && Boolean(data.portal?.hasPin)} />
            </FieldLayout>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={draft.pinProtected} onChange={(event) => updateDraft({ pinProtected: event.target.checked })} disabled={!canEdit} className="size-4 accent-primary" />
            Protect this portal with a PIN
          </label>
        </section>

        {canEdit ? <Button type="button" className="justify-self-start" onClick={() => void savePortal()} disabled={busy !== ""}>{busy === "save" ? "Saving..." : data.portal ? "Save portal settings" : "Publish portal"}</Button> : null}
        <p className="text-xs text-muted-foreground">{project.title} stays scoped to this portal. Client access never grants Workspace access.</p>
      </div>
    </section>
  );
}

export type { ProjectPortalPanelProps };
