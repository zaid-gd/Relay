export type ProjectStageTransitionResult =
  | { kind: "none"; completedAt?: string }
  | { kind: "client"; earned: number; completedAt?: string }
  | { kind: "salary"; progress: number; requiredProjectCount: number; amount: number; batchCreated: boolean; completedAt?: string };

export type ProjectWorkflowPort = {
  previewStage: (input: { projectId: string; stageId: string }) => Promise<ProjectStageTransitionResult>;
  transitionStage: (input: { projectId: string; stageId: string }) => Promise<ProjectStageTransitionResult>;
};
