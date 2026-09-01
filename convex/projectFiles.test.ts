/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type {
  FileCategory,
  FileProvider,
  FileStatus,
} from "../src/lib/domain-values";
import {
  isValidTimecode,
  normalizeOptionalTimecode,
} from "../src/lib/timecode";

const modules = import.meta.glob("./**/*.ts");

describe("timecode validation", () => {
  test.each(["00:12", "01:05", "00:01:25"])("accepts %s", (timecode) => {
    expect(isValidTimecode(timecode)).toBe(true);
    expect(normalizeOptionalTimecode(` ${timecode} `)).toBe(timecode);
  });

  test.each(["12", "1:05", "00:60", "00:01:60", "00:1:25", "not-a-timecode"])(
    "rejects %s",
    (timecode) => {
      expect(isValidTimecode(timecode)).toBe(false);
      expect(() => normalizeOptionalTimecode(timecode)).toThrow(
        "Use MM:SS or HH:MM:SS"
      );
    }
  );

  test("allows feedback without a timecode", () => {
    expect(normalizeOptionalTimecode()).toBeUndefined();
    expect(normalizeOptionalTimecode("   ")).toBeUndefined();
  });
});

const ownerPermissions = {
  viewProjects: true,
  createProjects: true,
  editProjects: true,
  updateStatus: true,
  commentProjects: true,
  manageTeam: true,
  useChat: true,
};

const reviewerPermissions = {
  viewProjects: true,
  createProjects: false,
  editProjects: false,
  updateStatus: false,
  commentProjects: true,
  manageTeam: false,
  useChat: true,
};

const editorPermissions = {
  viewProjects: true,
  createProjects: true,
  editProjects: true,
  updateStatus: true,
  commentProjects: true,
  manageTeam: false,
  useChat: true,
};

async function setupProject(
  team = false,
  plan: "free" | "creator" | "team" = "creator"
) {
  const t = convexTest(schema, modules);
  const createdAt = new Date().toISOString();
  const workspaceId = await t.run((ctx) =>
    ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "File Team",
      inviteCode: "FILES1",
      createdAt,
    })
  );
  await t.run(async (ctx) => {
    await ctx.db.insert("teamMembers", {
      teamId: workspaceId,
      userId: "owner",
      email: "owner@example.com",
      name: "Owner User",
      role: "Owner",
      status: "active",
      permissions: ownerPermissions,
      createdAt,
      joinedAt: createdAt,
    });
    await ctx.db.insert("workspaceSubscriptions", {
      workspaceId,
      plan,
      billingPeriod: plan === "free" ? null : "monthly",
      subscriptionStatus: plan === "free" ? "free" : "active",
      confirmedEditorQuantity: team ? 2 : 1,
      includedEditorSeatQuantity: plan === "team" ? 3 : 1,
      purchasedExtraEditorSeatQuantity: 0,
      storageAddonQuantity: 0,
      reconciliationState: "synced",
      updatedAt: createdAt,
    });
  });
  if (team) {
    await t.run(async (ctx) => {
      await ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId: "editor",
        email: "editor@example.com",
        name: "Editor User",
        role: "Editor",
        status: "active",
        permissions: editorPermissions,
        createdAt,
        joinedAt: createdAt,
      });
      await ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        userId: "reviewer",
        email: "reviewer@example.com",
        name: "Review User",
        role: "Reviewer",
        status: "active",
        permissions: reviewerPermissions,
        createdAt,
        joinedAt: createdAt,
      });
    });
  }
  await t.run((ctx) =>
    ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "project-files",
      teamId: team ? workspaceId : undefined,
      assigneeUserIds: team ? ["reviewer"] : [],
      profileId: "video-editing",
      title: "Project Files",
      clientId: "client",
      archived: false,
      status: "In Progress",
      workflowStageId: "editing",
      workflowStages: [
        { id: "planned", label: "Planned", purpose: "planned" },
        { id: "editing", label: "Editing", purpose: "editing" },
        { id: "delivered", label: "Delivered", purpose: "delivered" },
      ],
      workType: "Freelance",
      startDate: "2026-06-01",
      dueDate: "2026-06-10",
      earnings: 500,
      paid: false,
      notes: "",
      createdAt,
      updatedAt: createdAt,
    })
  );
  return {
    t,
    owner: t.withIdentity({
      tokenIdentifier: "owner",
      subject: "owner",
      name: "Owner User",
      email: "owner@example.com",
      pla: "u:creator",
    }),
    editor: t.withIdentity({
      tokenIdentifier: "editor",
      subject: "editor",
      name: "Editor User",
      email: "editor@example.com",
      pla: "u:creator",
    }),
    reviewer: t.withIdentity({
      tokenIdentifier: "reviewer",
      subject: "reviewer",
      name: "Review User",
      email: "reviewer@example.com",
    }),
  };
}

describe("project file management", () => {
  test("blocks Free users from creating or saving uploads", async () => {
    const { t } = await setupProject(false, "free");
    const freeOwner = t.withIdentity({
      tokenIdentifier: "owner",
      subject: "owner",
      pla: "u:free",
    });
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["blocked"]))
    );

    await expect(
      freeOwner.mutation(api.projectFiles.generateUploadUrl, {
        projectId: "project-files",
      })
    ).rejects.toThrow("Creator or Team");
    await expect(
      freeOwner.mutation(api.projectFiles.saveStorageVersion, {
        projectId: "project-files",
        storageId,
        category: "Asset",
        title: "Blocked upload",
        description: "",
        status: "draft",
        clientVisible: false,
        downloadable: false,
        fileName: "blocked.txt",
        mimeType: "text/plain",
        notes: "",
      })
    ).rejects.toThrow("Creator or Team");
  });

  test("allows Editors to use their Workspace Creator entitlement", async () => {
    const { editor } = await setupProject(true, "creator");
    await expect(
      editor.mutation(api.projectFiles.generateUploadUrl, {
        projectId: "project-files",
      })
    ).resolves.toBeTypeOf("string");
  });

  test("allows uploads during a confirmed Creator trial", async () => {
    const { t, owner } = await setupProject(false, "creator");
    await t.run(async (ctx) => {
      const subscription = await ctx.db
        .query("workspaceSubscriptions")
        .withIndex("by_workspaceId")
        .unique();
      if (!subscription) throw new Error("Subscription missing");
      await ctx.db.patch(subscription._id, {
        subscriptionStatus: "trialing",
        trialEndsAt: "2026-09-08T00:00:00.000Z",
      });
    });

    await expect(
      owner.mutation(api.projectFiles.generateUploadUrl, {
        projectId: "project-files",
      })
    ).resolves.toBeTypeOf("string");
  });

  test("blocks new uploads after a paid Workspace becomes past due", async () => {
    const { t, owner } = await setupProject(false, "creator");
    await t.run(async (ctx) => {
      const subscription = await ctx.db
        .query("workspaceSubscriptions")
        .withIndex("by_workspaceId")
        .unique();
      if (!subscription) throw new Error("Subscription missing");
      await ctx.db.patch(subscription._id, { subscriptionStatus: "past_due" });
    });

    await expect(
      owner.mutation(api.projectFiles.generateUploadUrl, {
        projectId: "project-files",
      })
    ).rejects.toThrow("Creator or Team");
  });

  test("rejects unknown file categories, statuses, and providers", async () => {
    const { owner } = await setupProject();
    const validVersion = {
      projectId: "project-files",
      category: "Asset" as FileCategory,
      title: "Source link",
      description: "",
      status: "draft" as FileStatus,
      clientVisible: false,
      downloadable: true,
      provider: "external" as FileProvider,
      externalUrl: "https://example.com/source",
      fileName: "source",
      mimeType: "application/octet-stream",
      size: 0,
      notes: "",
    };

    await expect(
      owner.mutation(api.projectFiles.saveExternalVersion, {
        ...validVersion,
        category: "asset" as FileCategory,
      })
    ).rejects.toThrow();
    await expect(
      owner.mutation(api.projectFiles.saveExternalVersion, {
        ...validVersion,
        status: "Ready" as FileStatus,
      })
    ).rejects.toThrow();
    await expect(
      owner.mutation(api.projectFiles.saveExternalVersion, {
        ...validVersion,
        provider: "unknown_provider" as FileProvider,
      })
    ).rejects.toThrow();
  });

  test("stores categorized external files and chronological version history", async () => {
    const { owner } = await setupProject();
    const fileId = await owner.mutation(api.projectFiles.saveExternalVersion, {
      projectId: "project-files",
      category: "Reference",
      title: "Creative brief",
      description: "Approved client brief",
      status: "approved",
      clientVisible: false,
      downloadable: true,
      provider: "google_drive",
      externalUrl: "https://drive.google.com/file/reference",
      externalId: "drive-file-123",
      fileName: "creative-brief.pdf",
      mimeType: "application/pdf",
      size: 2048,
      notes: "Initial brief",
    });
    await owner.mutation(api.projectFiles.saveExternalVersion, {
      projectId: "project-files",
      projectFileId: fileId,
      category: "Reference",
      title: "Creative brief",
      description: "Approved client brief",
      status: "changes_requested",
      clientVisible: false,
      downloadable: true,
      provider: "frame_io",
      externalUrl: "https://app.frame.io/projects/reference",
      externalId: "frame-asset-456",
      fileName: "creative-brief-v2.pdf",
      mimeType: "application/pdf",
      size: 4096,
      notes: "Client annotations included",
    });

    const result = await owner.query(api.projectFiles.listForProject, {
      projectId: "project-files",
    });
    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toMatchObject({
      category: "Reference",
      title: "Creative brief",
      status: "changes_requested",
    });
    expect(
      result.files[0].versions.map((version) => version.versionNumber)
    ).toEqual([2, 1]);
    expect(result.files[0].versions.map((version) => version.status)).toEqual([
      "changes_requested",
      "approved",
    ]);
    expect(result.uploadHistory.map((version) => version.provider)).toEqual([
      "frame_io",
      "google_drive",
    ]);
  });

  test("tracks Convex upload metadata and uploader identity", async () => {
    const { t, owner } = await setupProject();
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["image-data"], { type: "image/png" }))
    );
    await owner.mutation(api.projectFiles.saveStorageVersion, {
      projectId: "project-files",
      storageId,
      category: "Asset",
      title: "Source clip",
      description: "Camera original",
      status: "draft",
      clientVisible: false,
      downloadable: true,
      fileName: "source.png",
      mimeType: "image/png",
      notes: "Uploaded from camera card",
    });

    const result = await owner.query(api.projectFiles.listForProject, {
      projectId: "project-files",
    });
    expect(result.uploadHistory[0]).toMatchObject({
      provider: "convex",
      fileName: "source.png",
      mimeType: "image/png",
      size: 10,
      uploadedByName: "Owner User",
    });
    expect(result.uploadHistory[0].url).toBeTruthy();
  });

  test("normalizes legacy file states and upgrades the latest legacy version on edit", async () => {
    const { t, owner } = await setupProject();
    const fileId = await t.run(async (ctx) => {
      const createdAt = new Date().toISOString();
      const id = await ctx.db.insert("projectFiles", {
        projectId: "project-files",
        ownerUserId: "owner",
        category: "Deliverable",
        title: "Legacy review cut",
        description: "",
        status: "In Review",
        clientVisible: true,
        downloadable: false,
        createdByUserId: "owner",
        createdByName: "Owner User",
        createdAt,
        updatedAt: createdAt,
      });
      await ctx.db.insert("projectFileVersions", {
        projectId: "project-files",
        projectFileId: id,
        versionNumber: 1,
        provider: "external",
        externalUrl: "https://example.com/legacy-review",
        fileName: "legacy-review.mp4",
        mimeType: "video/mp4",
        size: 100,
        uploadedByUserId: "owner",
        uploadedByName: "Owner User",
        uploadedAt: createdAt,
        notes: "",
      });
      return id;
    });

    const before = await owner.query(api.projectFiles.listForProject, {
      projectId: "project-files",
    });
    expect(before.files[0]).toMatchObject({ status: "sent_to_client" });
    expect(before.files[0].versions[0].status).toBe("draft");

    await owner.mutation(api.projectFiles.updateFile, {
      fileId,
      category: "Deliverable",
      title: "Legacy review cut",
      description: "",
      status: "changes_requested",
      clientVisible: true,
      downloadable: false,
    });

    const after = await owner.query(api.projectFiles.listForProject, {
      projectId: "project-files",
    });
    expect(after.files[0]).toMatchObject({ status: "changes_requested" });
    expect(after.files[0].versions[0]).toMatchObject({
      versionNumber: 1,
      status: "changes_requested",
    });
  });

  test("rejects reusing one Convex storage blob across versions", async () => {
    const { t, owner } = await setupProject();
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["shared"], { type: "text/plain" }))
    );
    const version = {
      projectId: "project-files",
      storageId,
      category: "Asset" as const,
      title: "Shared source",
      description: "",
      status: "draft" as const,
      clientVisible: false,
      downloadable: true,
      fileName: "shared.txt",
      mimeType: "text/plain",
      notes: "",
    };

    await owner.mutation(api.projectFiles.saveStorageVersion, version);
    await expect(
      owner.mutation(api.projectFiles.saveStorageVersion, {
        ...version,
        title: "Duplicate source",
      })
    ).rejects.toThrow(
      "This uploaded file is already attached to a project version"
    );
  });

  test("reviewers can view files but cannot upload, edit, or delete", async () => {
    const { t, owner, editor, reviewer } = await setupProject(true);
    const fileId = await owner.mutation(api.projectFiles.saveExternalVersion, {
      projectId: "project-files",
      category: "Asset",
      title: "Brand kit",
      description: "",
      status: "draft",
      clientVisible: false,
      downloadable: true,
      provider: "external",
      externalUrl: "https://example.com/brand-kit.zip",
      fileName: "brand-kit.zip",
      mimeType: "application/zip",
      size: 1024,
      notes: "",
    });

    expect(
      (
        await reviewer.query(api.projectFiles.listForProject, {
          projectId: "project-files",
        })
      ).files
    ).toHaveLength(1);
    await expect(
      reviewer.mutation(api.projectFiles.generateUploadUrl, {
        projectId: "project-files",
      })
    ).rejects.toThrow("Project access required");
    await expect(
      reviewer.mutation(api.projectFiles.updateFile, {
        fileId,
        category: "Asset",
        title: "Brand kit",
        description: "",
        status: "approved",
        clientVisible: false,
        downloadable: true,
      })
    ).rejects.toThrow("Project access required");
    await expect(
      reviewer.mutation(api.projectFiles.removeFile, { fileId })
    ).rejects.toThrow("Project access required");

    const portalId = await t.run(async (ctx) => {
      const now = new Date().toISOString();
      const portalId = await ctx.db.insert("clientPortals", {
        ownerUserId: "owner",
        projectId: "project-files",
        token: "reviewer-permission-portal",
        title: "Project Files",
        clientName: "Client",
        projectType: "Team",
        status: "Review",
        sourceStatus: "In Progress",
        startDate: "2026-06-01",
        dueDate: "2026-06-10",
        progress: 75,
        clientSummary: "",
        clientNotes: "",
        estimatedCompletion: "2026-06-10",
        revisionLimit: 2,
        published: true,
        createdAt: now,
        updatedAt: now,
      });
      return portalId;
    });
    await expect(
      reviewer.mutation(api.clientPortals.setAccessControls, {
        portalId,
        enabled: false,
        expiresAt: null,
      })
    ).rejects.toThrow("Project access required");
    await expect(
      reviewer.mutation(api.clientPortals.regenerateToken, {
        portalId,
      })
    ).rejects.toThrow("Project access required");
    await expect(
      reviewer.mutation(api.clientPortals.setPasswordProtection, {
        portalId,
        password: "4829",
      })
    ).rejects.toThrow("Project access required");

    await editor.mutation(api.clientPortals.setAccessControls, {
      portalId,
      enabled: false,
      expiresAt: null,
    });
    const regenerated = await editor.mutation(
      api.clientPortals.regenerateToken,
      { portalId }
    );
    expect(regenerated.token).not.toBe("reviewer-permission-portal");
    await editor.mutation(api.clientPortals.setPasswordProtection, {
      portalId,
      password: "editor-managed-code",
    });
    expect(
      (
        await editor.query(api.clientPortals.getForProject, {
          projectId: "project-files",
        })
      )?.portal.passwordProtected
    ).toBe(true);
    await editor.mutation(api.clientPortals.setPasswordProtection, {
      portalId,
      password: null,
    });
  });

  test("status updates create activity without changing version history", async () => {
    const { t, owner } = await setupProject();
    const fileId = await owner.mutation(api.projectFiles.saveExternalVersion, {
      projectId: "project-files",
      category: "Deliverable",
      title: "Review cut",
      description: "",
      status: "sent_to_client",
      clientVisible: true,
      downloadable: false,
      provider: "frame_io",
      externalUrl: "https://app.frame.io/review-cut",
      fileName: "review-cut.mp4",
      mimeType: "video/mp4",
      size: 5000,
      notes: "",
    });

    await owner.mutation(api.projectFiles.updateFile, {
      fileId,
      category: "Deliverable",
      title: "Review cut",
      description: "",
      status: "approved",
      clientVisible: true,
      downloadable: false,
    });

    const result = await owner.query(api.projectFiles.listForProject, {
      projectId: "project-files",
    });
    expect(result.files[0]).toMatchObject({ status: "approved" });
    expect(result.files[0].versions).toHaveLength(1);
    expect(result.files[0].versions[0]).toMatchObject({
      status: "approved",
      versionNumber: 1,
    });
    const activity = await t.run((ctx) =>
      ctx.db
        .query("projectActivity")
        .withIndex("by_projectId_and_createdAt", (q) =>
          q.eq("projectId", "project-files")
        )
        .order("desc")
        .take(10)
    );
    expect(
      activity.some(
        (event) =>
          event.message ===
          "Review cut approval changed from Sent to Client to Approved."
      )
    ).toBe(true);
  });

  test("legacy portal addDeliverable creates client-visible project files", async () => {
    const { t, owner } = await setupProject();
    const { token } = await owner.mutation(api.clientPortals.publish, {
      projectId: "project-files",
      clientSummary: "Client-safe summary",
      clientNotes: "Client-safe notes",
      estimatedCompletion: "2026-07-01",
      revisionLimit: 2,
      clientStage: "Review",
    });
    const editorPortal = await owner.query(api.clientPortals.getForProject, {
      projectId: "project-files",
    });
    if (!editorPortal) throw new Error("Expected editor portal");

    const result = await owner.mutation(api.clientPortals.addDeliverable, {
      portalId: editorPortal.portal._id,
      title: "Review handoff",
      detail: "Client review link",
      url: "https://example.com/review-handoff",
      status: "sent_to_client",
      downloadable: true,
    });

    expect(result.fileId).toBeTruthy();
    const files = await owner.query(api.projectFiles.listForProject, {
      projectId: "project-files",
    });
    expect(files.files).toHaveLength(1);
    expect(files.files[0]).toMatchObject({
      title: "Review handoff",
      category: "Deliverable",
      description: "Client review link",
      status: "sent_to_client",
      clientVisible: true,
      downloadable: true,
    });
    expect(files.files[0].versions[0]).toMatchObject({
      provider: "external",
      url: "https://example.com/review-handoff",
      fileName: "Review handoff",
      mimeType: "text/uri-list",
      status: "sent_to_client",
    });

    const legacyRows = await t.run((ctx) =>
      ctx.db
        .query("portalDeliverables")
        .withIndex("by_portalId_and_createdAt", (q) =>
          q.eq("portalId", editorPortal.portal._id)
        )
        .take(10)
    );
    expect(legacyRows).toHaveLength(0);

    const portal = await t.query(api.clientPortals.getByToken, { token });
    expect(portal.access).toBe("active");
    if (portal.access !== "active")
      throw new Error("Expected an active portal");
    expect(portal.deliverables).toContainEqual(
      expect.objectContaining({
        title: "Review handoff",
        detail: "Client review link",
        url: "https://example.com/review-handoff",
        status: "sent_to_client",
        downloadable: true,
      })
    );

    const activity = await t.run((ctx) =>
      ctx.db
        .query("projectActivity")
        .withIndex("by_projectId_and_createdAt", (q) =>
          q.eq("projectId", "project-files")
        )
        .order("desc")
        .take(10)
    );
    expect(
      activity.some(
        (event) =>
          event.kind === "project_file_added" &&
          event.message === "Review handoff was added to deliverable files."
      )
    ).toBe(true);
  });
  test("client portals hide drafts and expose approved and final deliverables safely", async () => {
    const { t, owner } = await setupProject();
    await owner.mutation(api.projectFiles.saveExternalVersion, {
      projectId: "project-files",
      category: "Deliverable",
      title: "Final master",
      description: "Approved 4K export",
      status: "final_delivered",
      clientVisible: true,
      downloadable: true,
      provider: "frame_io",
      externalUrl: "https://app.frame.io/final-master",
      fileName: "final-master.mp4",
      mimeType: "video/mp4",
      size: 5000,
      notes: "Internal upload note",
    });
    await owner.mutation(api.projectFiles.saveExternalVersion, {
      projectId: "project-files",
      category: "Deliverable",
      title: "Approved preview",
      description: "Client-approved preview",
      status: "approved",
      clientVisible: true,
      downloadable: false,
      provider: "frame_io",
      externalUrl: "https://app.frame.io/approved-preview",
      fileName: "approved-preview.mp4",
      mimeType: "video/mp4",
      size: 4000,
      notes: "Private approval note",
    });
    await owner.mutation(api.projectFiles.saveExternalVersion, {
      projectId: "project-files",
      category: "Deliverable",
      title: "Internal draft",
      description: "Not ready for the client",
      status: "draft",
      clientVisible: true,
      downloadable: false,
      provider: "frame_io",
      externalUrl: "https://app.frame.io/internal-draft",
      fileName: "internal-draft.mp4",
      mimeType: "video/mp4",
      size: 3000,
      notes: "Must remain private",
    });
    await owner.mutation(api.projectFiles.saveExternalVersion, {
      projectId: "project-files",
      category: "Asset",
      title: "Raw footage",
      description: "Internal only",
      status: "draft",
      clientVisible: false,
      downloadable: false,
      provider: "google_drive",
      externalUrl: "https://drive.google.com/raw-footage",
      fileName: "raw-footage",
      mimeType: "application/octet-stream",
      size: 9000,
      notes: "",
    });
    const portalId = await t.run((ctx) =>
      ctx.db.insert("clientPortals", {
        ownerUserId: "owner",
        projectId: "project-files",
        token: "portal-token",
        title: "Project Files",
        clientName: "Client",
        projectType: "Freelance",
        status: "Delivered",
        sourceStatus: "Delivered",
        startDate: "2026-06-01",
        dueDate: "2026-06-10",
        progress: 100,
        clientSummary: "",
        clientNotes: "",
        estimatedCompletion: "2026-06-10",
        revisionLimit: 2,
        published: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
    expect(portalId).toBeTruthy();
    await t.run(async (ctx) => {
      for (let index = 0; index < 50; index += 1) {
        await ctx.db.insert("projectFiles", {
          projectId: "project-files",
          ownerUserId: "owner",
          category: "Asset",
          title: `Hidden asset ${index}`,
          description: "Internal only",
          status: "Working",
          clientVisible: false,
          downloadable: false,
          createdByUserId: "owner",
          createdByName: "Owner User",
          createdAt: `2099-01-01T00:00:${String(index).padStart(2, "0")}.000Z`,
          updatedAt: `2099-01-01T00:00:${String(index).padStart(2, "0")}.000Z`,
        });
      }
    });

    const portal = await t.query(api.clientPortals.getByToken, {
      token: "portal-token",
    });
    expect(portal.access).toBe("active");
    if (portal.access !== "active")
      throw new Error("Expected an active portal");
    expect(portal.deliverables.map((item) => item.title)).toEqual([
      "Approved preview",
      "Final master",
    ]);
    expect(portal.deliverables).toContainEqual(
      expect.objectContaining({
        title: "Final master",
        detail: "Approved 4K export",
        status: "final_delivered",
        downloadable: true,
      })
    );
    expect(portal.deliverables).toContainEqual(
      expect.objectContaining({
        title: "Approved preview",
        status: "approved",
        downloadable: false,
      })
    );
    expect(
      portal.deliverables.some((item) =>
        item.detail.includes("Internal upload note")
      )
    ).toBe(false);
    expect(
      portal.deliverables.some((item) => item.title === "Internal draft")
    ).toBe(false);
    expect(
      portal.deliverables.some(
        (item) => item.title === "Legacy pending handoff"
      )
    ).toBe(false);
  });

  test("portal access controls block disabled and expired links and revision writes", async () => {
    const { owner, t } = await setupProject();
    const { token } = await owner.mutation(api.clientPortals.publish, {
      projectId: "project-files",
      clientSummary: "Client-safe summary",
      clientNotes: "Client-safe notes",
      estimatedCompletion: "2026-07-01",
      revisionLimit: 2,
      clientStage: "Review",
    });
    const editorPortal = await owner.query(api.clientPortals.getForProject, {
      projectId: "project-files",
    });
    if (!editorPortal) throw new Error("Expected editor portal");

    expect(
      (await t.query(api.clientPortals.getByToken, { token })).access
    ).toBe("active");

    await owner.mutation(api.clientPortals.setAccessControls, {
      portalId: editorPortal.portal._id,
      enabled: false,
      expiresAt: null,
    });
    expect(await t.query(api.clientPortals.getByToken, { token })).toEqual({
      access: "unavailable",
    });
    await expect(
      t.mutation(api.clientPortals.submitRevision, {
        token,
        clientName: "Client",
        message: "This must not be accepted.",
      })
    ).rejects.toThrow("Client portal unavailable");

    await owner.mutation(api.clientPortals.setAccessControls, {
      portalId: editorPortal.portal._id,
      enabled: true,
      expiresAt: "2000-01-01T00:00:00.000Z",
    });
    expect(await t.query(api.clientPortals.getByToken, { token })).toEqual({
      access: "expired",
    });
    await expect(
      t.mutation(api.clientPortals.submitRevision, {
        token,
        clientName: "Client",
        message: "Expired access must not accept feedback.",
      })
    ).rejects.toThrow("Client portal unavailable");

    await owner.mutation(api.clientPortals.setAccessControls, {
      portalId: editorPortal.portal._id,
      enabled: true,
      expiresAt: null,
    });
    expect(
      (await t.query(api.clientPortals.getByToken, { token })).access
    ).toBe("active");

    const activity = await t.run((ctx) =>
      ctx.db
        .query("projectActivity")
        .withIndex("by_projectId_and_createdAt", (q) =>
          q.eq("projectId", "project-files")
        )
        .order("desc")
        .take(20)
    );
    expect(
      activity.some((event) => event.kind === "client_portal_disabled")
    ).toBe(true);
    expect(
      activity.some((event) => event.kind === "client_portal_enabled")
    ).toBe(true);
  });

  test("regenerating a portal token invalidates the old link without losing portal data", async () => {
    const { owner, t } = await setupProject();
    const { token: oldToken } = await owner.mutation(
      api.clientPortals.publish,
      {
        projectId: "project-files",
        clientSummary: "Keep this snapshot",
        clientNotes: "Shared note",
        estimatedCompletion: "2026-07-01",
        revisionLimit: 3,
        clientStage: "In Progress",
      }
    );
    const editorPortal = await owner.query(api.clientPortals.getForProject, {
      projectId: "project-files",
    });
    if (!editorPortal) throw new Error("Expected editor portal");

    const { token: newToken } = await owner.mutation(
      api.clientPortals.regenerateToken,
      {
        portalId: editorPortal.portal._id,
      }
    );
    expect(newToken).not.toBe(oldToken);
    expect(
      await t.query(api.clientPortals.getByToken, { token: oldToken })
    ).toEqual({ access: "unavailable" });
    const activePortal = await t.query(api.clientPortals.getByToken, {
      token: newToken,
    });
    expect(activePortal.access).toBe("active");
    if (activePortal.access !== "active")
      throw new Error("Expected regenerated token to be active");
    expect(activePortal).toMatchObject({
      clientSummary: "Keep this snapshot",
      clientNotes: "Shared note",
      revisionLimit: 3,
    });

    const activity = await t.run((ctx) =>
      ctx.db
        .query("projectActivity")
        .withIndex("by_projectId_and_createdAt", (q) =>
          q.eq("projectId", "project-files")
        )
        .order("desc")
        .take(10)
    );
    expect(
      activity.some((event) => event.kind === "client_portal_token_regenerated")
    ).toBe(true);
  });

  test("optional portal password protection stores only a hash and gates all public data", async () => {
    const { owner, t } = await setupProject();
    const { token } = await owner.mutation(api.clientPortals.publish, {
      projectId: "project-files",
      clientSummary: "Protected client summary",
      clientNotes: "Protected client notes",
      estimatedCompletion: "2026-07-01",
      revisionLimit: 2,
      clientStage: "Review",
    });
    const editorPortal = await owner.query(api.clientPortals.getForProject, {
      projectId: "project-files",
    });
    if (!editorPortal) throw new Error("Expected editor portal");

    expect(
      (await t.query(api.clientPortals.getByToken, { token })).access
    ).toBe("active");
    await owner.mutation(api.clientPortals.setPasswordProtection, {
      portalId: editorPortal.portal._id,
      password: "4829-sensitive",
    });

    const stored = await t.run((ctx) => ctx.db.get(editorPortal.portal._id));
    expect(stored?.passwordHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored?.passwordSalt).toMatch(/^[0-9a-f]{32}$/);
    expect(stored?.passwordIterations).toBeGreaterThanOrEqual(100_000);
    expect(stored?.passwordHash).not.toBe("4829-sensitive");
    expect(JSON.stringify(stored)).not.toContain('"password":"4829-sensitive"');

    const editorView = await owner.query(api.clientPortals.getForProject, {
      projectId: "project-files",
    });
    expect(editorView?.portal.passwordProtected).toBe(true);
    expect(editorView?.portal).not.toHaveProperty("passwordHash");
    expect(editorView?.portal).not.toHaveProperty("passwordSalt");

    expect(await t.query(api.clientPortals.getByToken, { token })).toEqual({
      access: "locked",
    });
    expect(
      await t.query(api.clientPortals.getByToken, {
        token,
        password: "wrong-code",
      })
    ).toEqual({ access: "locked" });
    await expect(
      t.mutation(api.clientPortals.submitRevision, {
        token,
        password: "wrong-code",
        clientName: "Client",
        message: "This must stay blocked.",
      })
    ).rejects.toThrow("Client portal unavailable");

    const unlocked = await t.query(api.clientPortals.getByToken, {
      token,
      password: "4829-sensitive",
    });
    expect(unlocked.access).toBe("active");
    if (unlocked.access !== "active")
      throw new Error("Expected password-protected portal to unlock");
    expect(unlocked).toMatchObject({
      clientSummary: "Protected client summary",
      clientNotes: "Protected client notes",
    });
    expect(unlocked).not.toHaveProperty("passwordHash");
    expect(unlocked).not.toHaveProperty("passwordSalt");
    await t.mutation(api.clientPortals.submitRevision, {
      token,
      password: "4829-sensitive",
      clientName: "Client",
      message: "Authorized revision request.",
    });

    await owner.mutation(api.clientPortals.setPasswordProtection, {
      portalId: editorPortal.portal._id,
      password: "new-secure-code",
    });
    expect(
      await t.query(api.clientPortals.getByToken, {
        token,
        password: "4829-sensitive",
      })
    ).toEqual({ access: "locked" });
    expect(
      (
        await t.query(api.clientPortals.getByToken, {
          token,
          password: "new-secure-code",
        })
      ).access
    ).toBe("active");

    await owner.mutation(api.clientPortals.setPasswordProtection, {
      portalId: editorPortal.portal._id,
      password: null,
    });
    const unprotected = await t.query(api.clientPortals.getByToken, { token });
    expect(unprotected.access).toBe("active");
    const cleared = await t.run((ctx) => ctx.db.get(editorPortal.portal._id));
    expect(cleared?.passwordHash).toBeUndefined();
    expect(cleared?.passwordSalt).toBeUndefined();
    expect(cleared?.passwordIterations).toBeUndefined();
  });

  test("client revision requests honor the configured portal limit", async () => {
    const { t } = await setupProject();
    await t.run((ctx) =>
      ctx.db.insert("clientPortals", {
        ownerUserId: "owner",
        projectId: "project-files",
        token: "limited-portal",
        title: "Project Files",
        clientName: "Client",
        projectType: "Freelance",
        status: "Review",
        sourceStatus: "Review",
        startDate: "2026-06-01",
        dueDate: "2026-06-10",
        progress: 75,
        clientSummary: "",
        clientNotes: "",
        estimatedCompletion: "2026-06-10",
        revisionLimit: 1,
        published: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );

    await t.mutation(api.clientPortals.submitRevision, {
      token: "limited-portal",
      clientName: "Client",
      message: "Please adjust the opening.",
    });
    await expect(
      t.mutation(api.clientPortals.submitRevision, {
        token: "limited-portal",
        clientName: "Client",
        message: "One more change.",
      })
    ).rejects.toThrow("This portal has reached its revision request limit");
  });

  test("client revisions support optional validated timecodes and expose only client-safe fields", async () => {
    const { owner, t } = await setupProject();
    const { token } = await owner.mutation(api.clientPortals.publish, {
      projectId: "project-files",
      clientSummary: "Review the latest cut.",
      clientNotes: "Keep feedback specific.",
      estimatedCompletion: "2026-06-10",
      revisionLimit: 10,
      clientStage: "Review",
    });

    await t.mutation(api.clientPortals.submitRevision, {
      token,
      clientName: "Client",
      message: "General color note without a timestamp.",
    });
    for (const timecode of ["00:12", "01:05", "00:01:25"]) {
      await t.mutation(api.clientPortals.submitRevision, {
        token,
        clientName: "Client",
        message: `Change requested at ${timecode}.`,
        timecode,
      });
    }
    await expect(
      t.mutation(api.clientPortals.submitRevision, {
        token,
        clientName: "Client",
        message: "This invalid timestamp must not be stored.",
        timecode: "00:75",
      })
    ).rejects.toThrow("Use MM:SS or HH:MM:SS");

    const publicPortal = await t.query(api.clientPortals.getByToken, { token });
    expect(publicPortal.access).toBe("active");
    if (publicPortal.access !== "active")
      throw new Error("Expected an active portal");
    expect(publicPortal.revisions).toHaveLength(4);
    expect(publicPortal.revisions.map((revision) => revision.timecode)).toEqual(
      ["00:01:25", "01:05", "00:12", null]
    );
    for (const revision of publicPortal.revisions) {
      expect(revision).not.toHaveProperty("_id");
      expect(revision).not.toHaveProperty("portalId");
    }

    const editorPortal = await owner.query(api.clientPortals.getForProject, {
      projectId: "project-files",
    });
    expect(
      editorPortal?.revisions.some((revision) => revision.timecode === "00:12")
    ).toBe(true);
    expect(
      editorPortal?.revisions.some(
        (revision) => revision.timecode === undefined
      )
    ).toBe(true);

    const activity = await owner.query(api.projectActivity.listForProject, {
      projectId: "project-files",
    });
    expect(
      activity.some(
        (event) => event.detail === "00:12 · Change requested at 00:12."
      )
    ).toBe(true);
  });
});
