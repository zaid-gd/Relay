"use client";

import { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import type { Client, ProjectGroup, SavedProjectTemplate } from "@/lib/types";
import type { NewProjectInput } from "@/features/projects/project-domain";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const newProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required."),
  clientId: z.string().min(1, "Client is required."),
  projectGroupId: z.string(),
  workflowTemplateId: z.string(),
  dueDate: z.iso.date("Choose a valid due date."),
  financialType: z.enum(["client", "salary-plan"]),
});

type NewProjectDialogProps = {
  open: boolean;
  clients: readonly Client[];
  projectGroups: readonly ProjectGroup[];
  workflowTemplates: readonly SavedProjectTemplate[];
  initialTemplateId?: string;
  onClose: () => void;
  onCreate: (input: NewProjectInput) => void;
};

const defaultDueDate = () => new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

type NewProjectFormValues = {
  name: string;
  clientId: string;
  projectGroupId: string;
  workflowTemplateId: string;
  dueDate: string;
  financialType: NewProjectInput["financialType"];
};

const defaultValues = (initialTemplateId: string): NewProjectFormValues => ({
  name: "",
  clientId: "",
  projectGroupId: "",
  workflowTemplateId: initialTemplateId,
  dueDate: defaultDueDate(),
  financialType: "client",
});

export function NewProjectDialog({ open, clients, projectGroups, workflowTemplates, initialTemplateId = "", onClose, onCreate }: NewProjectDialogProps) {
  const activeClients = clients.filter((client) => !client.archived);
  const activeTemplates = workflowTemplates.filter((template) => !template.archived);
  const form = useForm({
    defaultValues: defaultValues(initialTemplateId),
    validators: { onSubmit: newProjectSchema },
    onSubmit: ({ value }) => onCreate({
      name: value.name.trim(),
      clientId: value.clientId,
      ...(value.projectGroupId ? { projectGroupId: value.projectGroupId } : {}),
      ...(value.workflowTemplateId ? { workflowTemplateId: value.workflowTemplateId } : {}),
      dueDate: value.dueDate,
      financialType: value.financialType,
    }),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaultValues(initialTemplateId));
  }, [form, initialTemplateId, open]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="border-border bg-background text-foreground sm:max-w-lg">
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
                <Select value={field.state.value} onValueChange={(value) => { field.handleChange(value); form.setFieldValue("projectGroupId", ""); }}>
                  <SelectTrigger><SelectValue placeholder="Choose a Client" /></SelectTrigger>
                  <SelectContent>{activeClients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent>
                </Select>
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
              {(field) => <FieldLayout label="Financial type"><Select value={field.state.value} onValueChange={(value) => { if (value === "client" || value === "salary-plan") field.handleChange(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="client">Client Project</SelectItem><SelectItem value="salary-plan">Salary Plan</SelectItem></SelectContent></Select></FieldLayout>}
            </form.Field>
          </div>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={!canSubmit || isSubmitting}>{isSubmitting ? "Creating..." : "Create Project"}</Button>
              </DialogFooter>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
