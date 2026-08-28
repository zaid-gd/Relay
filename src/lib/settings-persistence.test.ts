import { expect, test } from "vitest";
import { omitLegacySettings } from "./settings-persistence";

test("persisted settings omit legacy integration and permission fields", () => {
  expect(
    omitLegacySettings({
      theme: "Dark",
      integrations: { Slack: true },
      integrationAccounts: { Slack: "workspace" },
      editorPermissions: { edit: true },
    })
  ).toEqual({ theme: "Dark" });
});
