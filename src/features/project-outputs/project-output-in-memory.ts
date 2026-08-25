import {
  addMediaVersion,
  createProjectOutput,
  setProjectOutputReviewState,
  updateProjectOutput,
  type MediaVersion,
  type MediaVersionComment,
  type ProjectOutput,
  type ProjectOutputSnapshot,
} from "./project-output-domain";
import type { ProjectOutputsPort } from "./project-output-port";

export class InMemoryProjectOutputsAdapter implements ProjectOutputsPort {
  private outputs: ProjectOutput[];
  private versions: MediaVersion[];
  private comments: MediaVersionComment[];

  constructor(initial: ProjectOutputSnapshot = { outputs: [], versions: [], comments: [] }) {
    this.outputs = initial.outputs.map((output) => ({ ...output }));
    this.versions = initial.versions.map((version) => ({ ...version, source: { ...version.source } }));
    this.comments = initial.comments.map((comment) => ({ ...comment }));
  }

  async list(projectId: string): Promise<ProjectOutputSnapshot> {
    const outputs = this.outputs.filter((output) => output.projectId === projectId);
    const outputIds = new Set(outputs.map((output) => output.id));
    return {
      outputs: outputs.map((output) => ({ ...output })),
      versions: this.versions.filter((version) => outputIds.has(version.projectOutputId)).map((version) => ({ ...version, source: { ...version.source } })),
      comments: this.comments.filter((comment) => this.versions.some((version) => outputIds.has(version.projectOutputId) && version.id === comment.mediaVersionId)).map((comment) => ({ ...comment })),
    };
  }

  async createOutput(command: Parameters<ProjectOutputsPort["createOutput"]>[0]): Promise<ProjectOutput> {
    const output = createProjectOutput(command);
    this.outputs.push(output);
    return { ...output };
  }

  async updateOutput(command: Parameters<ProjectOutputsPort["updateOutput"]>[0]): Promise<ProjectOutput> {
    const current = this.requireOutput(command.outputId);
    const output = updateProjectOutput(current, command, command.updatedAt);
    this.replaceOutput(output);
    return { ...output };
  }

  async archiveOutput(command: Parameters<ProjectOutputsPort["archiveOutput"]>[0]): Promise<ProjectOutput> {
    const output = { ...this.requireOutput(command.outputId), archived: command.archived, updatedAt: command.updatedAt };
    this.replaceOutput(output);
    return { ...output };
  }

  async setReviewState(command: Parameters<ProjectOutputsPort["setReviewState"]>[0]): Promise<ProjectOutput> {
    const output = setProjectOutputReviewState(this.requireOutput(command.outputId), command.reviewState, command.updatedAt);
    this.replaceOutput(output);
    return { ...output };
  }

  async addMediaVersion(command: Parameters<ProjectOutputsPort["addMediaVersion"]>[0]): Promise<{ output: ProjectOutput; version: MediaVersion }> {
    const output = this.requireOutput(command.outputId);
    const result = addMediaVersion(output, this.versions, command);
    if ("error" in result) throw new Error(result.error);
    this.replaceOutput(result.output);
    this.versions.push(result.version);
    return { output: { ...result.output }, version: { ...result.version, source: { ...result.version.source } } };
  }

  private requireOutput(outputId: string) {
    const output = this.outputs.find((item) => item.id === outputId);
    if (!output) throw new Error("Project Output was not found.");
    return output;
  }

  private replaceOutput(output: ProjectOutput) {
    this.outputs = this.outputs.map((item) => item.id === output.id ? output : item);
  }
}
