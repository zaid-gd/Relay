import { describe, expect, it } from "vitest";
import { validateWorkflowStages } from "./workflow-templates";

describe("workflow template stages", () => {
  it("requires one delivered stage and keeps cancelled outside the ordered path", () => {
    expect(validateWorkflowStages(["Planned", "Editing", "Client Review", "Revisions", "Approved", "Delivered"])).toBe("");
    expect(validateWorkflowStages(["Planned", "Editing"])).toMatch(/delivered/i);
    expect(validateWorkflowStages(["Planned", "Delivered", "Delivery"])).toMatch(/one delivered/i);
    expect(validateWorkflowStages(["Planned", "Cancelled", "Delivered"])).toMatch(/cancelled/i);
  });
});
