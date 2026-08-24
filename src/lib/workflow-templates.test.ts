import { describe, expect, it } from "vitest";
import { normalizeWorkflowStages, validateWorkflowStages } from "./workflow-templates";
import type { WorkflowStage } from "./types";

describe("workflow template stages", () => {
  it("requires one delivered stage and keeps cancelled outside the ordered path", () => {
    const stages: WorkflowStage[] = [
      { id: "planned", label: "Planned", purpose: "planned" },
      { id: "editing", label: "Editing", purpose: "editing" },
      { id: "review", label: "Client Review", purpose: "client_review" },
      { id: "revisions", label: "Revisions", purpose: "revisions" },
      { id: "approved", label: "Approved", purpose: "approved" },
      { id: "delivery", label: "Delivered", purpose: "delivered" },
    ];
    expect(validateWorkflowStages(stages)).toBe("");
    expect(validateWorkflowStages(stages.filter((stage) => stage.purpose !== "delivered"))).toMatch(/delivered/i);
    expect(validateWorkflowStages([...stages, { id: "delivery-2", label: "Published", purpose: "delivered" }])).toMatch(/one delivered/i);
    expect(validateWorkflowStages([...stages.slice(0, 1), { id: "cancelled", label: "Cancelled", purpose: "editing" }, stages.at(-1)!])).toMatch(/cancelled/i);
  });

  it("keeps a stage purpose stable when its visible label changes", () => {
    expect(normalizeWorkflowStages([{ id: "review", label: "Client Approval", purpose: "client_review" }])).toEqual([
      { id: "review", label: "Client Approval", purpose: "client_review" },
    ]);
  });

  it("normalizes supported legacy label arrays into records", () => {
    expect(normalizeWorkflowStages(["Planned", "Editing", "Client Review", "Delivered"])).toEqual([
      { id: "legacy-stage-1", label: "Planned", purpose: "planned" },
      { id: "legacy-stage-2", label: "Editing", purpose: "editing" },
      { id: "legacy-stage-3", label: "Client Review", purpose: "client_review" },
      { id: "legacy-stage-4", label: "Delivered", purpose: "delivered" },
    ]);
  });

  it("keeps custom legacy labels instead of dropping workflow stages", () => {
    expect(normalizeWorkflowStages(["Ideas", "Offline", "Hand-off"])).toEqual([
      { id: "legacy-stage-1", label: "Ideas", purpose: "planned" },
      { id: "legacy-stage-2", label: "Offline", purpose: "editing" },
      { id: "legacy-stage-3", label: "Hand-off", purpose: "delivered" },
    ]);
  });
});
