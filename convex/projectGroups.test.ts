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
    studioName: "Studio", profileName: "Owner", profileUsername: "owner", profileTitle: "", profileBio: "", profileLocation: "", profileImageUrl: "",
    timeZone: "UTC", dateFormat: "Month Day, Year", weekStart: "Mon", currencyCode: "USD",
    clients: clientIds.map((id) => ({ id, name: id, company: "", contactName: "", email: "", phone: "", notes: "", archived: false })),
    projectTags: ["Freelance"], salaryWorkType: "Salary", salaryBatchSize: 20, salaryBatchAmount: 1000,
    projectStages: ["Planned", "Delivered"], notifications: {}, integrations: {}, integrationAccounts: {},
    teamRole: emptyTeamRole, teamMembers: [], editorPermissions: {}, rolePermissions: {}, integrationConfigs: {},
    theme: "dark", accentColor: "#fff", density: "compact",
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

  await owner.mutation(api.settings.upsert, settingsWithClients("client-a", "client-b"));
  await expect(owner.mutation(api.projectGroups.upsert, { group: { ...group, id: "group-b", clientId: "missing" } })).rejects.toThrow(/must belong to this Workspace/);
  await owner.mutation(api.projectGroups.upsert, { group });
  expect(await owner.query(api.projectGroups.list, {})).toEqual([group]);

  const project = {
    id: "project-valid", profileId: "video-editing", title: "Launch film", client: "client-a", clientId: "client-a", projectGroupId: group.id,
    status: plannedStatus, workType: "Freelance", startDate: "2026-08-24", dueDate: "2026-09-01", earnings: 0, notes: "",
  };
  await owner.mutation(api.workItems.replaceAll, { items: [project] });
  await owner.mutation(api.workItems.replaceAll, { items: [{ ...project, archived: true }], deleteMissing: false });
  expect(await owner.query(api.workItems.list, {})).toMatchObject([{ id: project.id, archived: true }]);
  await expect(owner.mutation(api.workItems.replaceAll, { items: [{ ...project, id: "project-invalid", clientId: "missing", projectGroupId: undefined }], deleteMissing: false })).rejects.toThrow(/Client must belong to this Workspace/);

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
