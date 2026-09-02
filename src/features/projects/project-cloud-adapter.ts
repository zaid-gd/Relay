"use client";

import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export type ProjectFileId = Id<"projectFiles">;
export type ProjectStorageId = Id<"_storage">;
export type WorkspaceStorageReservationId = Id<"workspaceStorageReservations">;

export function parseProjectStorageId(value: unknown): ProjectStorageId {
  if (
    !value ||
    typeof value !== "object" ||
    !("storageId" in value) ||
    typeof value.storageId !== "string" ||
    !value.storageId
  ) {
    throw new Error("The upload response did not include a storage ID.");
  }
  // Convex IDs are opaque strings; the server remains the authority after this boundary check.
  return value.storageId as ProjectStorageId;
}

export function useProjectActivityAdapter(projectId: string) {
  const auth = useConvexAuth();
  const events = useQuery(
    api.projectActivity.listForProject,
    auth.isAuthenticated ? { projectId } : "skip"
  );
  return { ...auth, events };
}

export function useProjectFilesAdapter(
  projectId: string,
  includeArchived: boolean
) {
  const auth = useConvexAuth();
  const files = useQuery(
    api.projectFiles.listForProject,
    auth.isAuthenticated ? { projectId, includeArchived } : "skip"
  );
  return {
    ...auth,
    files,
    generateUploadUrl: useMutation(api.projectFiles.generateUploadUrl),
    saveStorageVersion: useMutation(api.projectFiles.saveStorageVersion),
    releaseUploadReservation: useMutation(
      api.projectFiles.releaseUploadReservation
    ),
    createR2UploadUrl: useAction(api.r2.createUploadUrl),
    completeR2Upload: useAction(api.r2.completeUpload),
    createR2DownloadUrl: useAction(api.r2.createDownloadUrl),
    updateFile: useMutation(api.projectFiles.updateFile),
    archiveFile: useMutation(api.projectFiles.archiveFile),
    restoreFile: useMutation(api.projectFiles.restoreFile),
    removeFile: useMutation(api.projectFiles.removeFile),
    parseStorageId: parseProjectStorageId,
  };
}

export function useProjectCommentsAdapter(
  teamId: string | undefined,
  projectId: string
) {
  const auth = useConvexAuth();
  const comments = useQuery(
    api.team.listProjectComments,
    auth.isAuthenticated && teamId ? { teamId, projectId } : "skip"
  );
  return {
    ...auth,
    comments,
    addComment: useMutation(api.team.addProjectComment),
  };
}
