import { describe, expect, it } from "vitest";
import type { WorkItem } from "@/lib/types";
import { createProjectPort } from "./project-port";
import { parseProjectStorageId } from "./project-cloud-adapter";
import { resolveProjectPermissions } from "./project-permissions";

const project = (id: string, title = id): WorkItem => ({
  id,
  profileId: "profile",
  title,
  status: "Planned",
  workType: "Freelance",
  startDate: "2026-08-27",
  dueDate: "2026-08-28",
  earnings: 0,
  notes: "",
  clientId: "client",
  client: "Old client",
});

describe("Project cloud adapter", () => {
  it("rejects malformed upload responses at the network seam", () => {
    expect(() => parseProjectStorageId({ storageId: "" })).toThrow(
      "storage ID"
    );
  });
});

describe("Project application modes", () => {
  it.each([
    ["local", false, false, true],
    ["sample", true, false, false],
    ["cloud", false, true, true],
  ] as const)(
    "applies the same permission rules in %s mode",
    (_mode, sample, teamConnected, canCreateProjects) => {
      const permissions = resolveProjectPermissions({
        sample,
        teamConnected,
        loading: false,
        unavailable: false,
        role: teamConnected ? "Owner" : undefined,
        permissions: teamConnected
          ? { createProjects: true, editProjects: true }
          : undefined,
      });
      expect(permissions.canCreateProjects).toBe(canCreateProjects);
      expect(permissions.canEditProjects).toBe(true);
    }
  );
});

describe("ProjectPort", () => {
  it("owns add, replace, update, and remove persistence operations", () => {
    let projects = [project("one")];
    const port = createProjectPort((change) => {
      projects = change(projects);
    });

    port.add(project("two"));
    port.update("one", (item) => ({ ...item, title: "Updated" }));
    port.replace(project("two", "Replaced"));
    port.renameClient("client", "New client");
    port.remove("one");

    expect(projects).toEqual([
      { ...project("two", "Replaced"), client: "New client" },
    ]);
  });
});
