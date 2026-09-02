"use client";

import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function ClientHubPage() {
  const hub = useQuery(api.clientHub.getMine, {});

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/15 px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-lg font-semibold">Relay Client Hub</span>
          <UserButton />
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <p className="text-xs font-semibold tracking-[0.16em] text-amber-400 uppercase">
          Published work
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {hub
            ? `Good to see you, ${hub.contactName}`
            : "Loading your projects"}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Only projects your studio has published to you appear here.
        </p>

        <div className="mt-10 overflow-x-auto border-t border-white/20">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead className="text-xs tracking-wider text-zinc-500 uppercase">
              <tr className="border-b border-white/15">
                <th className="px-2 py-3 font-medium">Project</th>
                <th className="px-2 py-3 font-medium">Stage</th>
                <th className="px-2 py-3 font-medium">Progress</th>
                <th className="px-2 py-3 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {hub?.projects.map((project) => (
                <tr key={project.id} className="border-b border-white/10">
                  <td className="px-2 py-5 font-medium">{project.title}</td>
                  <td className="px-2 py-5 text-zinc-300">{project.status}</td>
                  <td className="px-2 py-5 text-zinc-300">
                    {project.progress}%
                  </td>
                  <td className="px-2 py-5 text-zinc-400">
                    {formatDate(project.dueDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hub && hub.projects.length === 0 ? (
            <p className="py-10 text-sm text-zinc-400">
              No projects have been published to you yet.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
