/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setupProject() {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "project-files-rebuild",
      assigneeUserIds: [],
      profileId: "video-editing",
      title: "Project Files",
      clientId: "client-a",
      archived: false,
      status: "In Progress",
      workflowStageId: "planned",
      workflowStages: [{ id: "planned", label: "Planned", purpose: "planned" }],
      workType: "Freelance",
      startDate: "2026-08-24",
      dueDate: "2026-09-01",
      earnings: 0,
      paid: false,
      notes: "",
      createdAt: "2026-08-24T00:00:00.000Z",
      updatedAt: "2026-08-24T00:00:00.000Z",
    }),
  );
  return {
    t,
    owner: t.withIdentity({ tokenIdentifier: "owner", name: "Owner" }),
  };
}

test("Project files validate uploads, retain quota, and require archive before deletion", async () => {
  const { owner, t } = await setupProject();
  const validFile = {
    projectId: "project-files-rebuild",
    category: "Deliverable" as const,
    title: "Final export",
    description: "Client handoff",
    status: "approved" as const,
    clientVisible: true,
    downloadable: true,
    provider: "google_drive" as const,
    externalUrl: "https://drive.google.com/file/final-export",
    fileName: "final-export.pdf",
    mimeType: "application/pdf",
    size: 1024,
    notes: "",
  };

  await expect(owner.mutation(api.projectFiles.saveExternalVersion, {
    ...validFile,
    fileName: "final-export.exe",
    mimeType: "application/octet-stream",
  })).rejects.toThrow("Only PDF");
  await expect(owner.mutation(api.projectFiles.saveExternalVersion, {
    ...validFile,
    size: 20 * 1024 * 1024 + 1,
  })).rejects.toThrow("20 MB or smaller");

  const fileId = await owner.mutation(api.projectFiles.saveExternalVersion, validFile);
  const listed = await owner.query(api.projectFiles.listForProject, {
    projectId: "project-files-rebuild",
  });
  expect(listed.retainedBytes).toBe(1024);
  expect(listed.files).toMatchObject([{ _id: fileId, archived: false }]);

  await expect(owner.mutation(api.projectFiles.removeFile, { fileId })).rejects.toThrow(
    "Archive this file before deleting it permanently",
  );
  await owner.mutation(api.projectFiles.archiveFile, { fileId });
  expect((await owner.query(api.projectFiles.listForProject, {
    projectId: "project-files-rebuild",
  })).files).toEqual([]);

  await owner.mutation(api.projectFiles.removeFile, { fileId });
  expect((await t.run((ctx) => ctx.db.query("projectFileVersions").collect())).length).toBe(0);
});
