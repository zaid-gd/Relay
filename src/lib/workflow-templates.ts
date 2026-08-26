import {
  WORKFLOW_STAGE_PURPOSE_VALUES,
  type WorkflowStage,
  type WorkflowStagePurpose,
} from "./types";

export const DEFAULT_WORKFLOW_STAGES: WorkflowStage[] = [
  { id: "planned", label: "Planned", purpose: "planned" },
  { id: "editing", label: "Editing", purpose: "editing" },
  { id: "client-review", label: "Client Review", purpose: "client_review" },
  { id: "revisions", label: "Revisions", purpose: "revisions" },
  { id: "approved", label: "Approved", purpose: "approved" },
  { id: "delivered", label: "Delivered", purpose: "delivered" },
];

const purposeLabels: Record<WorkflowStagePurpose, RegExp> = {
  planned: /planned|brief|concept|ingest|intake|planning/i,
  editing: /edit|assembly|selects|sync|production|cut|caption|audio|sound/i,
  client_review: /client\s*review|review/i,
  revisions: /revision/i,
  approved: /approv|finishing|legal|qc|final/i,
  delivered: /deliver|publish|master|export/i,
};

function isWorkflowStagePurpose(value: unknown): value is WorkflowStagePurpose {
  return typeof value === "string" && (WORKFLOW_STAGE_PURPOSE_VALUES as readonly string[]).includes(value);
}

function inferWorkflowStagePurpose(label: string): WorkflowStagePurpose | undefined {
  return WORKFLOW_STAGE_PURPOSE_VALUES.find((purpose) => purposeLabels[purpose].test(label));
}

function isWorkflowStage(value: unknown): value is WorkflowStage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = Object.fromEntries(Object.entries(value));
  return typeof candidate.id === "string" && Boolean(candidate.id.trim())
    && typeof candidate.label === "string" && Boolean(candidate.label.trim())
    && isWorkflowStagePurpose(candidate.purpose);
}

/** Converts persisted legacy labels into stage records at the storage boundary. */
export function normalizeWorkflowStages(value: unknown): WorkflowStage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate, index): WorkflowStage[] => {
    if (isWorkflowStage(candidate)) {
      return [{ id: candidate.id.trim(), label: candidate.label.trim(), purpose: candidate.purpose }];
    }
    if (typeof candidate !== "string") return [];
    const label = candidate.trim();
    if (!label) return [];
    const purpose = inferWorkflowStagePurpose(label)
      ?? (index === 0 ? "planned" : index === value.length - 1 ? "delivered" : "editing");
    return [{ id: `legacy-stage-${index + 1}`, label, purpose }];
  });
}

/**
 * Converts workflow stage labels into structured stage records, reusing existing stage IDs where possible.
 */
export function workflowStagesFromLabels(
  labels: readonly string[],
  existing: readonly WorkflowStage[] = DEFAULT_WORKFLOW_STAGES,
): WorkflowStage[] {
  const normalizedLabels = labels.map((label) => label.trim()).filter(Boolean);
  const unused = new Set(existing.map((stage) => stage.id));
  return normalizedLabels.map((label, index) => {
    const exact = existing.find((stage) => unused.has(stage.id) && stage.label.toLowerCase() === label.toLowerCase());
    const positional = existing[index] && unused.has(existing[index].id) ? existing[index] : undefined;
    const source = exact ?? positional;
    if (source) {
      unused.delete(source.id);
      return { ...source, label };
    }
    const purpose: WorkflowStagePurpose = index === 0 ? "planned" : index === normalizedLabels.length - 1 ? "delivered" : "editing";
    return { id: `stage-${crypto.randomUUID()}`, label, purpose };
  });
}

/**
 * Validates workflow stages and returns an error message if validation fails.
 */
export function validateWorkflowStages(stages: readonly WorkflowStage[] | readonly string[]) {
  const normalized = normalizeWorkflowStages(stages);
  if (normalized.length < 2) return "Add at least two workflow stages.";
  if (normalized.some((stage) => stage.label.toLowerCase() === "cancelled" || stage.label.toLowerCase() === "canceled")) {
    return "Cancelled stays outside the ordered workflow.";
  }
  if (new Set(normalized.map((stage) => stage.id)).size !== normalized.length) {
    return "Workflow stage IDs must be unique.";
  }
  if (new Set(normalized.map((stage) => stage.label.toLowerCase())).size !== normalized.length) {
    return "Workflow stage labels must be unique.";
  }
  if (normalized.filter((stage) => stage.purpose === "delivered").length !== 1) {
    return "Keep exactly one Delivered-purpose stage.";
  }
  return "";
}
