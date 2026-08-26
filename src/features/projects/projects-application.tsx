"use client";

import { TrackerApp } from "@/app/tracker-app";

export function ProjectsApplication({
  projectId,
  projectView,
  sample = false,
}: {
  projectId?: string;
  projectView?: string;
  sample?: boolean;
}) {
  return (
    <TrackerApp
      page={projectId ? "project" : "projects"}
      projectId={projectId}
      projectView={projectView}
      experienceMode={sample ? "sample" : "workspace"}
    />
  );
}
