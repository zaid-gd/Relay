/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("Project Groups persist per Workspace and enforce the Project Client", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ tokenIdentifier: "owner", name: "Owner" });
  const group = {
    id: "group-a",
    clientId: "client-a",
    name: "Campaign",
    notes: "",
    archived: false,
    createdAt: "2026-08-24T00:00:00.000Z",
  };

  await owner.mutation(api.projectGroups.replaceAll, { groups: [group] });
  expect(await owner.query(api.projectGroups.list, {})).toEqual([group]);

  await expect(owner.mutation(api.workItems.replaceAll, { items: [{
    id: "project-a",
    profileId: "video-editing",
    title: "Launch film",
    client: "Wrong Client",
    clientId: "client-b",
    projectGroupId: group.id,
    status: "Planned",
    workType: "Freelance",
    startDate: "2026-08-24",
    dueDate: "2026-09-01",
    earnings: 0,
    notes: "",
  }] })).rejects.toThrow(/selected Client and Workspace/);
});
