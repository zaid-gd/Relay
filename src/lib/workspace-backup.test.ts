import { describe, expect, it } from "vitest";
import { createWorkspaceBackup, parseWorkspaceBackup } from "./workspace-backup";

describe("workspace backup", () => {
  it("round-trips workspace records without connected-account details", () => {
    const backup = createWorkspaceBackup({
      projects: [], clients: [], resources: [], salaryBatches: [],
      settings: { integrationAccounts: { Slack: "secret@example.com" }, integrationConfigs: { Slack: { webhookUrl: "https://secret.example" } } },
    });
    expect(backup).not.toContain("secret@example.com");
    expect(backup).not.toContain("secret.example");
    expect(parseWorkspaceBackup(backup).version).toBe(1);
  });

  it("rejects unsupported or incomplete files before import", () => {
    expect(() => parseWorkspaceBackup('{"version":2}')).toThrow(/unsupported/i);
  });
});
