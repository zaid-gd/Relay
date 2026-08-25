type WorkspaceBackupData = {
  projects: unknown[];
  clients: unknown[];
  projectGroups?: unknown[];
  resources: unknown[];
  salaryBatches: unknown[];
  settings: Record<string, unknown>;
};

export type WorkspaceBackup = WorkspaceBackupData & {
  version: 1;
  exportedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function createWorkspaceBackup(data: WorkspaceBackupData) {
  const { integrationAccounts: _accounts, integrationConfigs: _configs, integrationLinks: _links, ...safeSettings } = data.settings;
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...data, projectGroups: data.projectGroups ?? [], settings: safeSettings }, null, 2);
}

export function parseWorkspaceBackup(source: string): WorkspaceBackup {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error("The backup is not valid JSON.");
  }
  if (!isRecord(value) || value.version !== 1) throw new Error("Unsupported Relay backup version.");
  if (!Array.isArray(value.projects) || !Array.isArray(value.clients) || !Array.isArray(value.resources) || !Array.isArray(value.salaryBatches) || !isRecord(value.settings)) {
    throw new Error("The Relay backup is incomplete.");
  }
  return { ...value, projectGroups: Array.isArray(value.projectGroups) ? value.projectGroups : [] } as WorkspaceBackup;
}
