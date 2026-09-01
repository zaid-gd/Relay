"use client";

import { useEffect, useMemo, useState } from "react";
import { makeFunctionReference } from "convex/server";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { ContentSection } from "@/components/workspace-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SettingsState, WorkItem } from "@/lib/types";
import { trackOptionalEvent } from "@/lib/telemetry";

type SalaryPlan = {
  _id: string;
  clientId: string;
  requiredProjectCount: number;
  amount: number;
  startDate: string;
  notes: string;
  archived: boolean;
};

type SalaryBatch = {
  _id: string;
  number: number;
  workType: string;
  requiredProjectCount: number;
  amount: number;
  projectIds: string[];
  salaryPlanId?: string;
  clientId?: string;
  clientName?: string;
  planStartDate?: string;
  planNotes?: string;
  completedAt: string;
  paid: boolean;
  received?: boolean;
  receivedAt?: string;
  correctionNote?: string;
};

type PlanDraft = {
  planId?: string;
  clientId: string;
  requiredProjectCount: string;
  amount: string;
  startDate: string;
  notes: string;
};

type SalaryPlanInput = {
  clientId: string;
  requiredProjectCount: number;
  amount: number;
  startDate: string;
  notes: string;
};

const salaryPlansApi = {
  list: makeFunctionReference<
    "query",
    { includeArchived?: boolean },
    SalaryPlan[]
  >("salaryPlans:list"),
  create: makeFunctionReference<"mutation", SalaryPlanInput, string>(
    "salaryPlans:create"
  ),
  update: makeFunctionReference<
    "mutation",
    {
      planId: string;
      changes: {
        clientId: string;
        requiredProjectCount: number;
        amount: number;
        startDate: string;
        notes: string;
        archived?: boolean;
      };
    },
    null
  >("salaryPlans:update"),
  setArchived: makeFunctionReference<
    "mutation",
    { planId: string; archived: boolean },
    null
  >("salaryPlans:setArchived"),
  listBatches: makeFunctionReference<
    "query",
    Record<string, never>,
    SalaryBatch[]
  >("salaryPlans:listBatches"),
  setReceived: makeFunctionReference<
    "mutation",
    { batchId: string; received: boolean; correctionNote?: string },
    null
  >("salaryPlans:setReceived"),
  setCorrectionNote: makeFunctionReference<
    "mutation",
    { batchId: string; correctionNote: string },
    null
  >("salaryPlans:setCorrectionNote"),
};

const emptyDraft: PlanDraft = {
  clientId: "",
  requiredProjectCount: "20",
  amount: "10000",
  startDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

type SalaryPlansPanelProps = {
  settings: SettingsState;
  projects: readonly WorkItem[];
  isOwner: boolean;
};

export function SalaryPlansPanel({
  settings,
  projects,
  isOwner,
}: SalaryPlansPanelProps) {
  const { isAuthenticated } = useConvexAuth();
  const enabled = isOwner && isAuthenticated;
  const plans = useQuery(
    salaryPlansApi.list,
    enabled ? { includeArchived: true } : "skip"
  );
  const batches = useQuery(salaryPlansApi.listBatches, enabled ? {} : "skip");
  const createPlan = useMutation(salaryPlansApi.create);
  const updatePlan = useMutation(salaryPlansApi.update);
  const setArchived = useMutation(salaryPlansApi.setArchived);
  const setReceived = useMutation(salaryPlansApi.setReceived);
  const setCorrectionNote = useMutation(salaryPlansApi.setCorrectionNote);
  const clients = useMemo(
    () => settings.clients.filter((client) => !client.archived),
    [settings.clients]
  );
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!draft.clientId && clients[0])
      setDraft((current) => ({ ...current, clientId: clients[0].id }));
  }, [clients, draft.clientId]);

  useEffect(() => {
    if (!batches) return;
    setCorrectionNotes((current) =>
      Object.fromEntries(
        batches.map((batch) => [
          batch._id,
          current[batch._id] ?? batch.correctionNote ?? "",
        ])
      )
    );
  }, [batches]);

  if (!isOwner) return null;

  async function savePlan() {
    const requiredProjectCount = Number(draft.requiredProjectCount);
    const amount = Number(draft.amount);
    if (
      !draft.clientId ||
      !Number.isInteger(requiredProjectCount) ||
      requiredProjectCount < 1 ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      !draft.startDate
    ) {
      setError("Choose a client and enter valid plan terms.");
      return;
    }
    setBusy("plan");
    setError("");
    try {
      const changes = {
        clientId: draft.clientId,
        requiredProjectCount,
        amount,
        startDate: draft.startDate,
        notes: draft.notes,
      };
      if (draft.planId) await updatePlan({ planId: draft.planId, changes });
      else await createPlan(changes);
      trackOptionalEvent("salary_plan_used", {
        action: draft.planId ? "update" : "create",
      });
      setDraft({
        ...emptyDraft,
        clientId: draft.clientId,
        startDate: draft.startDate,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save the Salary Plan."
      );
    } finally {
      setBusy("");
    }
  }

  async function toggleArchived(plan: SalaryPlan) {
    setBusy(plan._id);
    setError("");
    try {
      await setArchived({ planId: plan._id, archived: !plan.archived });
      trackOptionalEvent("salary_plan_used", {
        action: plan.archived ? "restore" : "archive",
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update the Salary Plan."
      );
    } finally {
      setBusy("");
    }
  }

  async function toggleReceived(batch: SalaryBatch) {
    setBusy(batch._id);
    setError("");
    try {
      await setReceived({
        batchId: batch._id,
        received: !(batch.received ?? batch.paid),
        correctionNote:
          correctionNotes[batch._id] ?? batch.correctionNote ?? "",
      });
      trackOptionalEvent("salary_batch_used", {
        action: (batch.received ?? batch.paid) ? "unreceived" : "received",
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update payment state."
      );
    } finally {
      setBusy("");
    }
  }

  async function saveCorrectionNote(batch: SalaryBatch) {
    setBusy(`note-${batch._id}`);
    setError("");
    try {
      await setCorrectionNote({
        batchId: batch._id,
        correctionNote: correctionNotes[batch._id] ?? "",
      });
      trackOptionalEvent("salary_batch_used", { action: "correction_note" });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save the correction note."
      );
    } finally {
      setBusy("");
    }
  }

  if (!isAuthenticated) {
    return (
      <ContentSection
        title="Salary Plans"
        description="Owner-only plan management for authenticated workspaces."
      >
        <p className="text-sm text-muted-foreground">
          Local mode keeps using the legacy salary settings below. Sign in to
          create durable Salary Plans and payment batches.
        </p>
      </ContentSection>
    );
  }

  const visiblePlans = (plans ?? []).filter(
    (plan) => showArchived || !plan.archived
  );
  const planById = new Map((plans ?? []).map((plan) => [plan._id, plan]));
  const clientName = (clientId?: string) =>
    clients.find((client) => client.id === clientId)?.name ?? "Unknown client";
  const money = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: settings.currencyCode,
    }).format(value);

  return (
    <ContentSection
      title="Salary Plans"
      description="Create owner-managed terms. Completed batches keep their original client, amount, count, and project IDs."
      metadata={<Badge variant="secondary">Owner only</Badge>}
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowArchived((current) => !current)}
        >
          {showArchived ? "Hide archived" : "Show archived"}
        </Button>
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-3 rounded-md border border-border/70 p-3">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <FieldLayout label="Client" controlId="salary-plan-client">
              <Select
                value={draft.clientId || undefined}
                onValueChange={(clientId) => setDraft({ ...draft, clientId })}
              >
                <SelectTrigger id="salary-plan-client" className="w-full">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldLayout>
            <FieldLayout label="Projects per batch">
              <Input
                type="number"
                min={1}
                step={1}
                value={draft.requiredProjectCount}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    requiredProjectCount: event.target.value,
                  })
                }
              />
            </FieldLayout>
            <FieldLayout label="Batch amount">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={draft.amount}
                onChange={(event) =>
                  setDraft({ ...draft, amount: event.target.value })
                }
              />
            </FieldLayout>
            <FieldLayout label="Start date">
              <Input
                type="date"
                value={draft.startDate}
                onChange={(event) =>
                  setDraft({ ...draft, startDate: event.target.value })
                }
              />
            </FieldLayout>
            <FieldLayout label="Notes">
              <Input
                value={draft.notes}
                maxLength={4000}
                onChange={(event) =>
                  setDraft({ ...draft, notes: event.target.value })
                }
              />
            </FieldLayout>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy === "plan" || !clients.length}
              onClick={() => void savePlan()}
            >
              {busy === "plan"
                ? "Saving..."
                : draft.planId
                  ? "Save plan"
                  : "Create plan"}
            </Button>
            {draft.planId ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setDraft({ ...emptyDraft, clientId: clients[0]?.id ?? "" })
                }
              >
                Cancel edit
              </Button>
            ) : null}
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="grid gap-3">
          {visiblePlans.map((plan) => {
            const planBatches = (batches ?? []).filter(
              (batch) => batch.salaryPlanId === plan._id
            );
            const settledProjectIds = new Set(
              planBatches.flatMap((batch) => batch.projectIds)
            );
            const progress = projects.filter(
              (project) =>
                project.salaryPlanId === plan._id &&
                project.status === "Delivered" &&
                !settledProjectIds.has(project.id)
            ).length;
            return (
              <div
                key={plan._id}
                className="grid gap-3 border-t border-border/70 pt-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">
                        {clientName(plan.clientId)}
                      </h3>
                      {plan.archived ? (
                        <Badge variant="outline">Archived</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {progress} / {plan.requiredProjectCount} projects toward
                      next batch · {money(plan.amount)} per completed batch ·
                      starts {plan.startDate}
                    </p>
                    {plan.notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {plan.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDraft({
                          planId: plan._id,
                          clientId: plan.clientId,
                          requiredProjectCount: String(
                            plan.requiredProjectCount
                          ),
                          amount: String(plan.amount),
                          startDate: plan.startDate,
                          notes: plan.notes,
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy === plan._id}
                      onClick={() => void toggleArchived(plan)}
                    >
                      {plan.archived ? "Restore" : "Archive"}
                    </Button>
                  </div>
                </div>
                {planBatches.length ? (
                  <div className="overflow-x-auto">
                    <Table className="w-full min-w-[680px] text-left text-xs">
                      <TableHeader className="text-muted-foreground">
                        <TableRow>
                          <TableHead className="pb-2 pr-3">Batch</TableHead>
                          <TableHead className="pb-2 pr-3">Snapshot</TableHead>
                          <TableHead className="pb-2 pr-3">Projects</TableHead>
                          <TableHead className="pb-2 pr-3">Completed</TableHead>
                          <TableHead className="pb-2">Payment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {planBatches.map((batch) => (
                          <TableRow
                            key={batch._id}
                            className="border-t border-border/60 align-top"
                          >
                            <TableCell className="py-3 pr-3 font-medium">
                              #{batch.number}
                            </TableCell>
                            <TableCell className="py-3 pr-3">
                              {batch.clientName ??
                                clientName(batch.clientId ?? plan.clientId)}
                              <br />
                              {money(batch.amount)} ·{" "}
                              {batch.requiredProjectCount} projects
                            </TableCell>
                            <TableCell className="py-3 pr-3">
                              {batch.projectIds.length} linked IDs
                            </TableCell>
                            <TableCell className="py-3 pr-3">
                              {new Date(batch.completedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant={
                                    (batch.received ?? batch.paid)
                                      ? "secondary"
                                      : "outline"
                                  }
                                  size="sm"
                                  disabled={busy === batch._id}
                                  onClick={() => void toggleReceived(batch)}
                                >
                                  {(batch.received ?? batch.paid)
                                    ? "Received"
                                    : "Mark received"}
                                </Button>
                              </div>
                              <div className="mt-2 flex gap-2">
                                <Textarea
                                  className="min-h-16 text-xs"
                                  placeholder="Correction note"
                                  value={correctionNotes[batch._id] ?? ""}
                                  maxLength={4000}
                                  onChange={(event) =>
                                    setCorrectionNotes((current) => ({
                                      ...current,
                                      [batch._id]: event.target.value,
                                    }))
                                  }
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy === `note-${batch._id}`}
                                  onClick={() => void saveCorrectionNote(batch)}
                                >
                                  Save note
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No completed batches yet. Progress counts linked project IDs
                    only, so partial work never adds money.
                  </p>
                )}
              </div>
            );
          })}
          {!visiblePlans.length ? (
            <p className="text-sm text-muted-foreground">
              No Salary Plans yet. Create one above.
            </p>
          ) : null}
        </div>
        {(batches ?? []).some(
          (batch) => !batch.salaryPlanId || !planById.has(batch.salaryPlanId)
        ) ? (
          <p className="text-xs text-muted-foreground">
            Legacy salary batches remain visible in Reports. New plans do not
            rewrite their snapshots.
          </p>
        ) : null}
      </div>
    </ContentSection>
  );
}
