"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useOptionalAuth } from "@/lib/optional-auth";
import type { WorkItem, SettingsState, SalaryBatch, SalaryState, TeamMember, IntegrationConfig, ResourceLink, SavedProjectTemplate } from "./types";
import { normalizeIntegrationLinks } from "./integrations";
import { normalizeClientRecords } from "./clients";
import { createWorkspaceBackup, parseWorkspaceBackup } from "./workspace-backup";
import { sampleStudioProjects, sampleStudioResources, sampleStudioSettings } from "./sample-studio";
import {
  FILE_CATEGORY_VALUES,
  FILE_STATUS_VALUES,
  LEGACY_TEAM_ROLE_VALUES,
  TEAM_ROLE_VALUES,
  normalizeStoredProjectStatus,
  type FileCategory,
  type FileStatus,
  type SettingsTeamRole,
  type StoredTeamRole,
} from "./domain-values";

const STORAGE_KEY = "video-editing-work-tracker:v1";
const SALARY_STORAGE_KEY = "video-editing-work-tracker:salary-batches:v1";
const SETTINGS_STORAGE_KEY = "video-editing-work-tracker:settings:v1";
const RESOURCES_STORAGE_KEY = "video-editing-work-tracker:resources:v1";
const defaultProjectTags = ["Job / Salary", "Freelance", "Personal Channel"];
const defaultSalaryWorkType = "Job / Salary";
const defaultSalaryBatchSize = 20;
const defaultSalaryBatchAmount = 10000;

type ToastState = { message: string; tone: "success" | "info" | "warning" };
type ClerkGetToken = ReturnType<typeof useAuth>["getToken"];

const teamRoleOptions: StoredTeamRole[] = [
  ...TEAM_ROLE_VALUES,
  ...LEGACY_TEAM_ROLE_VALUES,
];
const LEGACY_DEMO_SETTINGS = {
  studioName: "Relay",
  profileName: "Jordan Lee",
  profileUsername: "jordanlee",
  profileTitle: "Video Editor & Storyteller",
  profileBio: "Clean, cinematic edits for creators, campaigns, and client stories.",
  profileLocation: "Los Angeles, CA",
};

const permissionKeys = [
  "Create and edit projects",
  "Upload media and assets",
  "Manage project stages",
  "Invite team members",
  "Manage app settings",
];

const defaultRolePermissions: Record<string, Record<string, boolean>> = {
  Owner: Object.fromEntries(permissionKeys.map((k) => [k, true])),
  Editor: Object.fromEntries(permissionKeys.map((k) => [k, ["Create and edit projects", "Upload media and assets"].includes(k)])),
  Reviewer: Object.fromEntries(permissionKeys.map((k) => [k, false])),
};

const emptyIntegrationConfig: IntegrationConfig = {
  connected: false,
  account: "",
  folder: "",
  channel: "",
  workspace: "",
  webhookUrl: "",
  connectedAt: "",
  lastSyncAt: "",
};

const integrationNames = ["Google Drive", "Dropbox", "Slack", "Frame.io"];

const defaultIntegrationConfigs: Record<string, IntegrationConfig> = Object.fromEntries(
  integrationNames.map((name) => [name, { ...emptyIntegrationConfig }]),
);

const defaultSettings: SettingsState = {
  studioName: "",
  profileName: "",
  profileUsername: "",
  profileTitle: "",
  profileBio: "",
  profileLocation: "",
  profileImageUrl: "",
  publicActiveProjects: 0,
  publicDeliveredEdits: 0,
  publicTurnaroundDays: 3,
  timeZone: "UTC",
  dateFormat: "Month Day, Year",
  weekStart: "Mon",
  currencyCode: "USD",
  customClients: [],
  clients: [],
  customProjectTemplates: [],
  projectTags: [...defaultProjectTags],
  salaryWorkType: defaultSalaryWorkType,
  salaryBatchSize: defaultSalaryBatchSize,
  salaryBatchAmount: defaultSalaryBatchAmount,
  projectStages: ["Planned", "In Progress", "Client Review", "Delivered"],
  notifications: {
    "Project updates": false,
    "Feedback received": false,
    "Upcoming deadlines": false,
    Mentions: false,
    "Weekly summary": false,
  },
  integrations: {
    "Google Drive": false,
    Dropbox: false,
    Slack: false,
    "Frame.io": false,
  },
  integrationAccounts: {
    "Google Drive": "",
    Dropbox: "",
    Slack: "",
    "Frame.io": "",
  },
  integrationConfigs: { ...defaultIntegrationConfigs },
  integrationLinks: {},
  teamRole: "",
  teamMembers: [],
  editorPermissions: {
    "Create and edit projects": false,
    "Upload media and assets": false,
    "Manage project stages": false,
    "Invite team members": false,
    "Manage app settings": false,
  },
  rolePermissions: JSON.parse(JSON.stringify(defaultRolePermissions)),
  theme: "Dark",
  accentColor: "#14B8A6",
  density: "Comfortable",
};

function isLegacyDemoSettings(value: unknown) {
  if (!isPlainRecord(value)) return false;
  return (
    value.studioName === LEGACY_DEMO_SETTINGS.studioName &&
    value.profileName === LEGACY_DEMO_SETTINGS.profileName &&
    value.profileUsername === LEGACY_DEMO_SETTINGS.profileUsername &&
    value.profileTitle === LEGACY_DEMO_SETTINGS.profileTitle &&
    value.profileBio === LEGACY_DEMO_SETTINGS.profileBio &&
    value.profileLocation === LEGACY_DEMO_SETTINGS.profileLocation
  );
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function isProjectAuthorizationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /permission|team access|required|not authenticated/i.test(message);
}

function removeKey(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

function freshDefaultSettings(): SettingsState {
  return {
    ...defaultSettings,
    projectTags: [...defaultSettings.projectTags],
    customClients: [...defaultSettings.customClients],
    clients: defaultSettings.clients.map((client) => ({ ...client })),
    customProjectTemplates: defaultSettings.customProjectTemplates.map((template) => ({ ...template, workflowStages: [...template.workflowStages], deliverables: template.deliverables.map((item) => ({ ...item })), checklistItems: [...template.checklistItems] })),
    projectStages: [...defaultSettings.projectStages],
    notifications: { ...defaultSettings.notifications },
    integrations: { ...defaultSettings.integrations },
    integrationAccounts: { ...defaultSettings.integrationAccounts },
    integrationConfigs: JSON.parse(JSON.stringify(defaultIntegrationConfigs)),
    integrationLinks: normalizeIntegrationLinks(defaultSettings.integrationLinks),
    teamMembers: defaultSettings.teamMembers.map((m: TeamMember) => ({ ...m })),
    editorPermissions: { ...defaultSettings.editorPermissions },
    rolePermissions: JSON.parse(JSON.stringify(defaultRolePermissions)),
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasProperty<Key extends PropertyKey>(value: object, key: Key): value is Record<Key, unknown> {
  return key in value;
}

function stringSetting(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function optionSetting(value: unknown, options: string[], fallback: string) {
  return typeof value === "string" && options.includes(value) ? value : fallback;
}

function colorSetting(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function positiveIntegerSetting(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function positiveMoneySetting(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function stringListSetting(value: unknown, fallback: string[]) {
  const source = Array.isArray(value) ? value : fallback;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of source) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.length ? result : [...fallback];
}

function booleanRecordSetting(value: unknown, fallback: Record<string, boolean>) {
  const record = { ...fallback };
  if (!isPlainRecord(value)) return record;
  for (const key of Object.keys(record)) {
    if (typeof value[key] === "boolean") {
      record[key] = value[key];
    }
  }
  return record;
}

function stringRecordSetting(value: unknown, fallback: Record<string, string>) {
  const record = { ...fallback };
  if (!isPlainRecord(value)) return record;
  for (const key of Object.keys(record)) {
    if (typeof value[key] === "string") {
      record[key] = value[key].trim();
    }
  }
  return record;
}

function normalizeStoredItem(value: unknown): WorkItem | null {
  if (!isPlainRecord(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id : "";
  const title = typeof value.title === "string" && value.title.trim() ? value.title.trim() : "";
  if (!id || !title) return null;
  return {
    id,
    teamId: typeof value.teamId === "string" && value.teamId.trim() ? value.teamId : undefined,
    ownerUserId: typeof value.ownerUserId === "string" && value.ownerUserId.trim() ? value.ownerUserId : undefined,
    assigneeUserIds: Array.isArray(value.assigneeUserIds)
      ? value.assigneeUserIds.flatMap((id): string[] => (typeof id === "string" && id.trim() ? [id] : []))
      : [],
    profileId: stringSetting(value.profileId, "video-editing"),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
    title,
    client: typeof value.client === "string" ? value.client : "",
    clientId: typeof value.clientId === "string" ? value.clientId : undefined,
    status: normalizeStoredProjectStatus(value.status),
    workType: stringSetting(value.workType, "Job / Salary"),
    startDate: stringSetting(value.startDate, iso(todayDate())),
    dueDate: stringSetting(value.dueDate, iso(todayDate())),
    earnings: typeof value.earnings === "number" && Number.isFinite(value.earnings) ? Math.max(0, value.earnings) : 0,
    paid: typeof value.paid === "boolean" ? value.paid : false,
    paidDate: typeof value.paidDate === "string" ? value.paidDate : "",
    notes: typeof value.notes === "string" ? value.notes : "",
    templateId: typeof value.templateId === "string" && value.templateId.trim()
      ? value.templateId.trim().slice(0, 80)
      : undefined,
    templateProjectType: typeof value.templateProjectType === "string" && value.templateProjectType.trim()
      ? value.templateProjectType.trim().slice(0, 80)
      : undefined,
    workflowStages: Array.isArray(value.workflowStages)
      ? value.workflowStages.flatMap((stage): string[] => typeof stage === "string" && stage.trim() ? [stage.trim()] : []).slice(0, 12)
      : undefined,
    templateDeliverables: Array.isArray(value.templateDeliverables)
      ? value.templateDeliverables.flatMap((deliverable): NonNullable<WorkItem["templateDeliverables"]> => {
          if (!isPlainRecord(deliverable) || typeof deliverable.title !== "string" || !deliverable.title.trim()) return [];
          const category = FILE_CATEGORY_VALUES.includes(deliverable.category as FileCategory)
            ? deliverable.category as FileCategory
            : "Deliverable";
          const initialStatus = FILE_STATUS_VALUES.includes(deliverable.initialStatus as FileStatus)
            ? deliverable.initialStatus as FileStatus
            : "draft";
          return [{ title: deliverable.title.trim(), category, initialStatus }];
        }).slice(0, 12)
      : undefined,
    checklistItems: Array.isArray(value.checklistItems)
      ? value.checklistItems.flatMap((entry): string[] => typeof entry === "string" && entry.trim() ? [entry.trim()] : []).slice(0, 20)
      : undefined,
    checklistCompleted: booleanRecordSetting(value.checklistCompleted, {}),
    integrationLinks: normalizeIntegrationLinks(value.integrationLinks),
  };
}

function normalizeSalaryState(value: unknown): SalaryState {
  const batches = isPlainRecord(value) && Array.isArray(value.batches) ? value.batches : [];
  return {
    batches: batches.flatMap((batch, index): SalaryBatch[] => {
      if (!isPlainRecord(batch)) return [];
      const number = typeof batch.number === "number" && Number.isFinite(batch.number) ? Math.max(1, Math.floor(batch.number)) : index + 1;
      return [{
        id: typeof batch.id === "string" && batch.id.trim() ? batch.id : `batch-${number}`,
        number,
        completedDate: stringSetting(batch.completedDate, iso(todayDate())),
        archived: typeof batch.archived === "boolean" ? batch.archived : false,
        archivedDate: typeof batch.archivedDate === "string" ? batch.archivedDate : "",
        amount: typeof batch.amount === "number" && Number.isFinite(batch.amount) ? Math.max(0, batch.amount) : undefined,
        paid: typeof batch.paid === "boolean" ? batch.paid : false,
        paidDate: typeof batch.paidDate === "string" ? batch.paidDate : "",
      }];
    }),
  };
}

function normalizeIntegrationConfig(value: unknown): IntegrationConfig {
  if (!isPlainRecord(value)) return { ...emptyIntegrationConfig };
  return {
    connected: typeof value.connected === "boolean" ? value.connected : false,
    account: typeof value.account === "string" ? value.account.trim() : "",
    folder: typeof value.folder === "string" ? value.folder.trim() : "",
    channel: typeof value.channel === "string" ? value.channel.trim() : "",
    workspace: typeof value.workspace === "string" ? value.workspace.trim() : "",
    webhookUrl: typeof value.webhookUrl === "string" ? value.webhookUrl.trim() : "",
    connectedAt: typeof value.connectedAt === "string" ? value.connectedAt : "",
    lastSyncAt: typeof value.lastSyncAt === "string" ? value.lastSyncAt : "",
  };
}

function normalizeCustomProjectTemplates(value: unknown): SavedProjectTemplate[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((template): SavedProjectTemplate[] => {
    if (!isPlainRecord(template)) return [];
    const name = typeof template.name === "string" ? template.name.trim().slice(0, 80) : "";
    if (!name) return [];
    const rawId = typeof template.id === "string" && template.id.trim()
      ? template.id.trim()
      : `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    const id = rawId.startsWith("custom-") ? rawId.slice(0, 80) : `custom-${rawId}`.slice(0, 80);
    if (seen.has(id)) return [];
    seen.add(id);
    const deliverables = Array.isArray(template.deliverables)
      ? template.deliverables.flatMap((deliverable): SavedProjectTemplate["deliverables"] => {
          if (!isPlainRecord(deliverable) || typeof deliverable.title !== "string" || !deliverable.title.trim()) return [];
          const category = FILE_CATEGORY_VALUES.includes(deliverable.category as FileCategory)
            ? deliverable.category as FileCategory
            : "Deliverable";
          const initialStatus = FILE_STATUS_VALUES.includes(deliverable.initialStatus as FileStatus)
            ? deliverable.initialStatus as FileStatus
            : "draft";
          return [{ title: deliverable.title.trim().slice(0, 120), category, initialStatus }];
        }).slice(0, 12)
      : [];
    return [{
      id,
      name,
      description: typeof template.description === "string" ? template.description.trim().slice(0, 220) : "Custom workflow template.",
      projectType: typeof template.projectType === "string" && template.projectType.trim() ? template.projectType.trim().slice(0, 80) : "Custom project",
      workType: template.workType === "channel" ? "channel" : "freelance",
      durationDays: Math.max(1, Math.min(120, Math.floor(Number(template.durationDays) || 7))),
      workflowStages: Array.isArray(template.workflowStages)
        ? template.workflowStages.flatMap((stage): string[] => typeof stage === "string" && stage.trim() ? [stage.trim().slice(0, 40)] : []).slice(0, 12)
        : [],
      deliverables,
      checklistItems: Array.isArray(template.checklistItems)
        ? template.checklistItems.flatMap((entry): string[] => typeof entry === "string" && entry.trim() ? [entry.trim().slice(0, 120)] : []).slice(0, 20)
        : [],
      custom: true,
      updatedAt: typeof template.updatedAt === "string" ? template.updatedAt : new Date().toISOString(),
    }];
  }).slice(0, 24);
}
function normalizeIntegrationConfigs(value: unknown, legacyIntegrations?: unknown, legacyAccounts?: unknown): Record<string, IntegrationConfig> {
  const configs: Record<string, IntegrationConfig> = {};
  for (const name of integrationNames) {
    configs[name] = { ...emptyIntegrationConfig };
  }

  // Merge from new integrationConfigs if present
  if (isPlainRecord(value)) {
    for (const name of integrationNames) {
      if (isPlainRecord(value[name])) {
        configs[name] = normalizeIntegrationConfig(value[name]);
      }
    }
  }

  // Migrate from legacy integrations + integrationAccounts if new configs are all empty
  const allEmpty = Object.values(configs).every((c) => !c.connected && !c.account);
  if (allEmpty && isPlainRecord(legacyIntegrations) && isPlainRecord(legacyAccounts)) {
    for (const name of integrationNames) {
      const wasConnected = legacyIntegrations[name] === true;
      const account = typeof legacyAccounts[name] === "string" ? (legacyAccounts[name] as string).trim() : "";
      if (wasConnected || account) {
        configs[name] = { ...emptyIntegrationConfig, connected: wasConnected, account, connectedAt: wasConnected ? new Date().toISOString() : "" };
      }
    }
  }

  return configs;
}

function normalizeRolePermissions(value: unknown, legacyEditorPerms?: unknown): Record<string, Record<string, boolean>> {
  const result: Record<string, Record<string, boolean>> = JSON.parse(JSON.stringify(defaultRolePermissions));

  if (isPlainRecord(value)) {
    for (const role of teamRoleOptions) {
      const storedRolePermissions = value[role];
      if (isPlainRecord(storedRolePermissions)) {
        const rolePerms: Record<string, boolean> = {};
        for (const perm of permissionKeys) {
          const storedPermission = storedRolePermissions[perm];
          rolePerms[perm] = typeof storedPermission === "boolean" ? storedPermission : defaultRolePermissions[role]?.[perm] ?? false;
        }
        result[role] = rolePerms;
      }
    }
    return result;
  }

  // Migrate from legacy flat editorPermissions → apply them as Editor role
  if (isPlainRecord(legacyEditorPerms)) {
    const editorPerms: Record<string, boolean> = {};
    for (const perm of permissionKeys) {
      editorPerms[perm] = typeof legacyEditorPerms[perm] === "boolean" ? legacyEditorPerms[perm] as boolean : defaultRolePermissions.Editor?.[perm] ?? false;
    }
    result.Editor = editorPerms;
  }

  return result;
}

function mergeSettings(stored: Partial<SettingsState>): SettingsState {
  const r = isPlainRecord(stored) ? stored : {};
  const projectTags = stringListSetting(r.projectTags, defaultSettings.projectTags);
  const storedSalaryWorkType = typeof r.salaryWorkType === "string" ? r.salaryWorkType.trim() : "";
  const salaryWorkType = projectTags.find((tag) => tag.toLowerCase() === storedSalaryWorkType.toLowerCase()) ?? projectTags.find((tag) => tag.toLowerCase() === defaultSalaryWorkType.toLowerCase()) ?? projectTags[0];
  return {
    ...defaultSettings,
    studioName: stringSetting(r.studioName, defaultSettings.studioName),
    profileName: stringSetting(r.profileName, defaultSettings.profileName),
    profileUsername: stringSetting(r.profileUsername, defaultSettings.profileUsername),
    profileTitle: stringSetting(r.profileTitle, defaultSettings.profileTitle),
    profileBio: stringSetting(r.profileBio, defaultSettings.profileBio),
    profileLocation: stringSetting(r.profileLocation, defaultSettings.profileLocation),
    profileImageUrl: typeof r.profileImageUrl === "string" ? r.profileImageUrl.trim() : defaultSettings.profileImageUrl,
    publicActiveProjects: Math.max(0, Math.floor(Number(r.publicActiveProjects ?? defaultSettings.publicActiveProjects))),
    publicDeliveredEdits: Math.max(0, Math.floor(Number(r.publicDeliveredEdits ?? defaultSettings.publicDeliveredEdits))),
    publicTurnaroundDays: positiveIntegerSetting(r.publicTurnaroundDays, defaultSettings.publicTurnaroundDays),
    timeZone: optionSetting(r.timeZone, ["UTC", "Pacific Time", "Eastern Time", "Asia/Dubai"], defaultSettings.timeZone),
    dateFormat: optionSetting(r.dateFormat, ["Month Day, Year", "Day Month Year", "YYYY-MM-DD"], defaultSettings.dateFormat),
    weekStart: optionSetting(r.weekStart, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], defaultSettings.weekStart),
    currencyCode: optionSetting(r.currencyCode, ["USD", "EUR", "GBP", "INR", "AED", "SAR"], defaultSettings.currencyCode),
    customClients: stringListSetting(r.customClients, defaultSettings.customClients),
    clients: normalizeClientRecords(r.clients, stringListSetting(r.customClients, defaultSettings.customClients)),
    customProjectTemplates: normalizeCustomProjectTemplates(r.customProjectTemplates),
    projectTags,
    salaryWorkType,
    salaryBatchSize: positiveIntegerSetting(r.salaryBatchSize, defaultSettings.salaryBatchSize),
    salaryBatchAmount: positiveMoneySetting(r.salaryBatchAmount, defaultSettings.salaryBatchAmount),
    teamRole: optionSetting(r.teamRole, teamRoleOptions, defaultSettings.teamRole) as SettingsTeamRole,
    theme: optionSetting(r.theme, ["Light", "Dark", "System"], defaultSettings.theme),
    accentColor: colorSetting(r.accentColor, defaultSettings.accentColor),
    density: optionSetting(r.density, ["Comfortable", "Compact"], defaultSettings.density),
    projectStages: Array.isArray(r.projectStages)
      ? r.projectStages.flatMap((s): string[] => (typeof s === "string" && s.trim() ? [s.trim()] : []))
      : defaultSettings.projectStages,
    teamMembers: Array.isArray(r.teamMembers)
      ? r.teamMembers.flatMap((m: unknown): TeamMember[] => {
          if (!isPlainRecord(m) || typeof m.name !== "string" || !m.name.trim()) return [];
          return [{
            id: typeof m.id === "string" && m.id.trim() ? m.id : `member-${m.name.trim().toLowerCase().replace(/\s+/g, "-")}`,
            name: m.name.trim(),
            role: optionSetting(m.role, teamRoleOptions, "Editor") as StoredTeamRole,
            email: typeof m.email === "string" ? m.email.trim() : "",
          }];
        })
      : defaultSettings.teamMembers,
    notifications: booleanRecordSetting(r.notifications, defaultSettings.notifications),
    integrations: booleanRecordSetting(r.integrations, defaultSettings.integrations),
    integrationAccounts: stringRecordSetting(r.integrationAccounts, defaultSettings.integrationAccounts),
    integrationConfigs: normalizeIntegrationConfigs(r.integrationConfigs, r.integrations, r.integrationAccounts),
    integrationLinks: normalizeIntegrationLinks(r.integrationLinks),
    editorPermissions: booleanRecordSetting(r.editorPermissions, defaultSettings.editorPermissions),
    rolePermissions: normalizeRolePermissions(r.rolePermissions, r.editorPermissions),
  };
}

function readInitialSettings(): SettingsState {
  if (typeof window === "undefined") return freshDefaultSettings();
  const stored = readJson<Partial<SettingsState>>(SETTINGS_STORAGE_KEY, {});
  if (isLegacyDemoSettings(stored)) {
    removeKey(SETTINGS_STORAGE_KEY);
    return freshDefaultSettings();
  }
  return mergeSettings(stored);
}

function readInitialItems(): WorkItem[] {
  if (typeof window === "undefined") return [];
  const stored = readJson<unknown>(STORAGE_KEY, []);
  const storedItems = Array.isArray(stored) ? stored : [];
  return normalizeWorkItems(storedItems);
}

function normalizeWorkItems(items: unknown[]): WorkItem[] {
  return items.flatMap((item) => {
    const normalized = normalizeStoredItem(item);
    return normalized ? [normalized] : [];
  });
}

function normalizeResourceLink(value: unknown): ResourceLink | null {
  if (!isPlainRecord(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id : "";
  const title = typeof value.title === "string" && value.title.trim() ? value.title.trim() : "";
  const url = typeof value.url === "string" && value.url.trim() ? value.url.trim() : "";
  if (!id || !title || !url) return null;
  const now = new Date().toISOString();
  return {
    id,
    title,
    url,
    category: typeof value.category === "string" && value.category.trim() ? value.category.trim() : "Other",
    projectId: typeof value.projectId === "string" ? value.projectId.trim() : "",
    notes: typeof value.notes === "string" ? value.notes : "",
    createdAt: typeof value.createdAt === "string" && value.createdAt ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" && value.updatedAt ? value.updatedAt : now,
  };
}

function normalizeResourceLinks(value: unknown): ResourceLink[] {
  const resources = Array.isArray(value) ? value : [];
  return resources.flatMap((resource) => {
    const normalized = normalizeResourceLink(resource);
    return normalized ? [normalized] : [];
  });
}

function mergeResourceLinks(...groups: ResourceLink[][]): ResourceLink[] {
  const seen = new Set<string>();
  const merged: ResourceLink[] = [];
  for (const resource of groups.flat()) {
    const key = resource.id || resource.url.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(resource);
  }
  return merged;
}

function readInitialResources(): ResourceLink[] {
  if (typeof window === "undefined") return [];
  return normalizeResourceLinks(readJson<unknown>(RESOURCES_STORAGE_KEY, []));
}

function isSalaryWorkType(value: string, settings: SettingsState) {
  return value.trim().toLowerCase() === settings.salaryWorkType.trim().toLowerCase();
}

function normalizedSalaryBatchSize(value: unknown) {
  return positiveIntegerSetting(value, defaultSalaryBatchSize);
}

function normalizedSalaryBatchAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? Math.max(0, amount) : defaultSalaryBatchAmount;
}

function todayDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isDoneStatus(status: string) {
  return ["delivered", "done", "paid", "published", "closed", "archived", "shipped", "completed", "released"].some(
    (w) => status.toLowerCase().includes(w),
  );
}

function readObjectString(value: unknown, key: string) {
  if (!value || typeof value !== "object") return "";
  const candidate = hasProperty(value, key) ? value[key] : undefined;
  return typeof candidate === "string" ? candidate : "";
}

function readFirstObjectString(value: unknown, keys: string[]) {
  for (const key of keys) {
    const candidate = readObjectString(value, key).trim();
    if (candidate) return candidate;
  }
  return "";
}

function isGitHubExternalAccount(value: unknown) {
  const providerText = [
    readObjectString(value, "provider"),
    readObjectString(value, "providerId"),
    readObjectString(value, "strategy"),
  ].join(" ").toLowerCase();
  return providerText.includes("github");
}

function deriveAuthProfile(user: ReturnType<typeof useUser>["user"]) {
  if (!user) {
    return { profileName: "", profileUsername: "", profileImageUrl: "" };
  }

  const externalAccountsRaw = (user as unknown as { externalAccounts?: unknown[] }).externalAccounts;
  const externalAccounts = Array.isArray(externalAccountsRaw) ? externalAccountsRaw : [];
  const githubAccount = externalAccounts.find(isGitHubExternalAccount);

  const profileName =
    readFirstObjectString(githubAccount, ["name", "fullName", "displayName"]) ||
    user.fullName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username?.trim() ||
    "";
  const profileUsername =
    readFirstObjectString(githubAccount, ["username", "login", "screenName", "externalId", "providerUserId"]) ||
    user.username?.trim() ||
    "";
  const profileImageUrl =
    readFirstObjectString(githubAccount, ["imageUrl", "avatarUrl", "picture", "profileImageUrl"]) ||
    user.imageUrl?.trim() ||
    "";

  return { profileName, profileUsername, profileImageUrl };
}

function shouldUseAuthProfileValue(field: keyof Pick<SettingsState, "profileName" | "profileUsername" | "profileImageUrl">, current: string, authValue: string) {
  const trimmed = current.trim();
  const legacyValue = field === "profileImageUrl" ? "" : LEGACY_DEMO_SETTINGS[field];
  if (!authValue.trim()) return false;
  if (!trimmed) return true;
  if (trimmed === defaultSettings[field]) return true;
  if (legacyValue && trimmed === legacyValue) return true;
  return false;
}

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const parsed = JSON.parse(window.atob(padded));
    return isPlainRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function diagnoseConvexAuthToken(getToken: ClerkGetToken) {
  try {
    const token = await getToken({ template: "convex", skipCache: true });
    if (!token) {
      return "Clerk is not returning a Convex JWT. Create a Clerk JWT template named convex, then sign out and back in.";
    }

    const claims = decodeJwtPayload(token);
    const audience = typeof claims?.aud === "string" ? claims.aud : "";
    const issuer = typeof claims?.iss === "string" ? claims.iss : "";

    if (audience && audience !== "convex") {
      return `Clerk Convex JWT has audience ${audience}, expected convex. Fix the Clerk JWT template audience.`;
    }

    if (!issuer) {
      return "Clerk returned a Convex JWT, but it has no issuer claim. Check the Clerk JWT template.";
    }

    return `Clerk returned a Convex JWT, but Convex rejected it. Set CLERK_JWT_ISSUER_DOMAIN in Convex to ${issuer}.`;
  } catch {
    return "Clerk could not create a Convex JWT. Check that the Clerk JWT template named convex exists.";
  }
}

interface DataContextValue {
  items: WorkItem[];
  setItems: React.Dispatch<React.SetStateAction<WorkItem[]>>;
  settings: SettingsState;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  resourceLinks: ResourceLink[];
  setResourceLinks: React.Dispatch<React.SetStateAction<ResourceLink[]>>;
  salaryBatches: SalaryBatch[];
  reconcileSalaryBatches: (items: WorkItem[]) => void;
  updateSalaryBatchPayment: (batchId: string, paid: boolean) => void;
  exportBackup: () => string;
  importBackup: (source: string) => Promise<{ projects: number; clients: number; resources: number; salaryBatches: number }>;
  isAuthEnabled: boolean;
  isSignedIn: boolean;
  isAuthLoaded: boolean;
  toast: ToastState | null;
  setToast: React.Dispatch<React.SetStateAction<ToastState | null>>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children, mode = "local", authEnabled = false }: { children: React.ReactNode; mode?: "local" | "cloud" | "sample"; authEnabled?: boolean }) {
  if (mode === "cloud") {
    return <CloudDataProvider>{children}</CloudDataProvider>;
  }
  if (mode === "sample") {
    return <SampleDataProvider>{children}</SampleDataProvider>;
  }
  return <LocalDataProvider authEnabled={authEnabled}>{children}</LocalDataProvider>;
}

function SampleDataProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const immutableItems = useCallback<React.Dispatch<React.SetStateAction<WorkItem[]>>>(() => {
    setToast({ message: "The sample studio is read-only. Start your workspace to make changes.", tone: "info" });
  }, []);
  const immutableSettings = useCallback<React.Dispatch<React.SetStateAction<SettingsState>>>(() => undefined, []);
  const immutableResources = useCallback<React.Dispatch<React.SetStateAction<ResourceLink[]>>>(() => undefined, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const value: DataContextValue = {
    items: sampleStudioProjects,
    setItems: immutableItems,
    settings: sampleStudioSettings,
    setSettings: immutableSettings,
    resourceLinks: sampleStudioResources,
    setResourceLinks: immutableResources,
    salaryBatches: [],
    reconcileSalaryBatches: () => undefined,
    updateSalaryBatchPayment: () => setToast({ message: "Payment state is fixed in the read-only sample.", tone: "info" }),
    exportBackup: () => createWorkspaceBackup({ projects: sampleStudioProjects, clients: sampleStudioSettings.clients, resources: sampleStudioResources, salaryBatches: [], settings: { ...sampleStudioSettings } }),
    importBackup: async () => { throw new Error("The sample workspace is read-only."); },
    isAuthEnabled: false,
    isSignedIn: false,
    isAuthLoaded: true,
    toast,
    setToast,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function LocalDataProvider({ children, authEnabled }: { children: React.ReactNode; authEnabled: boolean }) {
  const { isLoaded, isSignedIn } = useOptionalAuth();
  const [items, setItemsState] = useState<WorkItem[]>([]);
  const [settings, setSettingsState] = useState<SettingsState>(() => freshDefaultSettings());
  const [resourceLinks, setResourceLinksState] = useState<ResourceLink[]>([]);
  const [salaryBatches, setSalaryBatches] = useState<SalaryBatch[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    setItemsState(readInitialItems());
    setSettingsState(readInitialSettings());
    setResourceLinksState(readInitialResources());
    setSalaryBatches(normalizeSalaryState(readJson<unknown>(SALARY_STORAGE_KEY, { batches: [] })).batches);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const setItems = useCallback((updater: React.SetStateAction<WorkItem[]>) => {
    setItemsState((prev: WorkItem[]) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      writeJson(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const setSettings = useCallback((updater: React.SetStateAction<SettingsState>) => {
    setSettingsState((prev: SettingsState) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      writeJson(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const setResourceLinks = useCallback((updater: React.SetStateAction<ResourceLink[]>) => {
    setResourceLinksState((prev: ResourceLink[]) => {
      const next = normalizeResourceLinks(typeof updater === "function" ? updater(prev) : updater);
      writeJson(RESOURCES_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const reconcileSalaryBatches = useCallback((workItems: WorkItem[]) => {
    const completedBatchCount = Math.floor(
      workItems.filter((w) => isSalaryWorkType(w.workType, settings) && isDoneStatus(w.status)).length / normalizedSalaryBatchSize(settings.salaryBatchSize),
    );
    setSalaryBatches((prev: SalaryBatch[]) => {
      if (prev.length >= completedBatchCount) return prev;
      const next = [...prev];
      while (next.length < completedBatchCount) {
        const n = next.length + 1;
        next.push({
          id: `batch-${n}`,
          number: n,
          completedDate: iso(todayDate()),
          archived: false,
          archivedDate: "",
          amount: normalizedSalaryBatchAmount(settings.salaryBatchAmount),
          paid: false,
          paidDate: "",
        });
      }
      writeJson(SALARY_STORAGE_KEY, { batches: next });
      return next;
    });
  }, [settings]);

  const updateSalaryBatchPayment = useCallback((batchId: string, paid: boolean) => {
    setSalaryBatches((prev) => {
      const next = prev.map((batch) => batch.id === batchId
        ? { ...batch, paid, paidDate: paid ? iso(todayDate()) : "" }
        : batch);
      writeJson(SALARY_STORAGE_KEY, { batches: next });
      return next;
    });
  }, []);

  const exportBackup = useCallback(() => createWorkspaceBackup({ projects: items, clients: settings.clients, resources: resourceLinks, salaryBatches, settings: { ...settings } }), [items, resourceLinks, salaryBatches, settings]);
  const importBackup = useCallback(async (source: string) => {
    const backup = parseWorkspaceBackup(source);
    const nextItems = normalizeWorkItems(backup.projects);
    const nextSettings = mergeSettings({ ...backup.settings, clients: normalizeClientRecords(backup.clients) });
    const nextResources = normalizeResourceLinks(backup.resources);
    const nextBatches = normalizeSalaryState({ batches: backup.salaryBatches }).batches;
    setItemsState(nextItems); setSettingsState(nextSettings); setResourceLinksState(nextResources); setSalaryBatches(nextBatches);
    writeJson(STORAGE_KEY, nextItems); writeJson(SETTINGS_STORAGE_KEY, nextSettings); writeJson(RESOURCES_STORAGE_KEY, nextResources); writeJson(SALARY_STORAGE_KEY, { batches: nextBatches });
    return { projects: nextItems.length, clients: nextSettings.clients.length, resources: nextResources.length, salaryBatches: nextBatches.length };
  }, []);

  const value: DataContextValue = {
    items,
    setItems,
    settings,
    setSettings,
    resourceLinks,
    setResourceLinks,
    salaryBatches,
    reconcileSalaryBatches,
    updateSalaryBatchPayment,
    exportBackup,
    importBackup,
    isAuthEnabled: authEnabled,
    isSignedIn: authEnabled && Boolean(isSignedIn),
    isAuthLoaded: authEnabled ? isLoaded : true,
    toast,
    setToast,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function CloudDataProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user, isLoaded: clerkLoaded } = useUser();
  const { getToken } = useAuth();
  const { isLoading: convexAuthLoading, isAuthenticated: convexAuthenticated } = useConvexAuth();
  const [items, setItemsState] = useState<WorkItem[]>([]);
  const [settings, setSettingsState] = useState<SettingsState>(() => freshDefaultSettings());
  const [resourceLinks, setResourceLinksState] = useState<ResourceLink[]>([]);
  const [salaryBatches, setSalaryBatches] = useState<SalaryBatch[]>([]);
  const [ready, setReady] = useState(false);
  const [cloudInitialized, setCloudInitialized] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const initializationToken = useRef(0);
  const authMode = isSignedIn ? "signed-in" : "guest";
  const previousAuthMode = useRef(authMode);

  // Always call hooks — Convex handles unauthenticated state gracefully
  const convexItems = useQuery(api.workItems.list, {});
  const convexSettings = useQuery(api.settings.get, {});
  const convexBatches = useQuery(api.salaryBatches.list, {});
  const convexResources = useQuery(api.resourceLinks.list, {});
  const replaceAllItems = useMutation(api.workItems.replaceAll);
  const deleteWorkItem = useMutation(api.workItems.deleteOne);
  const upsertSettings = useMutation(api.settings.upsert);
  const replaceAllBatches = useMutation(api.salaryBatches.replaceAll);
  const replaceAllResources = useMutation(api.resourceLinks.replaceAll);

  useEffect(() => {
    if (!clerkLoaded) return;
    if (previousAuthMode.current === authMode) return;
    previousAuthMode.current = authMode;
    initializationToken.current += 1;
    setReady(false);
    setCloudInitialized(false);
  }, [authMode, clerkLoaded]);

  // Guest mode: load from localStorage
  useEffect(() => {
    if (!clerkLoaded) return;
    if (isSignedIn) return;

    const stored = readInitialItems();
    setItemsState(stored);
    setSettingsState(readInitialSettings());
    setResourceLinksState(readInitialResources());

    const salState = normalizeSalaryState(readJson<unknown>(SALARY_STORAGE_KEY, { batches: [] }));
    setSalaryBatches(salState.batches);
    setReady(true);
  }, [clerkLoaded, isSignedIn]);

  // Signed-in mode: initialise from Convex, migrate if needed
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn) return;
    if (convexAuthLoading) return;

    if (!convexAuthenticated) {
      if (ready) return;
      setItemsState(readInitialItems());
      setSettingsState(readInitialSettings());
      setResourceLinksState(readInitialResources());
      setSalaryBatches(normalizeSalaryState(readJson<unknown>(SALARY_STORAGE_KEY, { batches: [] })).batches);
      let cancelled = false;
      void diagnoseConvexAuthToken(getToken).then((message) => {
        if (!cancelled) setToast({ tone: "warning", message });
      });
      setReady(true);
      return () => {
        cancelled = true;
      };
    }

    if (convexItems === undefined || convexSettings === undefined || convexBatches === undefined || convexResources === undefined) return;
    if (cloudInitialized) return;

    const loadedItems = normalizeWorkItems(convexItems);
    const loadedSettings = convexSettings;
    const loadedBatches = normalizeSalaryState({ batches: convexBatches }).batches;
    const loadedResources = normalizeResourceLinks(convexResources);
    let cancelled = false;
    const token = initializationToken.current + 1;
    initializationToken.current = token;

    async function initializeCloudData() {
      const localItems = readInitialItems();
      const localSettings = readJson<Partial<SettingsState>>(SETTINGS_STORAGE_KEY, {});
      const localBatches = normalizeSalaryState(readJson<unknown>(SALARY_STORAGE_KEY, { batches: [] }));
      const localResources = readInitialResources();
      const mergedLocalSettings = Object.keys(localSettings).length > 0 ? mergeSettings(localSettings) : readInitialSettings();
      let nextItems: WorkItem[] = loadedItems;
      let nextSettings = loadedSettings ? mergeSettings(loadedSettings) : mergedLocalSettings;
      let nextBatches: SalaryBatch[] = loadedBatches;
      let nextResources: ResourceLink[] = mergeResourceLinks(loadedResources, localResources);
      let syncFailed = false;

      if (loadedItems.length === 0 && localItems.length > 0) {
        try {
          await replaceAllItems({ items: localItems });
          removeKey(STORAGE_KEY);
          nextItems = localItems;
        } catch {
          syncFailed = true;
          nextItems = localItems;
        }
      }

      if (loadedBatches.length === 0 && localBatches.batches.length > 0) {
        try {
          await replaceAllBatches({ batches: localBatches.batches });
          removeKey(SALARY_STORAGE_KEY);
          nextBatches = localBatches.batches;
        } catch {
          syncFailed = true;
          nextBatches = localBatches.batches;
        }
      }

      if (localResources.length > 0) {
        try {
          await replaceAllResources({ resources: nextResources });
          removeKey(RESOURCES_STORAGE_KEY);
        } catch {
          syncFailed = true;
          nextResources = mergeResourceLinks(localResources, loadedResources);
        }
      }

      if (!loadedSettings && Object.keys(localSettings).length > 0) {
        try {
          await upsertSettings(mergedLocalSettings);
          removeKey(SETTINGS_STORAGE_KEY);
          nextSettings = mergedLocalSettings;
        } catch {
          syncFailed = true;
          nextSettings = mergedLocalSettings;
        }
      }

      if (syncFailed) {
        if (!cancelled) {
          setToast({
            tone: "warning",
            message: "Cloud sync is not available. Your data is still saved on this device.",
          });
        }
      }

      if (cancelled || initializationToken.current !== token) return;
      setItemsState(nextItems);
      setSettingsState(nextSettings);
      setResourceLinksState(nextResources);
      setSalaryBatches(nextBatches);
      setCloudInitialized(true);
      setReady(true);
    }

    void initializeCloudData();
    return () => {
      cancelled = true;
    };
  }, [
    clerkLoaded,
    isSignedIn,
    convexAuthLoading,
    convexAuthenticated,
    cloudInitialized,
    getToken,
    ready,
    convexItems,
    convexSettings,
    convexBatches,
    convexResources,
    replaceAllItems,
    replaceAllBatches,
    replaceAllResources,
    upsertSettings,
  ]);

  // Keep signed-in workspaces live after the initial cloud load. Team project
  // changes from other members arrive through Convex subscriptions here.
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !convexAuthenticated || !cloudInitialized || convexItems === undefined || convexResources === undefined || convexBatches === undefined) return;
    setItemsState(normalizeWorkItems(convexItems));
    setResourceLinksState(normalizeResourceLinks(convexResources));
    setSalaryBatches(normalizeSalaryState({ batches: convexBatches }).batches);
  }, [clerkLoaded, cloudInitialized, convexAuthenticated, convexBatches, convexItems, convexResources, isSignedIn]);

  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !user || !ready) return;

    const authProfile = deriveAuthProfile(user);
    if (!authProfile.profileName && !authProfile.profileUsername && !authProfile.profileImageUrl) return;

    setSettingsState((current) => {
      const next: SettingsState = {
        ...current,
        profileName: shouldUseAuthProfileValue("profileName", current.profileName, authProfile.profileName)
          ? authProfile.profileName
          : current.profileName,
        profileUsername: shouldUseAuthProfileValue("profileUsername", current.profileUsername, authProfile.profileUsername)
          ? authProfile.profileUsername
          : current.profileUsername,
        profileImageUrl: shouldUseAuthProfileValue("profileImageUrl", current.profileImageUrl, authProfile.profileImageUrl)
          ? authProfile.profileImageUrl
          : current.profileImageUrl,
      };

      const changed =
        next.profileName !== current.profileName ||
        next.profileUsername !== current.profileUsername ||
        next.profileImageUrl !== current.profileImageUrl;

      if (changed) {
        if (convexAuthenticated) {
          upsertSettings(next).catch(() => {
            writeJson(SETTINGS_STORAGE_KEY, next);
          });
        } else {
          writeJson(SETTINGS_STORAGE_KEY, next);
        }
      }

      return changed ? next : current;
    });
  }, [clerkLoaded, convexAuthenticated, isSignedIn, ready, upsertSettings, user]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Unified items setter
  const setItems = useCallback(
    (updater: React.SetStateAction<WorkItem[]>) => {
      setItemsState((prev: WorkItem[]) => {
        const next = normalizeWorkItems(typeof updater === "function" ? updater(prev) : updater);
        if (isSignedIn && convexAuthenticated) {
          const previousById = new Map(prev.map((item) => [item.id, item]));
          const nextIds = new Set(next.map((item) => item.id));
          const changedItems = next.filter((item) => JSON.stringify(previousById.get(item.id)) !== JSON.stringify(item));
          const removedIds = [
            ...new Set(prev.filter((item) => !nextIds.has(item.id)).map((item) => item.id)),
          ];
          const writes = [
            ...(changedItems.length ? [replaceAllItems({ items: changedItems, deleteMissing: false })] : []),
            ...removedIds.map((projectId) => deleteWorkItem({ projectId })),
          ];
          Promise.allSettled(writes).then((results) => {
            const failure = results.find(
              (result): result is PromiseRejectedResult => result.status === "rejected"
            );
            if (failure) throw failure.reason;
          }).catch((error) => {
            if (isProjectAuthorizationError(error)) {
              setItemsState(prev);
              setToast({
                tone: "warning",
                message: "Project change was not allowed by your team permissions.",
              });
              return;
            }
            writeJson(STORAGE_KEY, next);
            setToast({
              tone: "warning",
              message: "Cloud sync failed. Projects are saved locally for now.",
            });
          });
        } else {
          writeJson(STORAGE_KEY, next);
        }
        return next;
      });
    },
    [convexAuthenticated, deleteWorkItem, isSignedIn, replaceAllItems],
  );

  // Unified settings setter
  const setSettings = useCallback(
    (updater: React.SetStateAction<SettingsState>) => {
      setSettingsState((prev: SettingsState) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (isSignedIn && convexAuthenticated) {
          upsertSettings(next).catch(() => {
            writeJson(SETTINGS_STORAGE_KEY, next);
            setToast({
              tone: "warning",
              message: "Cloud sync failed. Settings are saved locally for now.",
            });
          });
        } else {
          writeJson(SETTINGS_STORAGE_KEY, next);
        }
        return next;
      });
    },
    [convexAuthenticated, isSignedIn, upsertSettings],
  );

  const setResourceLinks = useCallback(
    (updater: React.SetStateAction<ResourceLink[]>) => {
      setResourceLinksState((prev: ResourceLink[]) => {
        const next = normalizeResourceLinks(typeof updater === "function" ? updater(prev) : updater);
        if (isSignedIn && convexAuthenticated) {
          replaceAllResources({ resources: next }).catch(() => {
            writeJson(RESOURCES_STORAGE_KEY, next);
            setToast({
              tone: "warning",
              message: "Cloud sync failed. Resources are saved locally for now.",
            });
          });
        } else {
          writeJson(RESOURCES_STORAGE_KEY, next);
        }
        return next;
      });
    },
    [convexAuthenticated, isSignedIn, replaceAllResources],
  );

  const reconcileSalaryBatches = useCallback(
    (workItems: WorkItem[]) => {
      const completedBatchCount = Math.floor(
        workItems.filter((w) => isSalaryWorkType(w.workType, settings) && isDoneStatus(w.status)).length / normalizedSalaryBatchSize(settings.salaryBatchSize),
      );
      setSalaryBatches((prev: SalaryBatch[]) => {
        if (prev.length >= completedBatchCount) return prev;
        const next = [...prev];
        while (next.length < completedBatchCount) {
          const n = next.length + 1;
          next.push({
            id: `batch-${n}`,
            number: n,
            completedDate: iso(todayDate()),
            archived: false,
            archivedDate: "",
            amount: normalizedSalaryBatchAmount(settings.salaryBatchAmount),
            paid: false,
            paidDate: "",
          });
        }
        const normalizedNext = normalizeSalaryState({ batches: next }).batches;
        if (isSignedIn && convexAuthenticated) {
          replaceAllBatches({ batches: normalizedNext }).catch(() => {
            writeJson(SALARY_STORAGE_KEY, { batches: normalizedNext });
            setToast({
              tone: "warning",
              message: "Cloud sync failed. Salary batches are saved locally for now.",
            });
          });
        } else {
          writeJson(SALARY_STORAGE_KEY, { batches: normalizedNext });
        }
        return normalizedNext;
      });
    },
    [convexAuthenticated, isSignedIn, replaceAllBatches, settings],
  );

  const updateSalaryBatchPayment = useCallback(
    (batchId: string, paid: boolean) => {
      setSalaryBatches((prev) => {
        const next = normalizeSalaryState({
          batches: prev.map((batch) => batch.id === batchId
            ? { ...batch, paid, paidDate: paid ? iso(todayDate()) : "" }
            : batch),
        }).batches;
        if (isSignedIn && convexAuthenticated) {
          replaceAllBatches({ batches: next }).catch(() => {
            writeJson(SALARY_STORAGE_KEY, { batches: next });
            setToast({
              tone: "warning",
              message: "Cloud sync failed. The payout status is saved locally for now.",
            });
          });
        } else {
          writeJson(SALARY_STORAGE_KEY, { batches: next });
        }
        return next;
      });
    },
    [convexAuthenticated, isSignedIn, replaceAllBatches],
  );

  const exportBackup = useCallback(() => createWorkspaceBackup({ projects: items, clients: settings.clients, resources: resourceLinks, salaryBatches, settings: { ...settings } }), [items, resourceLinks, salaryBatches, settings]);
  const importBackup = useCallback(async (source: string) => {
    if (items.length || settings.clients.length || resourceLinks.length || salaryBatches.length) throw new Error("Cloud import requires an empty Workspace.");
    const backup = parseWorkspaceBackup(source);
    const nextItems = normalizeWorkItems(backup.projects);
    const nextSettings = mergeSettings({ ...backup.settings, clients: normalizeClientRecords(backup.clients) });
    const nextResources = normalizeResourceLinks(backup.resources);
    const nextBatches = normalizeSalaryState({ batches: backup.salaryBatches }).batches;
    if (isSignedIn && convexAuthenticated) {
      await Promise.all([
        replaceAllItems({ items: nextItems }),
        upsertSettings(nextSettings),
        replaceAllResources({ resources: nextResources }),
        replaceAllBatches({ batches: nextBatches }),
      ]);
    }
    setItemsState(nextItems); setSettingsState(nextSettings); setResourceLinksState(nextResources); setSalaryBatches(nextBatches);
    return { projects: nextItems.length, clients: nextSettings.clients.length, resources: nextResources.length, salaryBatches: nextBatches.length };
  }, [convexAuthenticated, isSignedIn, items.length, replaceAllBatches, replaceAllItems, replaceAllResources, resourceLinks.length, salaryBatches.length, settings.clients.length, upsertSettings]);

  const value: DataContextValue = {
    items,
    setItems,
    settings,
    setSettings,
    resourceLinks,
    setResourceLinks,
    salaryBatches,
    reconcileSalaryBatches,
    updateSalaryBatchPayment,
    exportBackup,
    importBackup,
    isAuthEnabled: true,
    isSignedIn: !!isSignedIn,
    isAuthLoaded: clerkLoaded && ready && (!isSignedIn || !convexAuthLoading),
    toast,
    setToast,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
