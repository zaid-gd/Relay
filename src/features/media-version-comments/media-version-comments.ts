export type MediaVersionComment = {
  id: string;
  outputId: string;
  mediaVersionId: string;
  authorName: string;
  body: string;
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string | null;
};

export type MediaVersionSummary = {
  id: string;
  outputId: string;
  versionNumber: number;
  label: string;
  current: boolean;
};

export type MediaVersionCommentsAdapter = {
  listForProject: (projectId: string) => Promise<MediaVersionComment[]>;
  setResolved: (commentId: string, resolved: boolean) => Promise<MediaVersionComment>;
};

export function commentsForVersion(
  comments: readonly MediaVersionComment[],
  mediaVersionId: string,
) {
  return comments
    .filter((comment) => comment.mediaVersionId === mediaVersionId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function unresolvedCommentsForVersion(
  comments: readonly MediaVersionComment[],
  mediaVersionId: string,
) {
  return commentsForVersion(comments, mediaVersionId).filter((comment) => !comment.resolved);
}
