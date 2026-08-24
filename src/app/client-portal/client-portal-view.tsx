"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Play,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approvalStatusLabel } from "@/lib/domain-values";
import {
  normalizeOptionalTimecode,
  TIMECODE_FORMAT_HINT,
} from "@/lib/timecode";
import { cn } from "@/lib/utils";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { emptyStateAssets } from "../brand-assets";
import { CutLabLockup } from "../cutlab-brand";

const stages = ["Planning", "In Progress", "Review", "Delivered"];
const panelClass = "rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)]";
const fieldClass =
  "border-[var(--app-border)] bg-[var(--app-control)] text-[var(--app-ink)] shadow-none placeholder:text-[var(--app-subtle)] focus-visible:border-[var(--app-accent)] focus-visible:ring-[color-mix(in_srgb,var(--app-accent)_24%,transparent)]";

export function ClientPortalView({ token }: { token: string }) {
  const [passwordInput, setPasswordInput] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const portalResult = useQuery(
    api.clientPortals.getByToken,
    token ? (portalPassword ? { token, password: portalPassword } : { token }) : "skip",
  );
  const submitRevision = useMutation(api.clientPortals.submitRevision);
  const createPortalDownloadUrl = useAction(api.r2.createPortalDownloadUrl);
  const [clientName, setClientName] = useState("");
  const [timecode, setTimecode] = useState("");
  const [request, setRequest] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "submitted">("idle");
  const [error, setError] = useState("");
  const [deliverableError, setDeliverableError] = useState("");

  async function openDeliverable(item: {
    url?: string | null;
    provider?: string;
    versionId?: Id<"projectFileVersions">;
  }) {
    setDeliverableError("");
    try {
      const url =
        item.url ??
        (item.provider === "r2" && item.versionId
          ? await createPortalDownloadUrl({
              token,
              versionId: item.versionId,
              ...(portalPassword ? { password: portalPassword } : {}),
            })
          : null);
      if (!url) throw new Error("This file is no longer available.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (caught) {
      setDeliverableError(caught instanceof Error ? caught.message : "Could not open this file.");
    }
  }

  async function submitFeedback() {
    const message = request.trim();
    if (!message || submitState === "submitting") return;
    setError("");
    try {
      const normalizedTimecode = normalizeOptionalTimecode(timecode);
      setSubmitState("submitting");
      await submitRevision({
        token,
        ...(portalPassword ? { password: portalPassword } : {}),
        clientName,
        message,
        ...(normalizedTimecode ? { timecode: normalizedTimecode } : {}),
      });
      setRequest("");
      setTimecode("");
      setSubmitState("submitted");
    } catch (caught) {
      setSubmitState("idle");
      setError(caught instanceof Error ? caught.message : "Could not submit the revision request.");
    }
  }

  if (portalResult === undefined) {
    return (
      <PortalState title="Loading project portal" body="Connecting to the latest client-facing project snapshot.">
        <span role="status" aria-label="Loading project portal">
          <LoaderCircle aria-hidden="true" className="size-7 animate-spin text-[var(--app-accent)]" />
        </span>
      </PortalState>
    );
  }

  if (portalResult.access === "unavailable") {
    return (
      <PortalState
        title="Portal link unavailable"
        body="This link may be incorrect, unpublished, or no longer active. Ask your editor for a current portal link."
      >
        <img
          src={emptyStateAssets.projects}
          alt=""
          aria-hidden="true"
          className="w-[190px]"
        />
      </PortalState>
    );
  }

  if (portalResult.access === "expired") {
    return (
      <PortalState
        title="Portal link expired"
        body="This client portal has expired. Ask your editor to extend access or send a new link."
      >
        <Clock3 aria-hidden="true" className="size-14 text-[var(--app-accent)]" />
      </PortalState>
    );
  }

  if (portalResult.access === "locked") {
    const incorrectCode = Boolean(portalPassword);
    const passwordHelpId = "portal-password-help";
    return (
      <PortalState
        title="This portal is protected"
        body="Enter the PIN or password provided by your editor to view this project."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (passwordInput) setPortalPassword(passwordInput);
          }}
          className="w-full max-w-[360px] space-y-3 text-left"
        >
          <LockKeyhole aria-hidden="true" className="mx-auto size-14 text-[var(--app-accent)]" />
          <div className="space-y-1.5">
            <label htmlFor="portal-password" className="text-sm font-medium text-[var(--app-ink)]">
              PIN or password
            </label>
            <Input
              id="portal-password"
              type="password"
              value={passwordInput}
              onChange={(event) => {
                setPasswordInput(event.target.value);
                if (portalPassword) setPortalPassword("");
              }}
              minLength={4}
              maxLength={128}
              aria-invalid={incorrectCode}
              aria-describedby={passwordHelpId}
              autoComplete="current-password"
              autoFocus
              className={fieldClass}
            />
            <p
              id={passwordHelpId}
              className={cn("text-xs text-[var(--app-muted)]", incorrectCode && "text-destructive")}
            >
              {incorrectCode
                ? "That code did not unlock the portal. Try again."
                : "Access is granted only after the code is verified."}
            </p>
          </div>
          <Button
            type="submit"
            disabled={passwordInput.length < 4}
            className="w-full bg-[var(--app-accent)] text-[var(--app-accent-foreground)] hover:bg-[var(--app-highlight)]"
          >
            Unlock Portal
          </Button>
        </form>
      </PortalState>
    );
  }

  const portal = portalResult;
  const currentStageIndex = Math.max(0, stages.indexOf(portal.status));
  const revisionsUsed = portal.revisions.length;
  const revisionsRemaining = Math.max(0, portal.revisionLimit - revisionsUsed);
  const revisionProgress = portal.revisionLimit
    ? Math.min(100, (revisionsUsed / portal.revisionLimit) * 100)
    : 0;

  return (
    <main
      data-testid="client-portal"
      className="min-h-dvh bg-[var(--app-canvas)] text-[var(--app-ink)]"
    >
      <div className="mx-auto max-w-[1280px] px-4 py-5 md:px-8 md:py-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CutLabLockup subtitle="Client Portal" />
          <div className="flex flex-wrap gap-2">
            {portalPassword ? (
              <Badge className="rounded-md border-transparent bg-[var(--app-success-bg)] text-[var(--app-success)]">
                Access granted
              </Badge>
            ) : null}
            <Badge className="rounded-md border-transparent bg-[var(--app-active)] text-[var(--app-highlight)]">
              No account required
            </Badge>
            <Badge className="rounded-md border-transparent bg-[var(--app-soft-panel)] text-[var(--app-muted)]">
              Private project link
            </Badge>
          </div>
        </header>

        <section className={cn(panelClass, "mb-5 overflow-hidden")}>
          <div className="grid lg:grid-cols-[minmax(0,1.45fr)_360px]">
            <div className="p-5 md:p-6 lg:border-r lg:border-[var(--app-border)]">
              <StatusBadge
                label={portal.status}
                tone={portal.status === "Delivered" ? "success" : "warning"}
              />
              <h1 className="mt-3 max-w-[760px] font-[family-name:var(--font-geist-sans)] text-3xl font-bold leading-[1.04] tracking-tight md:text-[44px]">
                {portal.title}
              </h1>
              <p
                className={cn(
                  "mt-3 max-w-[680px] text-sm leading-relaxed",
                  portal.clientSummary ? "text-[var(--app-muted)]" : "text-[var(--app-subtle)]",
                )}
              >
                {portal.clientSummary || "Your editor has not added a client-facing project summary yet."}
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <InfoTile label="Client" value={portal.clientName || "Client"} />
                <InfoTile label="Type" value={portal.projectType} />
                <InfoTile label="Due Date" value={formatDate(portal.dueDate)} />
                <InfoTile label="Status" value={portal.status} />
              </dl>
            </div>
            <div className="bg-[var(--app-soft-panel)] p-5 md:p-6">
              <h2 className="text-lg font-bold">Project Summary</h2>
              <div className="mt-4 space-y-3">
                <SummaryMetric icon={<Play />} label="Completion" value={`${portal.progress}%`} />
                <ProgressBar value={portal.progress} label="Project completion" className="h-[7px]" />
                <SummaryMetric
                  icon={<CheckCircle2 />}
                  label="Delivery Status"
                  value={portal.status === "Delivered" ? "Delivered" : "In production"}
                />
                <SummaryMetric icon={<Clock3 />} label="Last Updated" value={formatDateTime(portal.updatedAt)} />
                <SummaryMetric
                  icon={<CalendarDays />}
                  label="Estimated Completion"
                  value={formatDate(portal.estimatedCompletion)}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <PortalSection title="Workflow Progress" subtitle="The current production stage at a glance.">
              <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {stages.map((stage, index) => {
                  const complete = index < currentStageIndex || portal.status === "Delivered";
                  const current = index === currentStageIndex;
                  return (
                    <li
                      key={stage}
                      aria-current={current ? "step" : undefined}
                      className={cn(
                        "min-h-[98px] rounded-md border bg-[var(--app-panel)] p-3",
                        current ? "border-[var(--app-accent)]" : "border-[var(--app-border)]",
                        (complete || current) && "bg-[var(--app-active)]",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "text-[11px] font-extrabold",
                            complete || current ? "text-[var(--app-highlight)]" : "text-[var(--app-muted)]",
                          )}
                        >
                          0{index + 1}
                        </span>
                        {complete ? (
                          <CheckCircle2 aria-hidden="true" className="size-[18px] text-[var(--app-accent)]" />
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm font-bold">{stage}</p>
                      <p className="mt-1 text-xs text-[var(--app-muted)]">
                        {current ? "Current stage" : complete ? "Completed" : "Upcoming"}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </PortalSection>

            <PortalSection title="Deliverables" subtitle="Review or download files shared by your editor.">
              {portal.deliverables.length ? (
                <ul className="divide-y divide-[var(--app-border)]">
                  {portal.deliverables.map((item) => (
                    <li
                      key={`${item.title}-${item.updatedAt}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 md:grid-cols-[minmax(0,1fr)_130px_auto]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{item.title}</p>
                        <p className="mt-1 text-xs text-[var(--app-muted)]">
                          {item.detail || "Shared project file"}
                        </p>
                      </div>
                      <StatusBadge
                        label={approvalStatusLabel(item.status)}
                        tone={deliverableTone(item.status)}
                      />
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => void openDeliverable(item)}
                          aria-label={`View ${item.title}`}
                          className="border-[var(--app-border)] text-[var(--app-highlight)]"
                        >
                          <ExternalLink aria-hidden="true" />
                        </Button>
                        {item.downloadable ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => void openDeliverable(item)}
                            aria-label={`Download ${item.title}`}
                            className="border-[var(--app-border)] text-[var(--app-highlight)]"
                          >
                            <Download aria-hidden="true" />
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <PortalEmpty
                  asset="resources"
                  title="No deliverables yet"
                  body="Files will appear here as soon as your editor makes them available."
                />
              )}
              {deliverableError ? (
                <p role="alert" className="mt-3 text-xs text-destructive">
                  {deliverableError}
                </p>
              ) : null}
            </PortalSection>

            <PortalSection
              title="Revision Requests"
              subtitle="Review previous requests or submit clear, timestamped feedback."
            >
              {portal.revisions.length ? (
                <ul className="space-y-2">
                  {portal.revisions.map((item) => (
                    <li
                      key={`${item.createdAt}-${item.message}`}
                      className="rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] p-3"
                    >
                      <div className="flex justify-between gap-2">
                        <p className="text-[13px] font-bold">{item.clientName || "Client"}</p>
                        <StatusBadge
                          label={item.status}
                          tone={item.status === "Resolved" ? "success" : "warning"}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[var(--app-muted)]">{formatDateTime(item.createdAt)}</p>
                      {item.timecode ? (
                        <Badge className="mt-2 h-6 rounded-md border-transparent bg-[var(--app-active)] font-bold text-[var(--app-highlight)]">
                          <Clock3 aria-hidden="true" />
                          {item.timecode}
                        </Badge>
                      ) : null}
                      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed">{item.message}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <PortalEmpty
                  asset="feedback"
                  title="No revision requests"
                  body="Submit the first request below if anything needs to change."
                />
              )}

              <div className="my-4 border-t border-[var(--app-border)]" />

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitFeedback();
                }}
                className="space-y-3"
              >
                <Field label="Your name" htmlFor="revision-client-name">
                  <Input
                    id="revision-client-name"
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    maxLength={100}
                    className={fieldClass}
                  />
                </Field>

                <Field
                  label="Timecode (optional)"
                  htmlFor="revision-timecode"
                  help={TIMECODE_FORMAT_HINT}
                  helpId="revision-timecode-help"
                >
                  <Input
                    id="revision-timecode"
                    value={timecode}
                    onChange={(event) => {
                      setTimecode(event.target.value);
                      if (error) setError("");
                    }}
                    maxLength={8}
                    inputMode="text"
                    placeholder="00:12 or 00:01:25"
                    aria-describedby="revision-timecode-help"
                    className={fieldClass}
                  />
                </Field>

                <Field
                  label="Revision request"
                  htmlFor="revision-request"
                  help={error || `${request.length}/2000 characters`}
                  helpId="revision-request-help"
                  error={Boolean(error)}
                >
                  <textarea
                    id="revision-request"
                    value={request}
                    onChange={(event) => {
                      setRequest(event.target.value);
                      if (submitState === "submitted") setSubmitState("idle");
                      if (error) setError("");
                    }}
                    rows={4}
                    maxLength={2000}
                    placeholder="Describe the change with timestamps, file names, or visual references."
                    aria-invalid={Boolean(error)}
                    aria-describedby="revision-request-help"
                    className={cn(
                      fieldClass,
                      "min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none transition-[color,box-shadow]",
                      "focus-visible:ring-[3px]",
                      error && "border-destructive",
                    )}
                  />
                </Field>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p
                    role="status"
                    className={cn(
                      "text-xs text-[var(--app-muted)]",
                      submitState === "submitted" && "text-[var(--app-success)]",
                    )}
                  >
                    {submitState === "submitted"
                      ? "Revision request submitted."
                      : "Project management details remain read-only."}
                  </p>
                  <Button
                    type="submit"
                    disabled={!request.trim() || submitState === "submitting"}
                    className="bg-[var(--app-accent)] font-bold text-[var(--app-accent-foreground)] hover:bg-[var(--app-highlight)]"
                  >
                    <MessageSquareText aria-hidden="true" />
                    {submitState === "submitting" ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </PortalSection>
          </div>

          <aside className="space-y-4">
            <PortalSection title="Revision Allowance" subtitle="Included project revision tracking.">
              <dl className="grid grid-cols-3 gap-2">
                <MiniNumber label="Included" value={portal.revisionLimit} />
                <MiniNumber label="Used" value={revisionsUsed} />
                <MiniNumber label="Remaining" value={revisionsRemaining} />
              </dl>
              <ProgressBar value={revisionProgress} label="Revision allowance used" className="mt-3" />
            </PortalSection>

            <PortalSection title="Project Notes" subtitle="Notes intentionally shared with you.">
              {portal.clientNotes ? (
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{portal.clientNotes}</p>
              ) : (
                <PortalEmpty
                  asset="feedback"
                  title="No client notes"
                  body="Your editor has not shared any project notes yet."
                  compact
                />
              )}
            </PortalSection>

            <PortalSection title="Timeline" subtitle="Major client-visible milestones.">
              {portal.events.length ? (
                <ol className="space-y-3">
                  {[...portal.events].reverse().map((item) => (
                    <li
                      key={`${item.createdAt}-${item.title}`}
                      className="border-l-2 border-[var(--app-border)] pl-3"
                    >
                      <time className="text-xs font-bold text-[var(--app-highlight)]">
                        {formatDateTime(item.createdAt)}
                      </time>
                      <p className="mt-1 text-[13px] font-bold">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--app-muted)]">{item.body}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <PortalEmpty
                  asset="schedule"
                  title="No timeline events"
                  body="Project milestones will appear here as work moves forward."
                  compact
                />
              )}
            </PortalSection>

            <PortalSection title="Recent Activity" subtitle="Latest project updates.">
              {portal.events.length ? (
                <ul className="divide-y divide-[var(--app-border)]">
                  {portal.events.slice(0, 5).map((item) => (
                    <li key={`${item.createdAt}-${item.title}`} className="py-2">
                      <p className="text-[13px] font-bold">{item.title}</p>
                      <time className="mt-1 block text-xs text-[var(--app-muted)]">
                        {formatDateTime(item.createdAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              ) : (
                <PortalEmpty
                  asset="schedule"
                  title="No recent activity"
                  body="Updates will appear as the editor advances the project."
                  compact
                />
              )}
            </PortalSection>
          </aside>
        </div>
      </div>
    </main>
  );
}

function PortalState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--app-canvas)] px-4 text-[var(--app-ink)]">
      <section className={cn(panelClass, "w-full max-w-[620px] p-6 text-center md:p-10")}>
        <div className="mb-6 flex justify-center">
          <CutLabLockup subtitle="Client Portal" />
        </div>
        <div className="mb-4 flex justify-center">{children}</div>
        <h1 className="font-[family-name:var(--font-geist-sans)] text-[28px] font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--app-muted)]">{body}</p>
      </section>
    </main>
  );
}

function PortalSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(panelClass, "p-4")}>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mb-3 mt-1 text-xs text-[var(--app-muted)]">{subtitle}</p>
      {children}
    </section>
  );
}

function PortalEmpty({
  asset,
  title,
  body,
  compact = false,
}: {
  asset: keyof typeof emptyStateAssets;
  title: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3",
        compact ? "min-h-[90px] flex-row text-left" : "min-h-[170px] flex-col text-center",
      )}
    >
      <img
        src={emptyStateAssets[asset]}
        alt=""
        aria-hidden="true"
        className={cn("shrink-0", compact ? "w-[84px]" : "w-[130px]")}
      />
      <div>
        <p className="text-[13px] font-bold">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--app-muted)]">{body}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  help,
  helpId,
  error = false,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  helpId?: string;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {help ? (
        <p id={helpId} className={cn("text-xs text-[var(--app-muted)]", error && "text-destructive")}>
          {help}
        </p>
      ) : null}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
      <dt className="text-[10px] font-bold uppercase text-[var(--app-muted)]">{label}</dt>
      <dd className="mt-1 text-xs font-bold">{value}</dd>
    </div>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-[34px] shrink-0 place-items-center rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-accent)] [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-[var(--app-muted)]">{label}</p>
        <p className="mt-0.5 text-xs font-bold">{value}</p>
      </div>
    </div>
  );
}

function MiniNumber({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] p-2 text-center">
      <dt className="order-2 mt-1 text-[10px] text-[var(--app-muted)]">{label}</dt>
      <dd className="order-1 text-2xl font-bold leading-none">{value}</dd>
    </div>
  );
}

function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const boundedValue = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(boundedValue)}
      className={cn("h-1.5 overflow-hidden rounded-full bg-[var(--app-progress-track)]", className)}
    >
      <span
        className="block h-full rounded-full bg-[var(--app-accent)]"
        style={{ width: `${boundedValue}%` }}
      />
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "neutral";
}) {
  return (
    <Badge
      className={cn(
        "justify-self-start rounded-md border-transparent text-[11px] font-bold",
        tone === "success" && "bg-[var(--app-success-bg)] text-[var(--app-success)]",
        tone === "warning" && "bg-[var(--app-warning-bg)] text-[var(--app-warning)]",
        tone === "neutral" && "bg-[var(--app-soft-panel)] text-[var(--app-muted)]",
      )}
    >
      {label}
    </Badge>
  );
}

function deliverableTone(status: string): "success" | "warning" | "neutral" {
  if (status === "approved" || status === "final_delivered") return "success";
  if (status === "sent_to_client" || status === "changes_requested") return "warning";
  return "neutral";
}

function formatDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date)
    : value || "Not scheduled";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date)
    : "Recently";
}
