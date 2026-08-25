"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { MediaVersionComment, MediaVersionCommentsAdapter } from "./media-version-comments";

const listForProjectRef = makeFunctionReference<"query", { projectId: string }, unknown>("mediaVersionComments:listForProject");
const setResolvedRef = makeFunctionReference<"mutation", { commentId: string; resolved: boolean }, unknown>("mediaVersionComments:setResolved");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readComment(value: unknown): MediaVersionComment | undefined {
  if (!isRecord(value)) return undefined;
  const id = text(value.id);
  const mediaVersionId = text(value.mediaVersionId);
  if (!id || !mediaVersionId) return undefined;
  return {
    id,
    outputId: text(value.outputId),
    mediaVersionId,
    authorName: text(value.authorName) || "Team member",
    body: text(value.body),
    resolved: value.resolved === true,
    createdAt: text(value.createdAt),
    resolvedAt: value.resolvedAt === null ? null : text(value.resolvedAt),
  };
}

export function parseMediaVersionComments(value: unknown): MediaVersionComment[] {
  const rows = Array.isArray(value) ? value : isRecord(value) && Array.isArray(value.comments) ? value.comments : [];
  return rows.flatMap((row) => {
    const comment = readComment(row);
    return comment ? [comment] : [];
  });
}

export function useInternalMediaVersionComments(projectId: string, enabled: boolean) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const available = enabled && isAuthenticated;
  const result = useQuery(listForProjectRef, available ? { projectId } : "skip");
  const setResolvedMutation = useMutation(setResolvedRef);
  const comments = parseMediaVersionComments(result);
  const adapter: MediaVersionCommentsAdapter = {
    listForProject: async () => comments,
    setResolved: async (commentId, resolved) => {
      const updated = await setResolvedMutation({ commentId, resolved });
      const comment = readComment(updated);
      if (!comment) throw new Error("The updated comment was not returned.");
      return comment;
    },
  };
  return { comments, loading: enabled && (isLoading || (isAuthenticated && result === undefined)), adapter };
}
