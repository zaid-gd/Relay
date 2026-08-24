"use client";

import { CalendarClock, Check, FolderPlus, Link2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FirstRunChecklist({ mode, onCreateProject }: { mode: "local" | "account"; onCreateProject: () => void }) {
  const steps = [
    { icon: FolderPlus, title: "Create your first project", body: "Start blank or use a production template. You can adjust every field before saving." },
    { icon: CalendarClock, title: "Confirm the deadline and stage", body: "Give the team one reliable view of what is next and what is at risk." },
    { icon: Link2, title: mode === "account" ? "Share the workflow" : "Share when you are ready", body: mode === "account" ? "Invite collaborators or create a private client review link." : "Collaboration is optional. Local projects stay in this browser until you choose account sync." },
  ];

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12" aria-labelledby="first-run-title">
      <div className="rounded-[10px] border border-[var(--app-strong-border)] bg-[var(--app-panel)] p-5 shadow-[var(--app-shadow-1)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-highlight)]">Your first production</p>
        <h1 id="first-run-title" className="mt-2 max-w-2xl text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Turn one active edit into a clear production plan</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">Create a real project first. Relay will reveal the full dashboard once there is useful work to organize.</p>
        <Button className="mt-6 min-h-12 bg-[var(--app-accent)] px-5 text-white hover:bg-[var(--app-highlight)]" onClick={onCreateProject}>Create first project</Button>

        <ol className="mt-8 grid gap-3 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="rounded-lg border border-[var(--app-border)] bg-[var(--app-soft-panel)] p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-md bg-[var(--app-active)] text-[var(--app-highlight)]"><Icon className="size-4" /></span>
                  <span className="font-mono text-xs text-[var(--app-subtle)]">0{index + 1}</span>
                </div>
                <h2 className="mt-4 text-sm font-semibold">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{step.body}</p>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex flex-col gap-3 border-t border-[var(--app-border)] pt-5 text-sm text-[var(--app-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2"><LockKeyhole className="size-4" />{mode === "local" ? "Local mode stores this workspace in this browser." : "Account mode syncs supported workspace records."}</p>
          <Link className="font-semibold text-[var(--app-highlight)] hover:underline" href="/sample-studio">Explore the sample studio</Link>
        </div>
      </div>
      <p className="sr-only"><Check /> The checklist completes when your first project is saved.</p>
    </section>
  );
}
