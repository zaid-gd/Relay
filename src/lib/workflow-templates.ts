const deliveredLabels = /^(delivered|delivery|publish|published|master|masters)$/i;

export function validateWorkflowStages(stages: readonly string[]) {
  const normalized = stages.map((stage) => stage.trim()).filter(Boolean);
  if (normalized.length < 2) return "Add at least two workflow stages.";
  if (normalized.some((stage) => stage.toLowerCase() === "cancelled")) return "Cancelled stays outside the ordered workflow.";
  if (new Set(normalized.map((stage) => stage.toLowerCase())).size !== normalized.length) return "Workflow stage labels must be unique.";
  if (normalized.filter((stage) => deliveredLabels.test(stage)).length !== 1) return "Keep exactly one Delivered-purpose stage.";
  return "";
}
