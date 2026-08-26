import { DataProvider } from "@/lib/data-context";
import { ProjectsApplication } from "@/features/projects/projects-application";

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
      <ProjectsApplication
        projectId={projectId}
        projectView={Array.isArray(view) ? view[0] : view}
        sample
      />
    </DataProvider>
  );
}
