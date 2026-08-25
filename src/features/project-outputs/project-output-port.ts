import type {
  MediaVersion,
  MediaVersionComment,
  MediaSource,
  ProjectOutput,
  ProjectOutputReviewState,
  ProjectOutputSnapshot,
} from "./project-output-domain";
import { normalizeMediaUrl } from "./project-output-domain";

export type CreateProjectOutputCommand = {
  id: string;
  projectId: string;
  title: string;
  category?: ProjectOutput["category"];
  dueDate?: string;
};

export type UpdateProjectOutputCommand = {
  outputId: string;
  title?: string;
  category?: ProjectOutput["category"];
  dueDate?: string | null;
};

export type AddMediaVersionCommand = {
  id: string;
  outputId: string;
  source: MediaSource;
  label: string;
  notes: string;
};

export type ProjectOutputsPort = {
  list: (projectId: string) => Promise<ProjectOutputSnapshot>;
  createOutput: (command: CreateProjectOutputCommand & { createdAt: string }) => Promise<ProjectOutput>;
  updateOutput: (command: UpdateProjectOutputCommand & { updatedAt: string }) => Promise<ProjectOutput>;
  archiveOutput: (command: { outputId: string; archived: boolean; updatedAt: string }) => Promise<ProjectOutput>;
  setReviewState: (command: { outputId: string; reviewState: ProjectOutputReviewState; updatedAt: string }) => Promise<ProjectOutput>;
  addMediaVersion: (command: AddMediaVersionCommand & { createdAt: string }) => Promise<{ output: ProjectOutput; version: MediaVersion }>;
};

export type ProjectOutputsController = {
  list: (projectId: string) => Promise<ProjectOutputSnapshot>;
  createOutput: (command: CreateProjectOutputCommand) => Promise<ProjectOutput>;
  updateOutput: (command: UpdateProjectOutputCommand) => Promise<ProjectOutput>;
  archiveOutput: (outputId: string, archived: boolean) => Promise<ProjectOutput>;
  setReviewState: (outputId: string, reviewState: ProjectOutputReviewState) => Promise<ProjectOutput>;
  addMediaVersion: (command: { id: string; outputId: string; url: string; label?: string; notes?: string }) => Promise<{ output: ProjectOutput; version: MediaVersion }>;
};

export function createProjectOutputsController(
  port: ProjectOutputsPort,
  clock: () => string = () => new Date().toISOString(),
): ProjectOutputsController {
  return {
    list: (projectId) => port.list(projectId),
    createOutput: (command) => port.createOutput({ ...command, createdAt: clock() }),
    updateOutput: (command) => port.updateOutput({ ...command, updatedAt: clock() }),
    archiveOutput: (outputId, archived) => port.archiveOutput({ outputId, archived, updatedAt: clock() }),
    setReviewState: (outputId, reviewState) => port.setReviewState({ outputId, reviewState, updatedAt: clock() }),
    addMediaVersion: async (command) => {
      const source = normalizeMediaUrl(command.url);
      if (!source.ok) throw new Error(source.error);
      return port.addMediaVersion({
        id: command.id,
        outputId: command.outputId,
        source: source.value,
        label: command.label?.trim() || "",
        notes: command.notes?.trim() || "",
        createdAt: clock(),
      });
    },
  };
}

export type { MediaVersionComment };
