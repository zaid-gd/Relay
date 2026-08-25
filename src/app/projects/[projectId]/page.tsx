import { TrackerApp } from "../../tracker-app";

export default async function ProjectRoute({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ view?: string | string[] }> }) {
  const { projectId } = await params;
  const { view } = await searchParams;
  return <TrackerApp page="project" projectId={projectId} projectView={Array.isArray(view) ? view[0] : view} />;
}
