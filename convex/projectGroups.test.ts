/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const emptyTeamRole: "" = "";
const plannedStatus: "Planned" = "Planned";

function settingsWithClients(...clientIds: string[]) {
  return {
    studioName: "Studio",
    profileName: "Owner",
    profileUsername: "owner",
    profileTitle: "",
    profileBio: "",
    profileLocation: "",
    profileImageUrl: "",
    timeZone: "UTC",
    dateFormat: "Month Day, Year",
    weekStart: "Mon",
    currencyCode: "USD",
    clients: clientIds.map((id) => ({
      id,
      name: id,
      company: "",
      contactName: "",
      email: "",
      phone: "",
      notes: "",
      archived: false,
    })),
    projectTags: ["Freelance"],
    salaryWorkType: "Salary",
    salaryBatchSize: 20,
    salaryBatchAmount: 1000,
    projectStages: ["Planned", "Delivered"],
    notifications: {},
    teamRole: emptyTeamRole,
    teamMembers: [],
    rolePermissions: {},
    integrationConfigs: {},
    theme: "dark",
    accentColor: "#fff",
    density: "compact",
  };
}

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

  await owner.mutation(
    api.settings.upsert,
    settingsWithClients("client-a", "client-b")
  );
  const storedSettings = await t.run((ctx) => ctx.db.query("settings").first());
  expect(storedSettings).not.toHaveProperty("integrations");
  expect(storedSettings).not.toHaveProperty("integrationAccounts");
  expect(storedSettings).not.toHaveProperty("editorPermissions");
  await expect(
    owner.mutation(api.projectGroups.upsert, {
      group: { ...group, id: "group-b", clientId: "missing" },
    })
  ).rejects.toThrow(/must belong to this Workspace/);
  await owner.mutation(api.projectGroups.upsert, { group });
  expect(await owner.query(api.projectGroups.list, {})).toEqual([group]);

  const project = {
    id: "project-valid",
    profileId: "video-editing",
    title: "Launch film",
    clientId: "client-a",
    projectGroupId: group.id,
    workType: "Freelance",
    startDate: "2026-08-24",
    dueDate: "2026-09-01",
    earnings: 0,
    notes: "",
    assigneeUserIds: [],
    workflowStages: [
      { id: "planned", label: plannedStatus, purpose: "planned" as const },
      { id: "delivered", label: "Delivered", purpose: "delivered" as const },
    ],
  };
  await owner.mutation(api.projects.create, { project });
  await owner.mutation(api.projects.setArchived, {
    projectId: project.id,
    archived: true,
  });
  expect(await owner.query(api.projects.list, {})).toMatchObject([
    { id: project.id, archived: true },
  ]);
  await expect(
    owner.mutation(api.projects.create, {
      project: {
        ...project,
        id: "project-invalid",
        clientId: "missing",
        projectGroupId: undefined,
      },
    })
  ).rejects.toThrow(/Client must belong to this Workspace/);

  await expect(
    owner.mutation(api.projects.create, {
      project: {
        ...project,
        id: "project-a",
        clientId: "client-b",
        projectGroupId: group.id,
      },
    })
  ).rejects.toThrow(/selected Client/);
});
