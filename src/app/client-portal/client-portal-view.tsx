"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { makeFunctionReference } from "convex/server";
import { useQuery } from "convex/react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  LockKeyhole,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PublicSource = { provider: "YouTube" | "Vimeo" | "Link"; url: string };
type PublicVersion = {
  id: string;
  label: string;
  createdAt?: string;
  source: PublicSource;
};
type PublicOutput = {
  id: string;
  title: string;
  reviewState?: string;
  dueDate?: string;
  currentVersion?: PublicVersion;
};
type PublicPortal = {
  title: string;
  clientName?: string;
  summary?: string;
  notes?: string;
  startDate?: string;
  dueDate?: string;
  stage: string;
  progress: number;
  outputs: PublicOutput[];
};
type PublicAccess =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "unpublished" }
  | { kind: "closed" }
  | { kind: "expired" }
  | { kind: "pin-required"; wrongPin: boolean }
  | { kind: "active"; portal: PublicPortal };

const publicPortalRef = makeFunctionReference<
  "query",
  { token: string; pin?: string },
  unknown
>("projectPortals:getByToken");
const PUBLIC_STAGES = ["Planning", "In Progress", "Review", "Delivered"];
const reviewLabels: Record<string, string> = {
  draft: "In progress",
  sent_to_client: "Ready for review",
  changes_requested: "Changes requested",
  approved: "Approved",
  final_delivered: "Delivered",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
function safeUrl(value: unknown) {
  const raw = text(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function readPublicPortalAccess(value: unknown): PublicAccess {
  if (!isRecord(value)) return { kind: "invalid" };
  const access = text(value.access) ?? text(value.status);
  if (access === "unpublished") return { kind: "unpublished" };
  if (access === "closed" || access === "unavailable" || access === "denied")
    return { kind: "closed" };
  if (access === "expired") return { kind: "expired" };
  if (
    access === "invalid_pin"
  )
    return { kind: "pin-required", wrongPin: true };
  if (
    access === "locked" ||
    access === "pin_required" ||
    access === "pin-required"
  )
    return { kind: "pin-required", wrongPin: false };
  const source = isRecord(value.portal) ? value.portal : value;
  const project = isRecord(source.project) ? source.project : source;
  const title = text(project.title) ?? text(project.name);
  const stage = normalizePublicStage(
    text(project.stage) ?? text(project.publicStage) ?? text(project.status),
  );
  if (!title) return { kind: "invalid" };
  return {
    kind: "active",
    portal: {
      title,
      clientName: text(project.clientName) ?? text(project.client),
      summary: text(project.summary) ?? text(project.clientSummary),
      notes: text(project.publicNotes) ?? text(project.clientNotes),
      startDate: text(project.startDate),
      dueDate: text(project.dueDate),
      stage,
      progress: Math.max(
        0,
        Math.min(100, number(project.progress) ?? progressForStage(stage)),
      ),
      outputs: readOutputs(project.outputs ?? source.outputs),
    },
  };
}

function readOutputs(value: unknown): PublicOutput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const title = text(item.title) ?? text(item.name);
    if (!title) return [];
    const currentValue = isRecord(item.currentVersion)
      ? item.currentVersion
      : isRecord(item.currentMediaVersion)
        ? item.currentMediaVersion
        : undefined;
    const current = currentValue
      ? readVersion(currentValue, `${index + 1}`)
      : undefined;
    return [
      {
        id: text(item.id) ?? `output-${index + 1}`,
        title,
        reviewState: safeReviewState(
          text(item.reviewState) ?? text(item.status),
        ),
        dueDate: text(item.dueDate),
        ...(current ? { currentVersion: current } : {}),
      },
    ];
  });
}

function readVersion(
  value: Record<string, unknown>,
  fallbackId: string,
): PublicVersion | undefined {
  const source = isRecord(value.source) ? value.source : value;
  const url = safeUrl(source.url);
  if (!url) return undefined;
  const providerValue = text(source.provider) ?? text(source.kind);
  const provider =
    providerValue?.toLowerCase() === "youtube"
      ? "YouTube"
      : providerValue?.toLowerCase() === "vimeo"
        ? "Vimeo"
        : "Link";
  return {
    id: text(value.id) ?? fallbackId,
    label: text(value.label) ?? text(value.title) ?? "Current version",
    createdAt: text(value.createdAt),
    source: { provider, url },
  };
}

function safeReviewState(value: string | undefined) {
  return value && value in reviewLabels ? value : undefined;
}

function normalizePublicStage(value: string | undefined) {
  const normalized = value?.trim().toLowerCase().replaceAll("_", " ");
  if (
    normalized === "in progress" ||
    normalized === "editing" ||
    normalized === "active"
  )
    return "In Progress";
  if (
    normalized === "review" ||
    normalized === "client review" ||
    normalized === "feedback"
  )
    return "Review";
  if (
    normalized === "delivered" ||
    normalized === "complete" ||
    normalized === "completed"
  )
    return "Delivered";
  return "Planning";
}

function progressForStage(stage: string) {
  const index = PUBLIC_STAGES.findIndex(
    (item) => item.toLowerCase() === stage.toLowerCase(),
  );
  return index < 0 ? 0 : Math.round((index / (PUBLIC_STAGES.length - 1)) * 100);
}
function displayStage(stage: string) {
  return (
    PUBLIC_STAGES.find((item) => item.toLowerCase() === stage.toLowerCase()) ??
    "Planning"
  );
}
function formatDate(value: string | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)
    : "Not scheduled";
}

export function ClientPortalView({ token }: { token: string }) {
  const [pinInput, setPinInput] = useState("");
  const [pin, setPin] = useState<string | undefined>();
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const publicResult = useQuery(
    publicPortalRef,
    token ? { token, ...(pin ? { pin } : {}) } : "skip",
  );

  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    const previousScheme = root.style.colorScheme;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyDeviceTheme = () => {
      root.classList.toggle("dark", media.matches);
      root.style.colorScheme = media.matches ? "dark" : "light";
    };
    applyDeviceTheme();
    media.addEventListener("change", applyDeviceTheme);
    return () => {
      media.removeEventListener("change", applyDeviceTheme);
      root.classList.toggle("dark", wasDark);
      root.style.colorScheme = previousScheme;
    };
  }, []);

  const access = useMemo<PublicAccess>(
    () =>
      publicResult === undefined
        ? { kind: "loading" }
        : readPublicPortalAccess(publicResult),
    [publicResult],
  );

  useEffect(() => {
    if (publicResult !== undefined) setPinBusy(false);
  }, [publicResult]);

  function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = pinInput.trim();
    if (value.length < 4) {
      setPinError("Enter the PIN provided by your editor.");
      return;
    }
    setPinError("");
    setPinBusy(true);
    setPin(value);
  }

  if (access.kind === "loading")
    return (
      <AccessState
        title="Loading your project"
        body="Checking the shared portal link."
      >
        <LoaderCircle className="size-7 animate-spin" aria-hidden="true" />
      </AccessState>
    );
  if (access.kind === "invalid")
    return (
      <AccessState
        title="Portal link unavailable"
        body="This link is invalid or no longer available. Ask your editor for a new link."
      />
    );
  if (access.kind === "unpublished")
    return (
      <AccessState
        title="This portal is not open yet"
        body="Ask your editor to publish the project portal before using this link."
      />
    );
  if (access.kind === "closed")
    return (
      <AccessState
        title="This portal is closed"
        body="The editor closed access to this project. Ask them to reopen it or send a new link."
      />
    );
  if (access.kind === "expired")
    return (
      <AccessState
        title="This portal has expired"
        body="Ask your editor to extend access or send a new project link."
      />
    );
  if (access.kind === "pin-required")
    return (
      <AccessState
        title="This portal is protected"
        body={access.wrongPin ? "That PIN did not unlock this portal. Try again." : "Enter the PIN shared by your editor to view this project."}
      >
        <form
          onSubmit={(event) => void unlock(event)}
          className="w-full max-w-sm space-y-3 text-left"
        >
          <label htmlFor="portal-pin" className="text-sm font-medium">
            Portal PIN
          </label>
          <Input
            id="portal-pin"
            type="password"
            value={pinInput}
            onChange={(event) => {
              setPinInput(event.target.value);
              setPin(undefined);
              setPinError("");
            }}
            minLength={4}
            maxLength={128}
            autoComplete="current-password"
            autoFocus
            aria-invalid={Boolean(pinError)}
            className="bg-background"
          />
          <p
            className={cn(
              "text-xs text-muted-foreground",
              (pinError || access.wrongPin) && "text-destructive",
            )}
            role={pinError || access.wrongPin ? "alert" : undefined}
          >
            {pinError ||
              (access.wrongPin ? "Check the PIN and try again." : null) ||
              "Your PIN is checked securely and is never shown here."}
          </p>
          <Button
            type="submit"
            disabled={pinInput.trim().length < 4 || pinBusy}
            className="w-full"
          >
            {pinBusy ? "Checking..." : "Unlock portal"}
          </Button>
        </form>
      </AccessState>
    );
  return <ActivePortal portal={access.portal} />;
}

function RelayMark() {
  return (
    <a
      href="/"
      aria-label="Relay home"
      className="inline-flex items-center gap-2 text-foreground no-underline"
    >
      <span className="grid size-8 place-items-center rounded-md bg-foreground text-sm font-bold text-background">
        R
      </span>
      <span className="text-lg font-bold tracking-tight">Relay</span>
    </a>
  );
}

function AccessState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10 text-foreground">
      <section className="w-full max-w-lg border border-border bg-card p-6 text-card-foreground sm:p-10">
        <RelayMark />
        <div className="mt-14 flex flex-col items-center text-center">
          <span
            className="grid size-14 place-items-center border border-border text-muted-foreground"
            aria-hidden="true"
          >
            {children ? (
              <LockKeyhole className="size-6" />
            ) : (
              <ShieldCheck className="size-6" />
            )}
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {body}
          </p>
          {children ? <div className="mt-8 w-full">{children}</div> : null}
        </div>
        <p className="mt-14 text-xs text-muted-foreground">
          Private project view · No account required
        </p>
      </section>
    </main>
  );
}

function ActivePortal({ portal }: { portal: PublicPortal }) {
  const currentStage = displayStage(portal.stage);
  const currentIndex = PUBLIC_STAGES.findIndex((item) => item === currentStage);
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-5">
          <RelayMark />
          <span className="text-xs font-medium text-muted-foreground">
            Client portal
          </span>
        </header>
        <section className="border-b border-border py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Shared project
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
            {portal.title}
          </h1>
          {portal.clientName ? (
            <p className="mt-3 text-sm text-muted-foreground">
              For {portal.clientName}
            </p>
          ) : null}
          {portal.summary ? (
            <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground">
              {portal.summary}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            {portal.startDate ? <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />Started {formatDate(portal.startDate)}</span> : null}
            <span className="inline-flex items-center gap-2">
              <CalendarDays
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              Due {formatDate(portal.dueDate)}
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="size-2 rounded-full bg-foreground"
                aria-hidden="true"
              />
              {currentStage}
            </span>
          </div>
        </section>
        <section
          aria-labelledby="progress-title"
          className="border-b border-border py-10"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="progress-title" className="text-lg font-semibold">
                Project progress
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A client-safe view of the current stage.
              </p>
            </div>
            <span className="text-2xl font-semibold tabular-nums">
              {portal.progress}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Project progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={portal.progress}
            className="mt-6 h-1.5 bg-muted"
          >
            <span
              className="block h-full bg-foreground"
              style={{ width: `${portal.progress}%` }}
            />
          </div>
          <ol className="mt-7 grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:gap-x-4">
            {PUBLIC_STAGES.map((stage, index) => {
              const complete = currentIndex >= 0 && index < currentIndex;
              const current = stage === currentStage;
              return (
                <li
                  key={stage}
                  aria-current={current ? "step" : undefined}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center border text-xs",
                      complete || current
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {complete ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      current ? "font-semibold" : "text-muted-foreground",
                    )}
                  >
                    {stage}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
        <section aria-labelledby="outputs-title" className="py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="outputs-title" className="text-lg font-semibold">
                Shared outputs
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Only the current version shared by your editor appears here.
              </p>
            </div>
            <Badge variant="outline">{portal.outputs.length}</Badge>
          </div>
          {portal.outputs.length ? (
            <div className="mt-6 divide-y divide-border border-y border-border">
              {portal.outputs.map((output) => (
                <PublicOutputRow key={output.id} output={output} />
              ))}
            </div>
          ) : (
            <div className="mt-6 border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No outputs have been shared yet.
            </div>
          )}
        </section>
        {portal.notes ? (
          <section
            aria-labelledby="notes-title"
            className="border-t border-border py-10"
          >
            <h2 id="notes-title" className="text-lg font-semibold">
              Notes from your editor
            </h2>
            <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {portal.notes}
            </p>
          </section>
        ) : null}
        <footer className="border-t border-border pt-5 text-xs text-muted-foreground">
          Shared securely through Relay.
        </footer>
      </div>
    </main>
  );
}

function PublicOutputRow({ output }: { output: PublicOutput }) {
  const state = output.reviewState
    ? (reviewLabels[output.reviewState] ?? output.reviewState)
    : undefined;
  return (
    <article className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <h3 className="font-semibold">{output.title}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {state ? <span>{state}</span> : null}
          {output.dueDate ? (
            <span>Due {formatDate(output.dueDate)}</span>
          ) : null}
          {output.currentVersion ? (
            <span>
              {output.currentVersion.source.provider} ·{" "}
              {output.currentVersion.label}
            </span>
          ) : null}
        </div>
      </div>
      {output.currentVersion ? (
        <a
          href={output.currentVersion.source.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open current version{" "}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      ) : (
        <span className="text-sm text-muted-foreground">
          No version shared yet
        </span>
      )}
    </article>
  );
}
