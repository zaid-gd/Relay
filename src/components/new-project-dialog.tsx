"use client";

import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import type { Client, ProjectGroup, SalaryPlan, SavedProjectTemplate } from "@/lib/types";
import { newProjectFormSchema, type NewProjectFormValues, type NewProjectInput } from "@/features/projects/project-domain";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type NewProjectDialogProps = {
  open: boolean;
  clients: readonly Client[];
  projectGroups: readonly ProjectGroup[];
  workflowTemplates: readonly SavedProjectTemplate[];
  initialTemplateId?: string;
  salaryPlanLabel: string;
  salaryPlans?: readonly SalaryPlan[];
  currencyCode?: string;
  onCreateClient: (input: Pick<Client, "name" | "email" | "company">) => Client | null;
  onClose: () => void;
  onCreate: (input: NewProjectInput) => void;
};

const defaultDueDate = () => new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

const defaultValues = (initialTemplateId: string): NewProjectFormValues => ({
  name: "",
  clientId: "",
  projectGroupId: "",
  workflowTemplateId: initialTemplateId,
  dueDate: defaultDueDate(),
  financialType: "client",
  salaryPlanId: "",
});

export function NewProjectDialog({ open, clients, projectGroups, workflowTemplates, initialTemplateId = "", salaryPlanLabel, salaryPlans, currencyCode = "USD", onCreateClient, onClose, onCreate }: NewProjectDialogProps) {
  const activeClients = clients.filter((client) => !client.archived);
  const activeTemplates = workflowTemplates.filter((template) => !template.archived);
  const activeSalaryPlans = salaryPlans?.filter((plan) => !plan.archived) ?? [];
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientDraft, setClientDraft] = useState({ name: "", email: "", company: "" });
  const [clientError, setClientError] = useState("");
  const form = useForm({
    defaultValues: defaultValues(initialTemplateId),
    validators: { onSubmit: newProjectFormSchema },
    onSubmit: ({ value }) => onCreate({
      name: value.name.trim(),
      clientId: value.clientId,
      ...(value.projectGroupId ? { projectGroupId: value.projectGroupId } : {}),
      ...(value.workflowTemplateId ? { workflowTemplateId: value.workflowTemplateId } : {}),
      dueDate: value.dueDate,
      financialType: value.financialType,
      ...(value.salaryPlanId ? { salaryPlanId: value.salaryPlanId } : {}),
    }),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaultValues(initialTemplateId));
    setCreatingClient(false);
    setClientDraft({ name: "", email: "", company: "" });
    setClientError("");
  }, [form, initialTemplateId, open]);

  function createClient() {
    if (!clientDraft.name.trim()) {
      setClientError("Client name is required.");
      return;
    }
    const client = onCreateClient(clientDraft);
    if (!client) {
      setClientError("That Client could not be created.");
      return;
    }
    form.setFieldValue("clientId", client.id);
    form.setFieldValue("projectGroupId", "");
    setCreatingClient(false);
    setClientError("");
  }

  function requestClose() {
    const hasClientDraft = Object.values(clientDraft).some((value) => value.trim());
    if ((form.state.isDirty || hasClientDraft) && typeof window !== "undefined" && !window.confirm("Discard this unfinished Project?")) return;
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) requestClose(); }}>
      <DialogContent className="studio-motion-gooey border-border bg-background text-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>Start with the choices needed to schedule the work.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void form.handleSubmit(); }}>
          <form.Field name="name">
            {(field) => <FieldLayout label="Project name"><Input autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} /></FieldLayout>}
          </form.Field>
          <form.Field name="clientId">
            {(field) => (
              <FieldLayout label="Client">
                <div>
                <form.Subscribe selector={(state) => state.values.salaryPlanId}>
                  {(salaryPlanId) => {
                    const selectedPlan = activeSalaryPlans.find((plan) => plan.id === salaryPlanId);
                    return <>
                      <Select disabled={Boolean(selectedPlan)} value={field.state.value} onValueChange={(value) => { field.handleChange(value); form.setFieldValue("projectGroupId", ""); }}>
                        <SelectTrigger><SelectValue placeholder="Choose a Client" /></SelectTrigger>
                        <SelectContent>{activeClients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="sm" className="mt-1 px-0" disabled={Boolean(selectedPlan)} onClick={() => setCreatingClient((current) => !current)}>Create new Client</Button>
                    </>;
                  }}
                </form.Subscribe>
                {creatingClient ? <div className="mt-2 grid gap-2 border-l border-border pl-3">
                  <Input aria-label="New Client name" placeholder="Client name" value={clientDraft.name} onChange={(event) => setClientDraft((current) => ({ ...current, name: event.target.value }))} />
                  <div className="grid gap-2 sm:grid-cols-2"><Input aria-label="New Client email" type="email" placeholder="Email (optional)" value={clientDraft.email} onChange={(event) => setClientDraft((current) => ({ ...current, email: event.target.value }))} /><Input aria-label="New Client company" placeholder="Company (optional)" value={clientDraft.company} onChange={(event) => setClientDraft((current) => ({ ...current, company: event.target.value }))} /></div>
                  {clientError ? <p role="alert" className="text-sm text-destructive">{clientError}</p> : null}
                  <div className="flex gap-2"><Button type="button" size="sm" onClick={createClient}>Add Client</Button><Button type="button" size="sm" variant="ghost" onClick={() => setCreatingClient(false)}>Cancel</Button></div>
                </div> : null}
                </div>
              </FieldLayout>
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.values.clientId}>
            {(clientId) => (
              <form.Field name="projectGroupId">
                {(field) => (
                  <FieldLayout label="Project Group" description="Optional">
                    <Select value={field.state.value || "none"} onValueChange={(value) => field.handleChange(value === "none" ? "" : value)}>
                      <SelectTrigger><SelectValue placeholder="No Project Group" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Project Group</SelectItem>
                        {projectGroups.filter((group) => !group.archived && group.clientId === clientId).map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldLayout>
                )}
              </form.Field>
            )}
          </form.Subscribe>
          <form.Field name="workflowTemplateId">
            {(field) => (
              <FieldLayout label="Workflow Template">
                <Select value={field.state.value || "none"} onValueChange={(value) => field.handleChange(value === "none" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="No Template" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">No Template</SelectItem>{activeTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldLayout>
            )}
          </form.Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="dueDate">{(field) => <FieldLayout label="Due date"><Input type="date" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></FieldLayout>}</form.Field>
            <form.Field name="financialType">
              {(field) => <FieldLayout label="Financial type"><Select value={field.state.value} onValueChange={(value) => { if (value === "client" || value === "salary-plan") { field.handleChange(value); if (value === "client") form.setFieldValue("salaryPlanId", ""); } }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="client">Client Project</SelectItem><SelectItem disabled={salaryPlans !== undefined && activeSalaryPlans.length === 0} value="salary-plan">{salaryPlanLabel}</SelectItem></SelectContent></Select></FieldLayout>}
            </form.Field>
          </div>
          <form.Subscribe selector={(state) => state.values.financialType}>
            {(financialType) => financialType === "salary-plan" && salaryPlans !== undefined ? (
              <form.Field name="salaryPlanId">
                {(field) => <FieldLayout label="Salary Plan" description="The Plan fixes the Client and keeps Project earnings at zero.">
                  <Select value={field.state.value || "none"} onValueChange={(value) => {
                    const plan = activeSalaryPlans.find((candidate) => candidate.id === value);
                    field.handleChange(value === "none" ? "" : value);
                    if (plan) {
                      form.setFieldValue("clientId", plan.clientId);
                      form.setFieldValue("projectGroupId", "");
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Choose a Salary Plan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Choose a Salary Plan</SelectItem>
                      {activeSalaryPlans.map((plan) => {
                        const client = activeClients.find((candidate) => candidate.id === plan.clientId);
                        const amount = new Intl.NumberFormat("en", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(plan.amount);
                        return <SelectItem key={plan.id} value={plan.id}>{client?.name ?? "Unknown Client"} · {plan.requiredProjectCount} Projects · {amount}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </FieldLayout>}
              </form.Field>
            ) : null}
          </form.Subscribe>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={requestClose}>Cancel</Button>
                <Button type="submit" disabled={!canSubmit || isSubmitting}>{isSubmitting ? "Creating..." : "Create Project"}</Button>
              </DialogFooter>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
