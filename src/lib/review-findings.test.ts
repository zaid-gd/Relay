import { expect, test } from "vitest";
import { projectClientName } from "./clients";
import { settingsPatch } from "./settings-persistence";
import { sampleStudioSettings } from "./sample-studio";
import { getProjectProgress } from "../features/projects/project-domain";
import {
  DEFAULT_PROJECT_TABLE_STATE,
  sortProjectTableProjects,
} from "../features/projects/project-table-domain";
import { projectWorkspaceView } from "../features/projects/project-view";
import type { WorkItem } from "./types";

const project: WorkItem = {
  id: "p",
  title: "Project",
  profileId: "video",
  clientId: sampleStudioSettings.clients[0].id,
  status: "Planned",
  workType: "Freelance",
  startDate: "2026-09-01",
  dueDate: "2026-09-12",
  earnings: 0,
  notes: "",
  workflowStageId: "plan",
  workflowStages: [
    { id: "plan", label: "Brief", purpose: "planned" },
    { id: "edit", label: "Assembly", purpose: "editing" },
    { id: "done", label: "Handoff", purpose: "delivered" },
  ],
};

test("ID-only projects and renamed clients resolve the canonical display name", () => {
  expect(projectClientName(project, sampleStudioSettings.clients)).toBe(
    "Aperture Coffee"
  );
  expect(
    projectClientName({ ...project, client: "Old name" }, [
      { ...sampleStudioSettings.clients[0], name: "New name" },
    ])
  ).toBe("New name");
  expect(projectClientName({ client: "Legacy name" }, [])).toBe("Legacy name");
});

test("custom workflow positions drive progress on every page", () => {
  expect(getProjectProgress(project)).toBe(0);
  expect(
    getProjectProgress({
      ...project,
      workflowStageId: "edit",
      status: "In Progress",
    })
  ).toBe(50);
  expect(
    getProjectProgress({
      ...project,
      workflowStageId: "done",
      status: "Delivered",
    })
  ).toBe(100);
  expect(getProjectProgress({ ...project, status: "Cancelled" })).toBe(0);
});

test("due-date sorting puts unfinished work ahead of older delivered work", () => {
  const delivered = {
    ...project,
    id: "old",
    dueDate: "2026-07-28",
    status: "Delivered" as const,
  };
  expect(
    sortProjectTableProjects(
      [delivered, project],
      DEFAULT_PROJECT_TABLE_STATE,
      {
        clients: sampleStudioSettings.clients,
        isBillableProject: () => false,
        isSalaryProject: () => false,
      }
    ).map((row) => row.id)
  ).toEqual(["p", "old"]);
});

test("settings edits send only changed preferences and client records", () => {
  const next = {
    ...sampleStudioSettings,
    theme: "Light",
    clients: sampleStudioSettings.clients.map((client, index) =>
      index ? client : { ...client, phone: "123" }
    ),
  };
  expect(settingsPatch(sampleStudioSettings, next)).toEqual({
    changes: { theme: "Light" },
    clients: [next.clients[0]],
  });
  expect(settingsPatch(next, next)).toEqual({ changes: {} });
});

test("project details default to overview and preserve explicit output navigation", () => {
  expect(projectWorkspaceView(null)).toBe("overview");
  expect(projectWorkspaceView("outputs")).toBe("outputs");
});
