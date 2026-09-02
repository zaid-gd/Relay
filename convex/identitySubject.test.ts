/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("account data uses the Clerk token identifier consistently", async () => {
  const t = convexTest(schema, modules);
  const tokenIdentifier = "https://relay-app.cc.cd|user_stable";
  const subject = "user_stable";
  await t.run((ctx) =>
    ctx.db.insert("projects", {
      ownerUserId: tokenIdentifier,
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
    })
  );

  const user = t.withIdentity({ tokenIdentifier, subject });

  await expect(user.query(api.projects.list, {})).resolves.toHaveLength(1);
});
