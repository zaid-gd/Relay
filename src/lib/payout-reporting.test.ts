import { describe, expect, it } from "vitest";
import type { SalaryBatch, WorkItem } from "./types";
import { buildPayoutReport, payoutPeriodRange } from "./payout-reporting";

function project(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "project-1",
    profileId: "video-editing",
    title: "Project",
    status: "Delivered",
    workType: "Freelance",
    startDate: "2026-08-01",
    dueDate: "2026-08-10",
    earnings: 0,
    notes: "",
    ...overrides,
  };
}

function batch(overrides: Partial<SalaryBatch> = {}): SalaryBatch {
  return {
    id: "batch-1",
    number: 1,
    completedDate: "2026-08-12",
    archived: false,
    archivedDate: "",
    amount: 500,
    paid: false,
    ...overrides,
  };
}

const baseOptions = {
  salaryWorkType: "Job / Salary",
  salaryBatchAmount: 500,
  profileName: "Owner",
  period: "all" as const,
};

describe("buildPayoutReport", () => {
  it("counts delivered normal projects and completed salary batches exactly once", () => {
    const report = buildPayoutReport({
      ...baseOptions,
      projects: [
        project({ id: "paid-project", title: "Paid", earnings: 100, paid: true, paidDate: "2026-08-06", clientId: "client-a", client: "Acme" }),
        project({ id: "unpaid-project", title: "Unpaid", earnings: 75, clientId: "client-a", client: "Acme" }),
        project({ id: "salary-plan-project", title: "Salary plan work", earnings: 999, salaryPlanId: "plan-a", paid: true, clientId: "client-a", client: "Acme" }),
        project({ id: "salary-tag-project", title: "Salary tagged work", earnings: 999, workType: "Job / Salary", clientId: "client-a", client: "Acme" }),
      ],
      salaryBatches: [
        batch({ id: "paid-batch", number: 1, amount: 500, paid: true, paidDate: "2026-08-13", clientId: "client-a", clientName: "Acme" }),
        batch({ id: "unpaid-batch", number: 2, amount: 700, paid: false, clientId: "client-a", clientName: "Acme" }),
      ],
    });

    expect(report.deliveredProjects).toHaveLength(4);
    expect(report.deliveredProjects.filter((item) => item.isSalaryEdit).map((item) => item.amount)).toEqual([0, 0]);
    expect(report.earned).toBe(1_375);
    expect(report.collected).toBe(600);
    expect(report.outstanding).toBe(775);
    expect(report.money).toEqual({ earned: 1_375, collected: 600, outstanding: 775 });
    expect(report.manualEarnings).toBe(175);
    expect(report.paidManualEarnings).toBe(100);
    expect(report.unpaidManualEarnings).toBe(75);
    expect(report.batchEarnings).toBe(1_200);
    expect(report.paidBatchEarnings).toBe(500);
    expect(report.unpaidBatchEarnings).toBe(700);
  });

  it("uses completedAt before dueDate when selecting a period", () => {
    const report = buildPayoutReport({
      ...baseOptions,
      period: "month",
      now: new Date("2026-08-15T12:00:00.000Z"),
      projects: [
        project({ id: "completed-last-month", earnings: 100, completedAt: "2026-07-31T23:00:00.000Z", dueDate: "2026-08-10" }),
        project({ id: "due-date-fallback", earnings: 200, dueDate: "2026-08-10" }),
      ],
      salaryBatches: [],
    });

    expect(report.periodStart).toBe("2026-08-01");
    expect(report.periodEnd).toBe("2026-08-31");
    expect(report.deliveredProjects.map((item) => item.id)).toEqual(["due-date-fallback"]);
    expect(report.earned).toBe(200);
  });

  it("supports a bounded custom period and client totals", () => {
    const report = buildPayoutReport({
      ...baseOptions,
      period: "custom",
      customRange: { start: "2026-08-01T00:00:00.000Z", end: "2026-08-15" },
      projects: [
        project({ id: "acme-project", earnings: 250, clientId: "client-a", client: "Acme" }),
        project({ id: "outside-project", earnings: 900, completedAt: "2026-08-20T12:00:00.000Z", clientId: "client-a", client: "Acme" }),
      ],
      salaryBatches: [batch({ amount: 500, paid: true, clientId: "client-a", clientName: "Acme" })],
    });

    expect(report.periodStart).toBe("2026-08-01");
    expect(report.periodEnd).toBe("2026-08-15");
    expect(report.earned).toBe(750);
    expect(report.collected).toBe(500);
    expect(report.outstanding).toBe(250);
    expect(report.clients).toEqual([{
      id: "client-a",
      name: "Acme",
      deliveredProjects: 1,
      salaryBatches: 1,
      earned: 750,
      collected: 500,
      outstanding: 250,
    }]);
  });
});

describe("payoutPeriodRange", () => {
  it("normalizes custom date inputs to date keys", () => {
    expect(payoutPeriodRange("custom", new Date("2026-08-15T12:00:00.000Z"), {
      start: "2026-08-01T00:00:00.000Z",
      end: "2026-08-15",
    })).toEqual({ start: "2026-08-01", end: "2026-08-15" });
  });
});
