/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("Clerk issuer changes do not detach account data", async () => {
  const t = convexTest(schema, modules);
  const subject = "user_stable";
  await t.run((ctx) =>
    ctx.db.insert("projects", {
      ownerUserId: subject,
      id: "project",
      assigneeUserIds: [],
      profileId: "profile",
      title: "Project",
      clientId: "client",
      archived: false,
      status: "Planned",
      workflowStageId: "planned",
      workflowStages: [],
      workType: "Work",
      startDate: "2026-01-01",
      dueDate: "2026-01-02",
      earnings: 0,
      paid: false,
      notes: "",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    }),
  );

  const before = t.withIdentity({ tokenIdentifier: "https://old.example|user_stable", subject });
  const after = t.withIdentity({ tokenIdentifier: "https://new.example|user_stable", subject });

  await expect(before.query(api.projects.list, {})).resolves.toHaveLength(1);
  await expect(after.query(api.projects.list, {})).resolves.toHaveLength(1);
});
