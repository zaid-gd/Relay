import type { FileCategory } from "@/lib/domain-values";

export const PROJECT_OUTPUT_REVIEW_STATES = [
  "draft",
  "sent_to_client",
  "changes_requested",
  "approved",
  "final_delivered",
] as const;
export type ProjectOutputReviewState = (typeof PROJECT_OUTPUT_REVIEW_STATES)[number];

export type MediaSource =
  | { provider: "youtube"; url: string; videoId: string; embedUrl: string }
  | { provider: "vimeo"; url: string; videoId: string; embedUrl: string }
  | { provider: "external"; url: string };

export type ProjectOutput = {
  id: string;
  projectId: string;
  title: string;
  category: FileCategory;
  reviewState: ProjectOutputReviewState;
  archived: boolean;
  dueDate?: string;
  currentVersionId?: string;
  createdAt: string;
  updatedAt: string;
  unresolvedOldVersionCommentCount?: number;
};

export type MediaVersion = {
  id: string;
  projectOutputId: string;
  versionNumber: number;
  source: MediaSource;
  label: string;
  notes: string;
  createdAt: string;
};

export type MediaVersionComment = {
  id: string;
  mediaVersionId: string;
  body: string;
  resolved: boolean;
  createdAt: string;
};

export type ProjectOutputSnapshot = {
  outputs: ProjectOutput[];
  versions: MediaVersion[];
  comments: MediaVersionComment[];
};

export type MediaUrlResult =
  | { ok: true; value: MediaSource }
  | { ok: false; error: string };

const YOUTUBE_HOSTS = new Set(["youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "player.vimeo.com"]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

function providerHost(url: URL) {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function youtubeVideoId(url: URL): string | undefined {
  const host = providerHost(url);
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean);
    return id.length === 1 && YOUTUBE_ID.test(id[0]) ? id[0] : undefined;
  }
  if (!YOUTUBE_HOSTS.has(host)) return undefined;
  const segments = url.pathname.split("/").filter(Boolean);
  const id = segments[0] === "watch"
    ? url.searchParams.get("v") ?? ""
    : ["shorts", "embed", "live"].includes(segments[0] ?? "") && segments.length === 2
      ? segments[1]
      : undefined;
  return id && YOUTUBE_ID.test(id) ? id : undefined;
}

function vimeoVideoId(url: URL): string | undefined {
  const host = providerHost(url);
  if (!VIMEO_HOSTS.has(host)) return undefined;
  const segments = url.pathname.split("/").filter(Boolean);
  const id = host === "player.vimeo.com" && segments[0] === "video" && segments.length === 2
    ? segments[1]
    : host === "vimeo.com" && segments.length === 1
      ? segments[0]
      : undefined;
  return id && VIMEO_ID.test(id) ? id : undefined;
}

/** Parses only navigable HTTP(S) URLs and turns supported providers into safe metadata. */
export function normalizeMediaUrl(input: string): MediaUrlResult {
  const value = input.trim();
  if (!value || /[\s<>"'`]/.test(value)) return { ok: false, error: "Enter a valid HTTP or HTTPS URL." };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: "Enter a valid HTTP or HTTPS URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, error: "Only HTTP and HTTPS URLs are allowed." };
  if (url.username || url.password) return { ok: false, error: "URLs with embedded credentials are not allowed." };

  const host = providerHost(url);
  const youtubeId = youtubeVideoId(url);
  if (YOUTUBE_HOSTS.has(host)) {
    if (!youtubeId) return { ok: false, error: "That YouTube URL does not contain a valid video." };
    return {
      ok: true,
      value: {
        provider: "youtube",
        videoId: youtubeId,
        url: `https://www.youtube.com/watch?v=${youtubeId}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      },
    };
  }

  const vimeoId = vimeoVideoId(url);
  if (VIMEO_HOSTS.has(host)) {
    if (!vimeoId) return { ok: false, error: "That Vimeo URL does not contain a valid video." };
    return {
      ok: true,
      value: {
        provider: "vimeo",
        videoId: vimeoId,
        url: `https://vimeo.com/${vimeoId}`,
        embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      },
    };
  }

  return { ok: true, value: { provider: "external", url: url.toString() } };
}

/**
 * Creates a new project output with default review state and validation.
 */
export function createProjectOutput(input: {
  id: string;
  projectId: string;
  title: string;
  category?: FileCategory;
  dueDate?: string;
  createdAt: string;
}): ProjectOutput {
  const title = input.title.trim();
  if (!title) throw new Error("Project Output title is required.");
  return {
    id: input.id,
    projectId: input.projectId,
    title,
    category: input.category ?? "Deliverable",
    reviewState: "draft",
    archived: false,
    ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

/**
 * Updates a project output with the provided patch, validating required fields.
 */
export function updateProjectOutput(
  output: ProjectOutput,
  patch: { title?: string; category?: FileCategory; dueDate?: string | null },
  updatedAt: string,
): ProjectOutput {
  const title = patch.title === undefined ? output.title : patch.title.trim();
  if (!title) throw new Error("Project Output title is required.");
  return {
    ...output,
    title,
    ...(patch.category ? { category: patch.category } : {}),
    ...(patch.dueDate === null ? { dueDate: undefined } : patch.dueDate ? { dueDate: patch.dueDate } : {}),
    updatedAt,
  };
}

/**
 * Updates the review state of a project output.
 */
export function setProjectOutputReviewState(
  output: ProjectOutput,
  reviewState: ProjectOutputReviewState,
  updatedAt: string,
): ProjectOutput {
  return { ...output, reviewState, updatedAt };
}

/**
 * Adds a new media version to a project output with auto-incremented version number.
 */
export function addMediaVersion(
  output: ProjectOutput,
  versions: readonly MediaVersion[],
  input: { id: string; source: MediaSource; label?: string; notes?: string; createdAt: string },
): { output: ProjectOutput; version: MediaVersion } | { error: string } {
  const outputVersions = versions.filter((version) => version.projectOutputId === output.id);
  const version: MediaVersion = {
    id: input.id,
    projectOutputId: output.id,
    versionNumber: Math.max(0, ...outputVersions.map((item) => item.versionNumber)) + 1,
    source: input.source,
    label: input.label?.trim() || `Version ${outputVersions.length + 1}`,
    notes: input.notes?.trim() ?? "",
    createdAt: input.createdAt,
  };
  return {
    version,
    output: { ...output, currentVersionId: version.id, updatedAt: input.createdAt },
  };
}

/**
 * Adds a media version by parsing and validating a URL, then creating the version.
 */
export function addMediaVersionFromUrl(
  output: ProjectOutput,
  versions: readonly MediaVersion[],
  input: { id: string; url: string; label?: string; notes?: string; createdAt: string },
): { output: ProjectOutput; version: MediaVersion } | { error: string } {
  const parsed = normalizeMediaUrl(input.url);
  if (!parsed.ok) return parsed;
  return addMediaVersion(output, versions, { ...input, source: parsed.value });
}

/**
 * Selects the current media version for an output, falling back to the latest version.
 */
export function selectCurrentMediaVersion(
  output: Pick<ProjectOutput, "currentVersionId">,
  versions: readonly MediaVersion[],
): MediaVersion | undefined {
  const selected = output.currentVersionId ? versions.find((version) => version.id === output.currentVersionId) : undefined;
  if (selected) return selected;
  return [...versions].sort((left, right) => right.versionNumber - left.versionNumber || right.createdAt.localeCompare(left.createdAt))[0];
}

/**
 * Filters comments to find unresolved comments on older versions of a project output.
 */
export function unresolvedOldVersionComments(
  output: Pick<ProjectOutput, "currentVersionId">,
  versions: readonly MediaVersion[],
  comments: readonly MediaVersionComment[],
): MediaVersionComment[] {
  const current = selectCurrentMediaVersion(output, versions);
  const currentVersionId = current?.id ?? output.currentVersionId;
  return comments.filter((comment) => !comment.resolved && comment.mediaVersionId !== currentVersionId);
}
