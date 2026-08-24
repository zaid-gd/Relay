import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrecisionProjects } from "./precision-projects";
import { sampleStudioSettings } from "@/lib/sample-studio";

const ownerRole: "Owner" = "Owner";

const baseProps = {
  settings: sampleStudioSettings,
  personalProjects: [],
  teamProjects: [],
  currentUserId: "owner",
  currentUserRole: ownerRole,
  teamMembers: [],
  onNewProject: () => undefined,
  onViewProject: () => undefined,
  onEditProject: () => undefined,
  onArchiveProject: () => undefined,
  onDeleteProject: () => undefined,
  canCreateProjects: true,
  canCreateTeamProjects: false,
  canEditProjects: true,
  canDeleteProject: () => true,
  onManageProjectGroups: () => undefined,
};

describe("Projects directory public states", () => {
  it("renders its table contract and empty action", () => {
    const html = renderToStaticMarkup(<PrecisionProjects {...baseProps} />);
    expect(html).toContain("Project library");
    expect(html).toContain("No projects in this workspace");
    expect(html).toContain("Create project");
  });

  it("renders loading and error states", () => {
    expect(renderToStaticMarkup(<PrecisionProjects {...baseProps} loading />)).toContain("Loading projects");
    expect(renderToStaticMarkup(<PrecisionProjects {...baseProps} error="Projects failed to load." />)).toContain("Projects failed to load.");
  });
});
