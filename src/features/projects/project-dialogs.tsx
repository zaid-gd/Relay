import {
  AlertDialog as OwnedAlertDialog,
  AlertDialogAction as OwnedAlertDialogAction,
  AlertDialogCancel as OwnedAlertDialogCancel,
  AlertDialogContent as OwnedAlertDialogContent,
  AlertDialogDescription as OwnedAlertDialogDescription,
  AlertDialogFooter as OwnedAlertDialogFooter,
  AlertDialogHeader as OwnedAlertDialogHeader,
  AlertDialogTitle as OwnedAlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import {
  Command as OwnedCommand,
  CommandEmpty as OwnedCommandEmpty,
  CommandGroup as OwnedCommandGroup,
  CommandInput as OwnedCommandInput,
  CommandItem as OwnedCommandItem,
  CommandList as OwnedCommandList,
} from "@/components/ui/command";
import {
  Dialog as OwnedDialog,
  DialogContent as OwnedDialogContent,
  DialogDescription as OwnedDialogDescription,
  DialogFooter as OwnedDialogFooter,
  DialogHeader as OwnedDialogHeader,
  DialogTitle as OwnedDialogTitle,
} from "@/components/ui/dialog";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input as OwnedInput } from "@/components/ui/input";
import {
  Popover as OwnedPopover,
  PopoverContent as OwnedPopoverContent,
  PopoverTrigger as OwnedPopoverTrigger,
} from "@/components/ui/popover";
import {
  Select as OwnedSelect,
  SelectContent as OwnedSelectContent,
  SelectItem as OwnedSelectItem,
  SelectTrigger as OwnedSelectTrigger,
  SelectValue as OwnedSelectValue,
} from "@/components/ui/select";
import { Textarea as OwnedTextarea } from "@/components/ui/textarea";
import {
  APPROVAL_STATUS_LABELS,
  FILE_CATEGORY_VALUES,
  FILE_STATUS_VALUES,
  PROJECT_STATUS_VALUES,
  type ProjectStatus,
} from "@/lib/domain-values";
import { DEFAULT_PROFILE_ID, getProfile } from "@/lib/profiles";
import type { SettingsState, WorkItem, WorkTypeConfig } from "@/lib/types";
import { workflowStagesFromLabels } from "@/lib/workflow-templates";
import {
  CalendarDays,
  Check,
  ChevronsUpDown,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, type ReactNode, type RefObject } from "react";
import type { WorkspaceMemberOption } from "./project-view";
import { ProjectSelect } from "@/features/projects/project-select";

const statusOptions: ProjectStatus[] = [...PROJECT_STATUS_VALUES];
const profile = getProfile(DEFAULT_PROFILE_ID);

function isSalaryWorkType(value: string, settings: SettingsState) {
  return (
    value.trim().toLowerCase() === settings.salaryWorkType.trim().toLowerCase()
  );
}

function getTypeConfig(label: string, settings: SettingsState): WorkTypeConfig {
  if (isSalaryWorkType(label, settings))
    return { label, earningsMode: "batch" };
  return (
    profile.typeOptions.find(
      (type) => type.label.toLowerCase() === label.toLowerCase()
    ) ?? { label, earningsMode: "manual" }
  );
}

function canonicalWorkType(value: string, options: string[]) {
  const trimmed = value.trim();
  return (
    options.find((option) => option.toLowerCase() === trimmed.toLowerCase()) ??
    trimmed
  );
}

function findExistingClientName(value: string, options: string[]) {
  const key = value.trim().toLowerCase();
  return key
    ? (options.find((option) => option.toLowerCase() === key) ?? "")
    : "";
}

function canonicalClientName(value: string, options: string[]) {
  const trimmed = value.trim();
  return findExistingClientName(trimmed, options) || trimmed;
}

function clientSuggestionText(value: string, options: string[]) {
  const existing = findExistingClientName(value, options);
  if (existing && existing !== value.trim())
    return `Will use existing client "${existing}" instead of creating a duplicate.`;
  return options.length
    ? "Select an existing client or type a new client name."
    : "Typing a client name creates it when the project is saved.";
}

function checklistItemKey(item: string, index: number) {
  return `${index}:${item.trim()}`.slice(0, 160);
}

function normalizeChecklistCompleted(
  items: string[] = [],
  completed: Record<string, boolean> = {}
) {
  const allowed = new Set(items.map(checklistItemKey));
  return Object.fromEntries(
    Object.entries(completed).filter(
      ([key, value]) => allowed.has(key) && value
    )
  );
}

function todayDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function weekdayIndex(day: string) {
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
  return index >= 0 ? index : 1;
}

function calendarMonthDays(month: Date, weekStart: string) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(
    first.getDate() - ((first.getDay() - weekdayIndex(weekStart) + 7) % 7)
  );
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date };
  });
}

function orderedWeekdays(weekStart: string) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const start = weekdayIndex(weekStart);
  return [...days.slice(start), ...days.slice(0, start)];
}

function formatDate(value: string, dateFormat: string) {
  if (dateFormat === "YYYY-MM-DD") return value;
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(
    "en",
    dateFormat === "Day Month Year"
      ? { day: "2-digit", month: "short", year: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" }
  ).format(date);
}

export function ProjectDialog({
  open,
  editing,
  returnFocusRef,
  form,
  onFormChange,
  formError,
  clientOptions,
  workTypeOptions,
  settings,
  teamMembers,
  integrationEditor,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
  form: WorkItem;
  onFormChange: (form: WorkItem) => void;
  formError: string;
  clientOptions: string[];
  workTypeOptions: string[];
  settings: SettingsState;
  teamMembers: WorkspaceMemberOption[];
  integrationEditor: ReactNode;
  onClose: () => void;
  onSave: () => void;
}) {
  const selectedWorkType = workTypeOptions.some(
    (option) => option.toLowerCase() === form.workType.toLowerCase()
  )
    ? canonicalWorkType(form.workType, workTypeOptions)
    : workTypeOptions[0];
  const typeConfig = getTypeConfig(selectedWorkType, settings);
  return (
    <OwnedDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <OwnedDialogContent
        className="max-h-[min(94dvh,900px)] overflow-y-auto border-border bg-background text-foreground sm:max-w-2xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <OwnedDialogHeader>
          <OwnedDialogTitle className="text-2xl">
            {editing ? "Edit Project" : "New Project"}
          </OwnedDialogTitle>
          <OwnedDialogDescription>
            Set the schedule, ownership, and production details for this
            project.
          </OwnedDialogDescription>
        </OwnedDialogHeader>
        <div className="grid gap-5">
          <FieldLayout label="Project name">
            <OwnedInput
              value={form.title}
              onChange={(event) =>
                onFormChange({ ...form, title: event.target.value })
              }
            />
          </FieldLayout>
          <ProjectClientCombobox
            value={form.client || ""}
            options={clientOptions}
            onChange={(client) => onFormChange({ ...form, client })}
            disabled={Boolean(form.salaryPlanId)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ProjectSelect
              label="Status"
              value={form.status}
              options={statusOptions}
              onChange={(value) => onFormChange({ ...form, status: value })}
            />
            <ProjectSelect
              label="Tag"
              value={selectedWorkType}
              options={workTypeOptions}
              disabled={Boolean(form.salaryPlanId)}
              onChange={(value) =>
                onFormChange({ ...form, workType: value, earnings: 0 })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProjectDatePicker
              label="Start date"
              value={form.startDate}
              settings={settings}
              onChange={(value) => onFormChange({ ...form, startDate: value })}
            />
            <ProjectDatePicker
              label="Due date"
              value={form.dueDate}
              settings={settings}
              onChange={(value) => onFormChange({ ...form, dueDate: value })}
            />
          </div>
          <FieldLayout
            label="Earnings"
            disabled={
              Boolean(form.salaryPlanId) || typeConfig.earningsMode === "batch"
            }
            description={
              form.salaryPlanId
                ? "This Salary Plan fixes the Client and tracks money only when a full batch completes."
                : typeConfig.earningsMode === "batch"
                  ? `${settings.salaryWorkType} earnings are batch tracked in settings.`
                  : undefined
            }
          >
            <OwnedInput
              type="number"
              disabled={
                Boolean(form.salaryPlanId) ||
                typeConfig.earningsMode === "batch"
              }
              value={form.earnings}
              onChange={(event) =>
                onFormChange({
                  ...form,
                  earnings: Number(event.target.value || 0),
                })
              }
            />
          </FieldLayout>
          <FieldLayout label="Notes">
            <OwnedTextarea
              value={form.notes}
              onChange={(event) =>
                onFormChange({ ...form, notes: event.target.value })
              }
              density="comfortable"
            />
          </FieldLayout>
          <TemplateSetupEditor form={form} onFormChange={onFormChange} />
          {form.teamId && teamMembers.length ? (
            <ProjectAssigneeCombobox
              options={teamMembers}
              value={form.assigneeUserIds ?? []}
              onChange={(assigneeUserIds) =>
                onFormChange({ ...form, assigneeUserIds })
              }
            />
          ) : null}
          {integrationEditor}
          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}
        </div>
        <OwnedDialogFooter>
          <OwnedButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </OwnedButton>
          <OwnedButton type="button" onClick={onSave}>
            Save
          </OwnedButton>
        </OwnedDialogFooter>
      </OwnedDialogContent>
    </OwnedDialog>
  );
}

function ProjectClientCombobox({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <OwnedPopover open={open} onOpenChange={setOpen}>
      <FieldLayout
        label="Client"
        disabled={disabled}
        description={
          disabled
            ? "Fixed by the selected Salary Plan."
            : clientSuggestionText(value, options)
        }
      >
        <OwnedPopoverTrigger asChild>
          <OwnedButton
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span
              className={value ? "truncate" : "truncate text-muted-foreground"}
            >
              {value ||
                (options.length
                  ? "Choose existing or type new client"
                  : "Type a new client name")}
            </span>
            <ChevronsUpDown className="opacity-50" aria-hidden="true" />
          </OwnedButton>
        </OwnedPopoverTrigger>
      </FieldLayout>
      <OwnedPopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <OwnedCommand>
          <OwnedCommandInput
            placeholder="Search or type a client..."
            value={value}
            onValueChange={onChange}
          />
          <OwnedCommandList>
            <OwnedCommandEmpty>
              Press Escape to keep “{value}”.
            </OwnedCommandEmpty>
            <OwnedCommandGroup>
              {options.map((option) => (
                <OwnedCommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(canonicalClientName(option, options));
                    setOpen(false);
                  }}
                >
                  <Check
                    className={
                      option.toLowerCase() === value.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0"
                    }
                    aria-hidden="true"
                  />
                  {option}
                </OwnedCommandItem>
              ))}
            </OwnedCommandGroup>
          </OwnedCommandList>
        </OwnedCommand>
      </OwnedPopoverContent>
    </OwnedPopover>
  );
}

function ProjectAssigneeCombobox({
  options,
  value,
  onChange,
}: {
  options: WorkspaceMemberOption[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((option) => value.includes(option.userId));
  return (
    <OwnedPopover open={open} onOpenChange={setOpen}>
      <FieldLayout
        label="Assigned team members"
        description="Assigned members receive project notifications when this project changes."
      >
        <OwnedPopoverTrigger asChild>
          <OwnedButton
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-9 w-full justify-between whitespace-normal font-normal"
          >
            <span
              className={
                selected.length ? "text-left" : "text-muted-foreground"
              }
            >
              {selected.length
                ? selected
                    .map((member) => member.name || member.email)
                    .join(", ")
                : "Choose team members"}
            </span>
            <ChevronsUpDown className="opacity-50" aria-hidden="true" />
          </OwnedButton>
        </OwnedPopoverTrigger>
      </FieldLayout>
      <OwnedPopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <OwnedCommand>
          <OwnedCommandInput placeholder="Search team members..." />
          <OwnedCommandList>
            <OwnedCommandEmpty>No team member found.</OwnedCommandEmpty>
            <OwnedCommandGroup>
              {options.map((option) => {
                const checked = value.includes(option.userId);
                return (
                  <OwnedCommandItem
                    key={option.userId}
                    value={`${option.name} ${option.email} ${option.role}`}
                    onSelect={() =>
                      onChange(
                        checked
                          ? value.filter((userId) => userId !== option.userId)
                          : [...value, option.userId]
                      )
                    }
                  >
                    <Check
                      className={checked ? "opacity-100" : "opacity-0"}
                      aria-hidden="true"
                    />
                    <span className="grid">
                      <span className="font-medium">
                        {option.name || option.email || "Team member"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {option.role} · {option.email || "No email"}
                      </span>
                    </span>
                  </OwnedCommandItem>
                );
              })}
            </OwnedCommandGroup>
          </OwnedCommandList>
        </OwnedCommand>
      </OwnedPopoverContent>
    </OwnedPopover>
  );
}

function TemplateSetupEditor({
  form,
  onFormChange,
}: {
  form: WorkItem;
  onFormChange: (form: WorkItem) => void;
}) {
  const hasTemplateSetup = Boolean(
    form.templateId ||
    form.workflowStages?.length ||
    form.templateDeliverables?.length ||
    form.checklistItems?.length
  );
  if (!hasTemplateSetup) return null;

  const deliverables = form.templateDeliverables ?? [];
  return (
    <section className="rounded-md border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Template Setup</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            These are suggestions, not locked rules. Edit or remove anything.
          </p>
        </div>
        <OwnedBadge variant="secondary">Editable</OwnedBadge>
      </div>
      <div className="mt-4 grid gap-4">
        <FieldLayout
          label="Project type"
          description="A descriptive type for this workflow; the project tag above still controls reporting and salary batches."
        >
          <OwnedInput
            value={form.templateProjectType ?? ""}
            onChange={(event) =>
              onFormChange({ ...form, templateProjectType: event.target.value })
            }
          />
        </FieldLayout>
        <FieldLayout label="Workflow stages" description="One stage per line.">
          <OwnedTextarea
            value={(form.workflowStages ?? [])
              .map((stage) => stage.label)
              .join("\n")}
            onChange={(event) =>
              onFormChange({
                ...form,
                workflowStages: workflowStagesFromLabels(
                  event.target.value.split("\n").slice(0, 12),
                  form.workflowStages
                ),
              })
            }
            density="comfortable"
          />
        </FieldLayout>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">Suggested deliverables</h4>
            <OwnedButton
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                onFormChange({
                  ...form,
                  templateDeliverables: [
                    ...deliverables,
                    {
                      title: "New deliverable",
                      category: "Deliverable",
                      initialStatus: "draft",
                    },
                  ],
                })
              }
            >
              <Plus aria-hidden="true" />
              Add
            </OwnedButton>
          </div>
          <div className="grid gap-2">
            {deliverables.map((deliverable, index) => (
              <div
                key={`template-deliverable-${index}`}
                className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_140px_170px_auto]"
              >
                <FieldLayout label="Deliverable">
                  <OwnedInput
                    value={deliverable.title}
                    onChange={(event) =>
                      onFormChange({
                        ...form,
                        templateDeliverables: deliverables.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, title: event.target.value }
                              : item
                        ),
                      })
                    }
                  />
                </FieldLayout>
                <ProjectSelect
                  label="Category"
                  value={deliverable.category}
                  options={FILE_CATEGORY_VALUES}
                  onChange={(category) =>
                    onFormChange({
                      ...form,
                      templateDeliverables: deliverables.map(
                        (item, itemIndex) =>
                          itemIndex === index ? { ...item, category } : item
                      ),
                    })
                  }
                />
                <ProjectSelect
                  label="Initial status"
                  value={deliverable.initialStatus}
                  options={FILE_STATUS_VALUES}
                  labels={APPROVAL_STATUS_LABELS}
                  onChange={(initialStatus) =>
                    onFormChange({
                      ...form,
                      templateDeliverables: deliverables.map(
                        (item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, initialStatus }
                            : item
                      ),
                    })
                  }
                />
                <OwnedButton
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${deliverable.title}`}
                  onClick={() =>
                    onFormChange({
                      ...form,
                      templateDeliverables: deliverables.filter(
                        (_, itemIndex) => itemIndex !== index
                      ),
                    })
                  }
                  className="text-destructive"
                >
                  <Trash2 aria-hidden="true" />
                </OwnedButton>
              </div>
            ))}
          </div>
        </div>
        <FieldLayout
          label="Checklist"
          description="One checklist item per line."
        >
          <OwnedTextarea
            value={(form.checklistItems ?? []).join("\n")}
            onChange={(event) => {
              const checklistItems = event.target.value
                .split("\n")
                .slice(0, 20);
              onFormChange({
                ...form,
                checklistItems,
                checklistCompleted: normalizeChecklistCompleted(
                  checklistItems,
                  form.checklistCompleted
                ),
              });
            }}
            density="comfortable"
          />
        </FieldLayout>
      </div>
    </section>
  );
}

export function DeleteProjectDialog({
  project,
  onCancel,
  onConfirm,
}: {
  project: WorkItem | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <OwnedAlertDialog
      open={Boolean(project)}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <OwnedAlertDialogContent
        size="sm"
        className="border-border bg-background text-foreground"
      >
        <OwnedAlertDialogHeader>
          <OwnedAlertDialogTitle>Delete project?</OwnedAlertDialogTitle>
          <OwnedAlertDialogDescription>
            {project
              ? `"${project.title}" will be removed from your tracker.`
              : "This project will be removed from your tracker."}
          </OwnedAlertDialogDescription>
        </OwnedAlertDialogHeader>
        <OwnedAlertDialogFooter>
          <OwnedAlertDialogCancel onClick={onCancel}>
            Cancel
          </OwnedAlertDialogCancel>
          <OwnedAlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </OwnedAlertDialogAction>
        </OwnedAlertDialogFooter>
      </OwnedAlertDialogContent>
    </OwnedAlertDialog>
  );
}

function ProjectDatePicker({
  label,
  value,
  settings,
  onChange,
}: {
  label: string;
  value: string;
  settings: SettingsState;
  onChange: (value: string) => void;
}) {
  const selected = isIsoDate(value)
    ? new Date(`${value}T00:00:00`)
    : todayDate();
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  );
  const monthDays = calendarMonthDays(visibleMonth, settings.weekStart);
  const weekdays = orderedWeekdays(settings.weekStart);
  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  function shiftMonth(offset: number) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  }

  function chooseDate(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <OwnedPopover open={open} onOpenChange={setOpen}>
      <FieldLayout label={label}>
        <OwnedPopoverTrigger asChild>
          <OwnedButton
            type="button"
            variant="outline"
            className="w-full justify-start font-normal"
            onClick={() => {
              const nextSelected = isIsoDate(value)
                ? new Date(`${value}T00:00:00`)
                : todayDate();
              setVisibleMonth(
                new Date(nextSelected.getFullYear(), nextSelected.getMonth(), 1)
              );
            }}
          >
            <CalendarDays aria-hidden="true" />
            {isIsoDate(value)
              ? formatDate(value, settings.dateFormat)
              : "Choose date"}
          </OwnedButton>
        </OwnedPopoverTrigger>
      </FieldLayout>
      <OwnedPopoverContent
        align="start"
        className="w-[330px] max-w-[calc(100vw-2rem)] p-3"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <OwnedButton
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={`Previous ${label.toLowerCase()} month`}
            onClick={() => shiftMonth(-1)}
          >
            ‹
          </OwnedButton>
          <strong className="text-sm">{monthLabel}</strong>
          <OwnedButton
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={`Next ${label.toLowerCase()} month`}
            onClick={() => shiftMonth(1)}
          >
            ›
          </OwnedButton>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekdays.map((day) => (
            <span
              key={day}
              className="py-1 text-center text-[10px] font-semibold uppercase text-muted-foreground"
            >
              {day}
            </span>
          ))}
          {monthDays.map((day) => {
            const key = iso(day.date);
            const selectedDay = key === value;
            const isCurrentMonth =
              day.date.getMonth() === visibleMonth.getMonth();
            const isToday = key === iso(todayDate());
            return (
              <OwnedButton
                key={key}
                type="button"
                size="icon-sm"
                variant={selectedDay ? "default" : "ghost"}
                aria-label={`Choose ${formatDate(key, settings.dateFormat)} for ${label}`}
                onClick={() => chooseDate(key)}
                className={`${isToday && !selectedDay ? "border border-primary" : ""} ${isCurrentMonth ? "" : "opacity-40"}`}
              >
                {day.date.getDate()}
              </OwnedButton>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between">
          <OwnedButton
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => chooseDate(iso(todayDate()))}
          >
            Today
          </OwnedButton>
          <OwnedButton
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            Close
          </OwnedButton>
        </div>
      </OwnedPopoverContent>
    </OwnedPopover>
  );
}
