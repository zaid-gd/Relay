"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import {
  CheckCircle2,
  Clock3,
  Globe2,
  LoaderCircle,
  MapPin,
  Play,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { api } from "../../../../convex/_generated/api";
import { emptyStateAssets } from "../../brand-assets";

const panelClass = "rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)]";

export function PublicProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const profile = useQuery(api.publicProfiles.getBySlug, slug ? { slug } : "skip");

  if (profile === undefined) {
    return (
      <PublicShell>
        <div className="grid min-h-[70dvh] place-items-center">
          <div role="status" className="flex flex-col items-center gap-3 text-[var(--app-muted)]">
            <LoaderCircle aria-hidden="true" className="size-[30px] text-[var(--app-accent)]" />
            <p className="text-[13px]">Loading public profile...</p>
          </div>
        </div>
      </PublicShell>
    );
  }

  if (!profile) {
    return (
      <PublicShell>
        <section className={cn(panelClass, "mt-6 p-5 md:p-8")}>
          <h1 className="font-[family-name:var(--font-geist-sans)] text-[34px] font-bold">
            Profile not found
          </h1>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            This public Relay profile has not been published or the link is incorrect.
          </p>
        </section>
      </PublicShell>
    );
  }

  const turnaroundDays = Math.max(1, Math.floor(profile.avgTurnaroundDays || 3));

  return (
    <PublicShell>
      <article className={cn(panelClass, "mt-5")}>
        <header className="grid items-center gap-8 p-5 md:grid-cols-[148px_minmax(0,1fr)] md:p-8">
          <PublicAvatar name={profile.profileName} imageUrl={profile.profileImageUrl} />
          <div>
            <h1 className="text-[34px] font-bold leading-tight">
              {profile.profileName || "Relay Editor"}
            </h1>
            {profile.profileUsername ? (
              <p className="mt-1 text-sm font-bold text-[var(--app-highlight)]">
                @{profile.profileUsername}
              </p>
            ) : null}
            <p className="mt-2 text-[15px]">{profile.profileTitle || "Video Editor"}</p>
            <p className="mt-4 max-w-[420px] text-sm text-[var(--app-muted)]">
              {profile.profileBio || "Portfolio profile published from Relay."}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[var(--app-muted)]">
              {profile.profileLocation ? (
                <InfoPill icon={<MapPin />} text={profile.profileLocation} />
              ) : null}
              {profile.timeZone ? <InfoPill icon={<Globe2 />} text={profile.timeZone} /> : null}
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-3 md:col-span-2 sm:grid-cols-3">
            <ProfileMetric icon={<Play />} label="Active Projects" value={String(profile.activeProjects)} />
            <ProfileMetric
              icon={<CheckCircle2 />}
              label="Delivered Edits"
              value={String(profile.deliveredEdits)}
            />
            <ProfileMetric icon={<Clock3 />} label="Turnaround" value={`${turnaroundDays} Days`} />
          </dl>
        </header>

        <div className="border-t border-[var(--app-border)]" />

        <section className="grid items-start gap-6 p-4 md:p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <h2 className="text-[28px] font-bold leading-tight">Portfolio timeline</h2>
            <p className="mt-2 max-w-[260px] text-[13px] text-[var(--app-muted)]">
              Recent public delivery context shared from Relay.
            </p>
            <p className="mt-4 text-xs text-[var(--app-muted)]">
              Updated {formatPublicDate(profile.updatedAt.slice(0, 10))}
            </p>
          </div>

          {profile.projects.length ? (
            <ul className="space-y-3">
              {profile.projects.map((project) => {
                const progress = projectProgress(project.status);
                return (
                  <li
                    key={`${project.title}-${project.dueDate}`}
                    className="grid items-center gap-3 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-3 md:grid-cols-[minmax(0,1fr)_120px_150px]"
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold">{project.title}</p>
                      <p className="mt-1 text-xs text-[var(--app-muted)]">{project.workType}</p>
                    </div>
                    <time className="text-xs text-[var(--app-muted)]">
                      {formatPublicDate(project.dueDate)}
                    </time>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <Badge className="rounded-md border-transparent bg-[var(--app-soft-panel)] text-[11px] font-bold text-[var(--app-ink)]">
                          {project.status}
                        </Badge>
                        <span className="text-xs font-bold">{progress}%</span>
                      </div>
                      <ProgressBar value={progress} label={`${project.title} progress`} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-soft-panel)] p-6 text-center">
              <img
                src={emptyStateAssets.projects}
                alt=""
                aria-hidden="true"
                className="mx-auto mb-3 h-[126px] w-[180px] object-contain"
              />
              <p className="text-sm font-bold">No public projects shared yet</p>
              <p className="mt-1 text-xs text-[var(--app-muted)]">
                The editor can publish updated public work from their Relay profile.
              </p>
            </div>
          )}
        </section>
      </article>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[var(--app-canvas)] px-4 py-6 text-[var(--app-ink)] md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <a href="/" aria-label="Relay home" className="inline-flex items-center gap-2 text-[var(--app-ink)] no-underline">
          <span className="grid size-8 place-items-center rounded-[6px] bg-[var(--app-ink)] text-sm font-bold text-[var(--app-canvas)]">R</span>
          <span className="text-lg font-bold tracking-tight">Relay</span>
        </a>
        {children}
      </div>
    </main>
  );
}

function PublicAvatar({ name, imageUrl }: { name: string; imageUrl: string }) {
  return (
    <div className="grid size-[148px] place-items-center overflow-hidden rounded-full border border-[var(--app-border)] bg-[var(--app-avatar-surface)] text-[40px] font-bold">
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}

function ProfileMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] p-3">
      <span className="text-[var(--app-accent)] [&_svg]:size-5">{icon}</span>
      <dt className="order-3 mt-1 text-[11px] text-[var(--app-muted)]">{label}</dt>
      <dd className="order-2 mt-2 text-xl font-bold">{value}</dd>
    </div>
  );
}

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[13px] text-[var(--app-muted)]">
      <span className="text-[var(--app-accent)] [&_svg]:size-[17px]">{icon}</span>
      {text}
    </span>
  );
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const boundedValue = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={boundedValue}
      className="h-1.5 overflow-hidden rounded-full bg-[var(--app-header-panel)]"
    >
      <span
        className="block h-full rounded-full bg-[var(--app-accent)]"
        style={{ width: `${boundedValue}%` }}
      />
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "C") + (parts[1]?.[0] || "");
}

function projectProgress(status: string) {
  const normalizedStatus = status.toLowerCase();
  if (
    normalizedStatus.includes("deliver") ||
    normalizedStatus.includes("done") ||
    normalizedStatus.includes("complete")
  ) {
    return 100;
  }
  if (normalizedStatus.includes("review")) return 72;
  if (normalizedStatus.includes("progress") || normalizedStatus.includes("edit")) return 48;
  return 18;
}

function formatPublicDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
