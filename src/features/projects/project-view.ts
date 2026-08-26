export type ProjectWorkspaceView =
  "overview" | "outputs" | "review" | "files" | "activity";

export function projectWorkspaceView(
  value: string | null
): ProjectWorkspaceView {
  return value === "overview" ||
    value === "review" ||
    value === "files" ||
    value === "activity"
    ? value
    : "outputs";
}

export function projectHref({
  projectId,
  view,
  sample = false,
}: {
  projectId: string;
  view?: ProjectWorkspaceView;
  sample?: boolean;
}) {
  const path = `${sample ? "/sample-studio" : ""}/projects/${encodeURIComponent(projectId)}`;
  return view ? `${path}?view=${view}` : path;
}

export type WorkspaceMemberOption = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

export type ProjectActivityEvent = {
  id: string;
  projectId: string;
  actorName: string;
  kind: string;
  message: string;
  detail?: string;
  createdAt: string;
};
