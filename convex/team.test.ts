/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type {
  FileCategory,
  FileStatus,
  StoredProjectStatus,
  TeamRole,
} from "../src/lib/domain-values";
import {
  PROJECT_TEMPLATES,
  applyProjectTemplate,
} from "../src/lib/project-templates";
import type { ProjectTemplateId } from "../src/lib/project-templates";
import {
  buildPayoutReport,
  payoutReportToCsv,
} from "../src/lib/payout-reporting";
import {
  buildInvoiceDrafts,
  invoiceDraftsToCsv,
} from "../src/lib/invoice-reporting";
import type { SalaryBatch, WorkItem } from "../src/lib/types";

const modules = import.meta.glob("./**/*.ts");

const ownerPermissions = {
  viewProjects: true,
  createProjects: true,
  editProjects: true,
  updateStatus: true,
  commentProjects: true,
  manageTeam: true,
  useChat: true,
};

const editorPermissions = {
  ...ownerPermissions,
  manageTeam: false,
};

const reviewerPermissions = {
  viewProjects: true,
  createProjects: false,
  editProjects: false,
  updateStatus: false,
  commentProjects: true,
  manageTeam: false,
  useChat: true,
};

type TestProject = {
  id: string;
  teamId: string;
  ownerUserId?: string;
  assigneeUserIds: string[];
  profileId: string;
  title: string;
  client: string;
  status: StoredProjectStatus;
  workType: string;
  startDate: string;
  dueDate: string;
  earnings: number;
  paid?: boolean;
  paidDate?: string;
  notes: string;
  templateId?: ProjectTemplateId;
  templateProjectType?: string;
  workflowStages?: string[];
  templateDeliverables?: Array<{
    title: string;
    category: FileCategory;
    initialStatus: FileStatus;
  }>;
  checklistItems?: string[];
};

function project(
  id: string,
  teamId: string,
  overrides: Partial<TestProject> = {}
): TestProject {
  return {
    id,
    teamId,
    profileId: "video-editing",
    title: `Project ${id}`,
    client: "Client",
    status: "Planned",
    workType: "Freelance",
    startDate: "2026-06-01",
    dueDate: "2026-06-10",
    earnings: 500,
    notes: "",
    assigneeUserIds: [],
    ...overrides,
  };
}

async function setupTeam() {
  const t = convexTest(schema, modules);
  const teamId = await t.run(async (ctx) => {
    const createdAt = new Date().toISOString();
    const workspaceId = await ctx.db.insert("teamWorkspaces", {
      ownerUserId: "owner",
      name: "Test Team",
      inviteCode: "ABC123",
      createdAt,
    });
    const members: Array<{
      userId: string;
      email: string;
      name: string;
      role: TeamRole;
      permissions: typeof ownerPermissions;
    }> = [
      {
        userId: "owner",
        email: "owner@example.com",
        name: "Owner User",
        role: "Owner",
        permissions: ownerPermissions,
      },
      {
        userId: "editor",
        email: "editor@example.com",
        name: "Editor User",
        role: "Editor",
        permissions: editorPermissions,
      },
      {
        userId: "reviewer",
        email: "reviewer@example.com",
        name: "Review User",
        role: "Reviewer",
        permissions: reviewerPermissions,
      },
    ];
    for (const member of members) {
      await ctx.db.insert("teamMembers", {
        teamId: workspaceId,
        ...member,
        status: "active",
        createdAt,
        joinedAt: createdAt,
      });
    }
    return workspaceId;
  });
  return {
    t,
    teamId,
    owner: t.withIdentity({
      tokenIdentifier: "owner",
      name: "Owner User",
      email: "owner@example.com",
    }),
    editor: t.withIdentity({
      tokenIdentifier: "editor",
      name: "Editor User",
      email: "editor@example.com",
    }),
    reviewer: t.withIdentity({
      tokenIdentifier: "reviewer",
      name: "Review User",
      email: "reviewer@example.com",
    }),
  };
}

describe("salary payout reporting", () => {
  test("builds local invoice drafts for delivered client work", () => {
    const projects: WorkItem[] = [
      {
        id: "client-video-1",
        profileId: "video-editing",
        title: "Launch edit",
        client: "Northline Foods",
        status: "Delivered",
        workType: "Freelance",
        startDate: "2026-06-01",
        dueDate: "2026-06-08",
        earnings: 1800,
        notes: "",
      },
      {
        id: "client-video-2",
        profileId: "video-editing",
        title: "Cutdown pack",
        client: "Northline Foods",
        status: "Delivered",
        workType: "Freelance",
        startDate: "2026-06-03",
        dueDate: "2026-06-12",
        earnings: 700,
        paid: true,
        paidDate: "2026-06-15",
        notes: "",
      },
      {
        id: "salary-edit",
        profileId: "video-editing",
        title: "Internal episode",
        client: "Channel",
        status: "Delivered",
        workType: "Job / Salary",
        startDate: "2026-06-03",
        dueDate: "2026-06-12",
        earnings: 999,
        notes: "",
      },
      {
        id: "undelivered",
        profileId: "video-editing",
        title: "Pending edit",
        client: "Northline Foods",
        status: "In Progress",
        workType: "Freelance",
        startDate: "2026-06-03",
        dueDate: "2026-06-12",
        earnings: 1200,
        notes: "",
      },
    ];

    const drafts = buildInvoiceDrafts({
      projects,
      salaryWorkType: "Job / Salary",
      currencyCode: "AED",
      period: "month",
      now: new Date("2026-06-20T08:00:00.000Z"),
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      client: "Northline Foods",
      invoiceNumber: "DRAFT-20260620-NORTHLINE-FOODS",
      issueDate: "2026-06-20",
      dueDate: "2026-07-04",
      total: 1800,
      currencyCode: "AED",
    });
    expect(drafts[0].lineItems.map((item) => item.title)).toEqual([
      "Launch edit",
    ]);

    const csv = invoiceDraftsToCsv(drafts);
    expect(csv).toContain(
      "DRAFT-20260620-NORTHLINE-FOODS,Northline Foods,2026-06-20,2026-07-04,2026-06-08,Launch edit,Freelance,1800,AED"
    );
    expect(csv).not.toContain("Cutdown pack");
    expect(csv).not.toContain("Internal episode");
    expect(csv).not.toContain("Pending edit");
  });
  test("calculates period earnings, legacy batch fallbacks, and editor attribution", () => {
    const projects: WorkItem[] = [
      {
        id: "freelance-delivered",
        profileId: "video-editing",
        title: 'Launch, "cut"',
        status: "Delivered",
        workType: "Freelance",
        startDate: "2026-06-01",
        dueDate: "2026-06-10",
        earnings: 1200,
        notes: "",
      },
      {
        id: "personal-salary",
        profileId: "video-editing",
        title: "Personal salary edit",
        status: "Delivered",
        workType: "Job / Salary",
        startDate: "2026-06-01",
        dueDate: "2026-06-11",
        earnings: 9999,
        notes: "",
      },
      {
        id: "team-salary",
        teamId: "team",
        ownerUserId: "owner",
        assigneeUserIds: ["editor"],
        profileId: "video-editing",
        title: "Team salary edit",
        status: "Delivered",
        workType: "Job / Salary",
        startDate: "2026-06-01",
        dueDate: "2026-06-12",
        earnings: 500,
        notes: "",
      },
      {
        id: "outside-period",
        profileId: "video-editing",
        title: "Older project",
        status: "Delivered",
        workType: "Freelance",
        startDate: "2025-12-01",
        dueDate: "2025-12-20",
        earnings: 700,
        notes: "",
      },
      {
        id: "not-delivered",
        profileId: "video-editing",
        title: "In progress",
        status: "In Progress",
        workType: "Freelance",
        startDate: "2026-06-01",
        dueDate: "2026-06-13",
        earnings: 800,
        notes: "",
      },
    ];
    const batches: SalaryBatch[] = [
      {
        id: "batch-1",
        number: 1,
        completedDate: "2026-06-05",
        archived: false,
        archivedDate: "",
        amount: 10000,
        paid: true,
        paidDate: "2026-06-06",
      },
      {
        id: "batch-2",
        number: 2,
        completedDate: "2026-06-12",
        archived: false,
        archivedDate: "",
      },
      {
        id: "batch-old",
        number: 3,
        completedDate: "2025-12-10",
        archived: false,
        archivedDate: "",
        amount: 8000,
      },
    ];

    const report = buildPayoutReport({
      projects,
      salaryBatches: batches,
      salaryWorkType: "Job / Salary",
      salaryBatchAmount: 9000,
      profileName: "Jordan Lee",
      editors: [
        { userId: "owner", name: "Owner User" },
        { userId: "editor", name: "Editor User" },
      ],
      period: "year",
      now: new Date(2026, 5, 12),
    });

    expect(report.deliveredProjects).toHaveLength(3);
    expect(report.completedBatchCount).toBe(2);
    expect(report.paidBatchCount).toBe(1);
    expect(report.unpaidBatchCount).toBe(1);
    expect(report.paidBatchEarnings).toBe(10000);
    expect(report.unpaidBatchEarnings).toBe(9000);
    expect(report.manualEarnings).toBe(1200);
    expect(report.batchEarnings).toBe(19000);
    expect(report.totalEarnings).toBe(20200);
    expect(
      report.editors.find((editor) => editor.name === "Editor User")
    ).toMatchObject({
      deliveredProjects: 1,
      salaryEdits: 1,
      totalEarnings: 0,
    });
    expect(
      report.editors.find((editor) => editor.name === "Jordan Lee")
    ).toMatchObject({
      deliveredProjects: 2,
      salaryEdits: 1,
      manualEarnings: 1200,
      batchEarnings: 19000,
      totalEarnings: 20200,
    });

    const csv = payoutReportToCsv(report, "AED");
    expect(csv).toContain('"Launch, ""cut"""');
    expect(csv).toContain(
      "Salary batch,2026-06-12,Batch 2,Jordan Lee,Unpaid,9000,AED"
    );
  });

  test("does not split the current editor between profile and workspace identities", () => {
    const report = buildPayoutReport({
      projects: [
        {
          id: "owner-salary-edit",
          teamId: "team",
          ownerUserId: "owner",
          assigneeUserIds: ["owner"],
          profileId: "video-editing",
          title: "Owner salary edit",
          status: "Delivered",
          workType: "Job / Salary",
          startDate: "2026-06-01",
          dueDate: "2026-06-12",
          earnings: 0,
          notes: "",
        },
      ],
      salaryBatches: [
        {
          id: "batch-1",
          number: 1,
          completedDate: "2026-06-12",
          archived: false,
          archivedDate: "",
          amount: 10000,
          paid: true,
          paidDate: "2026-06-13",
        },
      ],
      salaryWorkType: "Job / Salary",
      salaryBatchAmount: 10000,
      profileName: "Screen",
      editors: [
        { userId: "owner", name: "Team member" },
        { userId: "editor", name: "Actual teammate" },
      ],
      currentUserId: "owner",
      period: "all",
    });

    expect(report.editors).toEqual([
      expect.objectContaining({
        id: "owner",
        name: "Screen",
        deliveredProjects: 1,
        salaryEdits: 1,
        batchEarnings: 10000,
        totalEarnings: 10000,
      }),
    ]);
  });

  test("persists client project payment metadata", async () => {
    const { owner, teamId } = await setupTeam();
    await owner.mutation(api.workItems.replaceAll, {
      items: [
        project("paid-project", teamId, {
          status: "Delivered",
          paid: true,
          paidDate: "2026-06-20T10:00:00.000Z",
        }),
      ],
    });

    const items = await owner.query(api.workItems.list, {});
    expect(
      items.find((item: TestProject) => item.id === "paid-project")
    ).toMatchObject({
      paid: true,
      paidDate: "2026-06-20T10:00:00.000Z",
    });
  });

  test("persists optional payment metadata while legacy batches remain readable", async () => {
    const { owner } = await setupTeam();
    await owner.mutation(api.salaryBatches.replaceAll, {
      batches: [
        {
          id: "paid-batch",
          number: 1,
          completedDate: "2026-06-10",
          archived: false,
          archivedDate: "",
          amount: 10000,
          paid: true,
          paidDate: "2026-06-11",
        },
        {
          id: "legacy-batch",
          number: 2,
          completedDate: "2026-06-12",
          archived: false,
          archivedDate: "",
        },
      ],
    });
    await owner.run(async (ctx) => {
      await ctx.db.insert("salaryBatches", {
        userId: "owner",
        id: "pre-payment-schema-batch",
        number: 3,
        completedDate: "2026-06-12",
        archived: false,
        archivedDate: "",
      });
    });

    const storedBatches = await owner.query(api.salaryBatches.list, {});
    expect(storedBatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "paid-batch",
          amount: 10000,
          paid: true,
          paidDate: "2026-06-11",
        }),
        expect.objectContaining({
          id: "legacy-batch",
          paid: false,
          paidDate: "",
        }),
        expect.objectContaining({
          id: "pre-payment-schema-batch",
          number: 3,
        }),
      ])
    );
    expect(
      storedBatches.find((batch) => batch.id === "pre-payment-schema-batch")
        ?.amount
    ).toBeUndefined();
    expect(
      storedBatches.find((batch) => batch.id === "pre-payment-schema-batch")
        ?.paid
    ).toBeUndefined();
  });
});

describe("team workspace permissions and synchronization", () => {
  test("Team comments resolve through current Projects", async () => {
    const { t, teamId, owner, reviewer } = await setupTeam();
    const createdAt = new Date().toISOString();
    await t.run((ctx) =>
      ctx.db.insert("projects", {
        ownerUserId: "owner",
        id: "current-team-project",
        teamId,
        assigneeUserIds: ["reviewer"],
        profileId: "video-editing",
        title: "Current team project",
        clientId: "client",
        archived: false,
        status: "In Progress",
        workflowStageId: "editing",
        workflowStages: [
          { id: "planned", label: "Planned", purpose: "planned" },
          { id: "editing", label: "Editing", purpose: "editing" },
          { id: "delivered", label: "Delivered", purpose: "delivered" },
        ],
        workType: "Freelance",
        startDate: "2026-08-28",
        dueDate: "2026-09-04",
        earnings: 500,
        paid: false,
        notes: "",
        createdAt,
        updatedAt: createdAt,
      })
    );

    await reviewer.mutation(api.team.addProjectComment, {
      teamId,
      projectId: "current-team-project",
      body: "Ready for review.",
    });

    await expect(
      owner.query(api.team.listProjectComments, {
        teamId,
        projectId: "current-team-project",
      })
    ).resolves.toMatchObject([{ body: "Ready for review." }]);
  });

  test("workspace settings and member access stay owner-controlled", async () => {
    const { t, teamId, owner, editor } = await setupTeam();
    const editorMemberId = await t.run(async (ctx) => {
      const member = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId_and_userId", (q) =>
          q.eq("teamId", teamId).eq("userId", "editor")
        )
        .unique();
      if (!member) throw new Error("Editor missing");
      return member._id;
    });

    await owner.mutation(api.team.updateWorkspaceSettings, {
      teamId,
      name: "Updated Workspace",
      currencyCode: "AED",
      timeZone: "Asia/Dubai",
      defaultWorkflowTemplateId: "relay-default-workflow",
      allowAllTeamProjects: true,
    });
    await expect(
      editor.mutation(api.team.updateWorkspaceSettings, {
        teamId,
        name: "Nope",
        currencyCode: "USD",
        timeZone: "UTC",
        allowAllTeamProjects: false,
      })
    ).rejects.toThrow("Workspace Owner");
    await owner.mutation(api.team.updateMemberPermissions, {
      teamId,
      memberId: editorMemberId,
      permissions: { manageFinance: true, managePortal: false },
    });
    const workspace = await owner.query(api.team.getMyWorkspace, {});
    expect(workspace?.workspace).toMatchObject({
      name: "Updated Workspace",
      currencyCode: "AED",
      timeZone: "Asia/Dubai",
      defaultWorkflowTemplateId: "relay-default-workflow",
      allowAllTeamProjects: true,
    });
    expect(
      workspace?.members.find((member) => member._id === editorMemberId)
        ?.permissions
    ).toMatchObject({
      manageFinance: true,
      managePortal: false,
    });
  });

  test("free workspaces stop at one owner plus two members and transfer ownership before leave", async () => {
    const { t, teamId, owner, editor } = await setupTeam();
    await expect(
      owner.mutation(api.team.inviteMember, {
        teamId,
        email: "extra@example.com",
        role: "Reviewer",
      })
    ).rejects.toThrow("one Owner and two invited members");
    const editorMemberId = await t.run(async (ctx) => {
      const member = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId_and_userId", (q) =>
          q.eq("teamId", teamId).eq("userId", "editor")
        )
        .unique();
      if (!member) throw new Error("Editor missing");
      return member._id;
    });
    await owner.mutation(api.team.transferOwnership, {
      teamId,
      memberId: editorMemberId,
    });
    await expect(
      owner.mutation(api.team.leaveWorkspace, { teamId })
    ).resolves.toBeUndefined();
    const nextOwner = await editor.query(api.team.getMyWorkspace, {});
    expect(nextOwner?.workspace.ownerUserId).toBe("editor");
    expect(nextOwner?.currentMember.role).toBe("Owner");
  });

  test("project template catalog creates editable projects without client-specific data", async () => {
    expect(PROJECT_TEMPLATES).toHaveLength(8);
    expect(new Set(PROJECT_TEMPLATES.map((template) => template.id)).size).toBe(
      8
    );
    expect(PROJECT_TEMPLATES.map((template) => template.name)).toEqual([
      "YouTube Video",
      "Instagram Reel",
      "Corporate Event Video",
      "Product Ad",
      "Wedding Film",
      "Theme Park / Social Campaign",
      "Podcast Edit",
      "Client Retainer Package",
    ]);

    for (const template of PROJECT_TEMPLATES) {
      const item = applyProjectTemplate(template, {
        profileId: "video-editing",
        startDate: "2026-06-12",
        dueDate: "2026-06-20",
        workType: "Freelance",
      });
      expect(item.client).toBe("");
      expect(item.templateProjectType).toBe(template.projectType);
      expect(item.workflowStages?.length).toBeGreaterThan(0);
      expect(item.templateDeliverables?.length).toBeGreaterThan(0);
      expect(item.checklistItems?.length).toBeGreaterThan(0);
      expect(JSON.stringify(item).toLowerCase()).not.toContain("jordan");
      expect(JSON.stringify(item).toLowerCase()).not.toContain("cutlab drive");
    }

    const { owner } = await setupTeam();
    const template = PROJECT_TEMPLATES[3];
    const templated = applyProjectTemplate(template, {
      profileId: "video-editing",
      startDate: "2026-06-12",
      dueDate: "2026-06-24",
      workType: "Freelance",
    });
    await owner.mutation(api.workItems.replaceAll, {
      deleteMissing: false,
      items: [
        {
          ...templated,
          workflowStages: templated.workflowStages?.map((stage) => stage.label),
          id: "template-product-ad",
        },
      ],
    });

    const created = (await owner.query(api.workItems.list, {})).find(
      (item: TestProject) => item.id === "template-product-ad"
    );
    expect(created).toMatchObject({
      templateId: "product-ad",
      templateProjectType: "Commercial",
      title: "Product Ad",
      client: "",
      workflowStages: template.workflowStages.map((stage) => stage.label),
      templateDeliverables: template.deliverables,
      checklistItems: template.checklistItems,
    });

    await owner.mutation(api.workItems.replaceAll, {
      deleteMissing: false,
      items: [
        {
          ...created!,
          title: "Summer Product Launch",
          workflowStages: ["Brief", "Edit", "Approval", "Delivery"],
          checklistItems: ["Confirm final CTA"],
        },
      ],
    });
    expect(
      (await owner.query(api.workItems.list, {})).find(
        (item: TestProject) => item.id === "template-product-ad"
      )
    ).toMatchObject({
      title: "Summer Product Launch",
      workflowStages: ["Brief", "Edit", "Approval", "Delivery"],
      checklistItems: ["Confirm final CTA"],
    });
  });

  test("blank projects remain valid without template metadata", async () => {
    const { owner } = await setupTeam();
    await owner.mutation(api.workItems.replaceAll, {
      deleteMissing: false,
      items: [
        {
          id: "blank-project",
          profileId: "video-editing",
          title: "Blank Project",
          client: "",
          status: "Planned",
          workType: "Freelance",
          startDate: "2026-06-12",
          dueDate: "2026-06-19",
          earnings: 0,
          notes: "",
          assigneeUserIds: [],
        },
      ],
    });
    const blank = (await owner.query(api.workItems.list, {})).find(
      (item: TestProject) => item.id === "blank-project"
    );
    expect(blank).toMatchObject({ title: "Blank Project", status: "Planned" });
    expect(blank?.templateId).toBeUndefined();
    expect(blank?.workflowStages).toBeUndefined();
  });

  test("active membership lookup is not limited by earlier non-active records", async () => {
    const t = convexTest(schema, modules);
    const userId = "multi-membership-user";
    const createdAt = new Date().toISOString();
    const activeTeamId = await t.run(async (ctx) => {
      for (let index = 0; index < 6; index += 1) {
        const invitedTeamId = await ctx.db.insert("teamWorkspaces", {
          ownerUserId: `owner-${index}`,
          name: `Invited Team ${index}`,
          inviteCode: `INV${index}`,
          createdAt,
        });
        await ctx.db.insert("teamMembers", {
          teamId: invitedTeamId,
          userId,
          email: "member@example.com",
          name: "Invited Member",
          role: "Reviewer",
          status: "invited",
          permissions: reviewerPermissions,
          createdAt,
        });
      }

      const teamId = await ctx.db.insert("teamWorkspaces", {
        ownerUserId: userId,
        name: "Active Team",
        inviteCode: "ACTIVE",
        createdAt,
      });
      await ctx.db.insert("teamMembers", {
        teamId,
        userId,
        email: "member@example.com",
        name: "Active Member",
        role: "Owner",
        status: "active",
        permissions: ownerPermissions,
        createdAt,
        joinedAt: createdAt,
      });
      await ctx.db.insert("workItems", {
        userId,
        id: "active-team-project",
        teamId,
        ownerUserId: userId,
        assigneeUserIds: [],
        profileId: "video-editing",
        title: "Active team project",
        client: "Client",
        status: "In Progress",
        workType: "Freelance",
        startDate: "2026-06-01",
        dueDate: "2026-06-10",
        earnings: 500,
        notes: "",
        createdAt,
      });
      return teamId;
    });
    const member = t.withIdentity({
      tokenIdentifier: userId,
      name: "Active Member",
    });

    expect(
      (await member.query(api.team.getMyWorkspace, {}))?.workspace._id
    ).toBe(activeTeamId);
    expect(await member.query(api.workItems.list, {})).toContainEqual(
      expect.objectContaining({
        id: "active-team-project",
        teamId: activeTeamId,
      })
    );
  });

  test("Owner and Editor can create, edit, assign, and update stages without stale snapshot deletion", async () => {
    const { t, teamId, owner, editor } = await setupTeam();

    await owner.mutation(api.workItems.replaceAll, {
      deleteMissing: false,
      items: [project("owner-project", teamId, { ownerUserId: "owner" })],
    });
    await editor.mutation(api.workItems.replaceAll, {
      deleteMissing: false,
      items: [project("editor-project", teamId, { ownerUserId: "editor" })],
    });
    await editor.mutation(api.workItems.replaceAll, {
      deleteMissing: false,
      items: [
        project("editor-project", teamId, {
          ownerUserId: "editor",
          status: "Review",
          notes: "Editor handoff ready",
          assigneeUserIds: ["reviewer"],
        }),
      ],
    });
    await owner.mutation(api.workItems.replaceAll, {
      deleteMissing: false,
      items: [
        project("owner-project", teamId, {
          ownerUserId: "owner",
          status: "In Progress",
          notes: "Production started",
          assigneeUserIds: ["reviewer"],
        }),
      ],
    });

    const projects = await editor.query(api.workItems.list, {});
    expect(projects.map((item: TestProject) => item.id)).toEqual([
      "editor-project",
      "owner-project",
    ]);
    expect(projects.map((item: TestProject) => item.id).sort()).toEqual([
      "editor-project",
      "owner-project",
    ]);
    expect(
      projects.find((item: TestProject) => item.id === "editor-project")
    ).toMatchObject({
      status: "Review",
      notes: "Editor handoff ready",
      assigneeUserIds: ["reviewer"],
    });
    expect(
      projects.find((item: TestProject) => item.id === "owner-project")
    ).toMatchObject({
      status: "In Progress",
      notes: "Production started",
      assigneeUserIds: ["reviewer"],
    });

    const reviewerWorkspace = await t
      .withIdentity({ tokenIdentifier: "reviewer" })
      .query(api.team.getMyWorkspace, {});
    expect(
      reviewerWorkspace?.notifications.some((notification) =>
        notification.message.includes("assigned")
      )
    ).toBe(true);
    expect(
      reviewerWorkspace?.activity.some(
        (event) => event.projectId === "owner-project"
      )
    ).toBe(true);
  });

  test("Reviewer can leave notes, mention teammates, and chat but cannot mutate projects or stages", async () => {
    const { teamId, owner, reviewer } = await setupTeam();
    await owner.mutation(api.workItems.replaceAll, {
      deleteMissing: false,
      items: [
        project("review-project", teamId, {
          ownerUserId: "owner",
          assigneeUserIds: ["reviewer"],
        }),
      ],
    });

    await expect(
      reviewer.mutation(api.workItems.replaceAll, {
        deleteMissing: false,
        items: [project("blocked-create", teamId, { ownerUserId: "reviewer" })],
      })
    ).rejects.toThrow("You do not have permission to create team projects");
    await expect(
      reviewer.mutation(api.workItems.replaceAll, {
        deleteMissing: false,
        items: [
          project("review-project", teamId, {
            ownerUserId: "owner",
            status: "Review",
          }),
        ],
      })
    ).rejects.toThrow("You do not have permission to edit team projects");

    await reviewer.mutation(api.team.addProjectComment, {
      teamId,
      projectId: "review-project",
      body: "@owner Please check this cut.",
    });
    await reviewer.mutation(api.team.sendChatMessage, {
      teamId,
      body: "@owner Review notes are ready.",
    });

    const ownerWorkspace = await owner.query(api.team.getMyWorkspace, {});
    expect(
      ownerWorkspace?.notifications.filter((notification) =>
        notification.kind.includes("mention")
      )
    ).toHaveLength(2);
    expect(
      ownerWorkspace?.activity.some((event) => event.kind === "project_comment")
    ).toBe(true);
    expect(
      ownerWorkspace?.activity.some((event) => event.kind === "chat_message")
    ).toBe(true);
    expect(ownerWorkspace?.chat[ownerWorkspace.chat.length - 1]?.body).toBe(
      "@owner Review notes are ready."
    );
  });

  test("project comments support optional validated timecodes", async () => {
    const { teamId, owner, reviewer } = await setupTeam();
    await owner.mutation(api.workItems.replaceAll, {
      deleteMissing: false,
      items: [project("timecoded-comments", teamId, { ownerUserId: "owner" })],
    });

    await reviewer.mutation(api.team.addProjectComment, {
      teamId,
      projectId: "timecoded-comments",
      body: "Replace the logo.",
      timecode: "01:05",
    });
    await reviewer.mutation(api.team.addProjectComment, {
      teamId,
      projectId: "timecoded-comments",
      body: "General pacing note.",
    });
    await expect(
      reviewer.mutation(api.team.addProjectComment, {
        teamId,
        projectId: "timecoded-comments",
        body: "Invalid timestamp.",
        timecode: "01:99",
      })
    ).rejects.toThrow("Use MM:SS or HH:MM:SS");

    const comments = await owner.query(api.team.listProjectComments, {
      teamId,
      projectId: "timecoded-comments",
    });
    expect(comments).toHaveLength(2);
    expect(comments[0]).toMatchObject({
      body: "Replace the logo.",
      timecode: "01:05",
    });
    expect(comments[1]).toMatchObject({ body: "General pacing note." });
    expect(comments[1].timecode).toBeUndefined();

    const activity = await owner.query(api.projectActivity.listForProject, {
      projectId: "timecoded-comments",
    });
    expect(
      activity.some((event) => event.detail === "01:05 · Replace the logo.")
    ).toBe(true);
  });

  test("Only a project owner or team Owner can delete a team project", async () => {
    const { t, teamId, owner, editor } = await setupTeam();
    await owner.mutation(api.workItems.replaceAll, {
      deleteMissing: false,
      items: [project("owned", teamId, { ownerUserId: "owner" })],
    });
    await editor.mutation(api.workItems.replaceAll, {
      deleteMissing: false,
      items: [project("editor-owned", teamId, { ownerUserId: "editor" })],
    });

    await expect(
      editor.mutation(api.workItems.deleteOne, { projectId: "owned" })
    ).rejects.toThrow("permission to delete");
    await editor.mutation(api.workItems.deleteOne, {
      projectId: "editor-owned",
    });
    await owner.mutation(api.workItems.deleteOne, { projectId: "owned" });

    const remaining = await t.run(async (ctx) => {
      return await ctx.db
        .query("workItems")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
        .take(10);
    });
    expect(remaining).toHaveLength(0);
  });

  test("Removed members immediately lose projects, comments, chat, and workspace access", async () => {
    const { t, teamId, owner, reviewer } = await setupTeam();
    const reviewerId = await t.run(async (ctx) => {
      const member = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId_and_userId", (q) =>
          q.eq("teamId", teamId).eq("userId", "reviewer")
        )
        .unique();
      if (!member) throw new Error("Reviewer missing");
      return member._id;
    });

    await owner.mutation(api.team.removeMember, {
      teamId,
      memberId: reviewerId,
    });

    expect(await reviewer.query(api.team.getMyWorkspace, {})).toBeNull();
    expect(await reviewer.query(api.workItems.list, {})).toEqual([]);
    await expect(
      reviewer.mutation(api.team.sendChatMessage, {
        teamId,
        body: "Still here",
      })
    ).rejects.toThrow("Team access required");
    await expect(
      reviewer.mutation(api.team.addProjectComment, {
        teamId,
        projectId: "missing",
        body: "Still here",
      })
    ).rejects.toThrow("Team access required");
  });

  test("Only Owners manage roles and legacy Client members normalize to Reviewer", async () => {
    const { t, teamId, owner, editor } = await setupTeam();
    const { legacyMemberIds, editorMemberId } = await t.run(async (ctx) => {
      const createdAt = new Date().toISOString();
      const legacyMemberIds = [];
      for (let index = 0; index < 5; index += 1) {
        legacyMemberIds.push(
          await ctx.db.insert("teamMembers", {
            teamId,
            userId: `legacy-${index}`,
            email: `legacy-${index}@example.com`,
            name: `Legacy Client ${index}`,
            role: "Client",
            status: "active",
            permissions: { ...reviewerPermissions, useChat: false },
            createdAt,
            joinedAt: createdAt,
          })
        );
      }
      const editorMember = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId_and_userId", (q) =>
          q.eq("teamId", teamId).eq("userId", "editor")
        )
        .unique();
      if (!editorMember) throw new Error("Editor missing");
      return { legacyMemberIds, editorMemberId: editorMember._id };
    });

    await expect(
      editor.mutation(api.team.updateMemberRole, {
        teamId,
        memberId: legacyMemberIds[0],
        role: "Reviewer",
      })
    ).rejects.toThrow("Permission denied");

    expect(
      await owner.mutation(api.team.normalizeLegacyRoles, { teamId })
    ).toBe(5);
    const legacyMembers = await t.run(async (ctx) =>
      Promise.all(legacyMemberIds.map((memberId) => ctx.db.get(memberId)))
    );
    expect(legacyMembers).toHaveLength(5);
    for (const legacyMember of legacyMembers) {
      expect(legacyMember).toMatchObject({
        role: "Reviewer",
        permissions: reviewerPermissions,
      });
    }

    await owner.mutation(api.team.updateMemberRole, {
      teamId,
      memberId: editorMemberId,
      role: "Reviewer",
    });
    await expect(
      editor.mutation(api.workItems.replaceAll, {
        deleteMissing: false,
        items: [project("role-blocked", teamId)],
      })
    ).rejects.toThrow("permission to create");
  });

  test("legacy project statuses remain readable while unknown statuses are rejected", async () => {
    const { teamId, owner } = await setupTeam();

    await owner.mutation(api.workItems.replaceAll, {
      deleteMissing: false,
      items: [
        project("legacy-status", teamId, {
          ownerUserId: "owner",
          status: "Client Review",
        }),
      ],
    });

    expect(await owner.query(api.workItems.list, {})).toContainEqual(
      expect.objectContaining({ id: "legacy-status", status: "Client Review" })
    );

    await expect(
      owner.mutation(api.workItems.replaceAll, {
        deleteMissing: false,
        items: [
          project("invalid-status", teamId, {
            ownerUserId: "owner",
            status: "client review" as StoredProjectStatus,
          }),
        ],
      })
    ).rejects.toThrow();
  });

  test("mark all notifications reads older unread rows without scanning newer read rows", async () => {
    const { t, teamId, owner } = await setupTeam();
    await t.run(async (ctx) => {
      for (let index = 0; index < 60; index += 1) {
        await ctx.db.insert("teamNotifications", {
          teamId,
          userId: "owner",
          kind: "project_update",
          message: `Read notification ${index}`,
          read: true,
          createdAt: `2026-06-11T12:${String(index).padStart(2, "0")}:00.000Z`,
        });
      }
      for (let index = 0; index < 2; index += 1) {
        await ctx.db.insert("teamNotifications", {
          teamId,
          userId: "owner",
          kind: "project_update",
          message: `Older unread notification ${index}`,
          read: false,
          createdAt: `2026-06-10T12:0${index}:00.000Z`,
        });
      }
    });

    await owner.mutation(api.team.markAllNotificationsRead, { teamId });

    const unread = await t.run((ctx) =>
      ctx.db
        .query("teamNotifications")
        .withIndex("by_teamId_and_userId_and_read_and_createdAt", (q) =>
          q.eq("teamId", teamId).eq("userId", "owner").eq("read", false)
        )
        .take(10)
    );
    expect(unread).toHaveLength(0);
  });
});
