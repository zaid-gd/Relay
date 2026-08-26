import type { WorkItem } from "@/lib/types";

export type ProjectPort = {
  add(project: WorkItem): void;
  replace(project: WorkItem): void;
  remove(projectId: string): void;
  update(projectId: string, change: (project: WorkItem) => WorkItem): void;
  renameClient(clientId: string, name: string): void;
};

export function createProjectPort(
  updateProjects: (change: (projects: WorkItem[]) => WorkItem[]) => void
): ProjectPort {
  return {
    add: (project) => updateProjects((projects) => [project, ...projects]),
    replace: (project) =>
      updateProjects((projects) =>
        projects.map((candidate) =>
          candidate.id === project.id ? project : candidate
        )
      ),
    remove: (projectId) =>
      updateProjects((projects) =>
        projects.filter((project) => project.id !== projectId)
      ),
    update: (projectId, change) =>
      updateProjects((projects) =>
        projects.map((project) =>
          project.id === projectId ? change(project) : project
        )
      ),
    renameClient: (clientId, name) =>
      updateProjects((projects) =>
        projects.map((project) =>
          project.clientId === clientId ? { ...project, client: name } : project
        )
      ),
  };
}
