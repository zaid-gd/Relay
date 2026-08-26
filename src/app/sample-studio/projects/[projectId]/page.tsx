import { DataProvider } from "@/lib/data-context";
import { TrackerApp } from "../../../tracker-app";

export default async function SampleProjectRoute({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { projectId } = await params;
  const { view } = await searchParams;
  return (
    <DataProvider mode="sample">
      <TrackerApp
        page="project"
        projectId={projectId}
        projectView={Array.isArray(view) ? view[0] : view}
        experienceMode="sample"
      />
    </DataProvider>
  );
}
