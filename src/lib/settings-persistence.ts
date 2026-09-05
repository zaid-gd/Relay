import type { SettingsState } from "./types";

export type SettingsSaveState = "local" | "saving" | "saved" | "error";

export function settingsPatch(previous: SettingsState, next: SettingsState) {
  const {
    clients: oldClients,
    customClients: oldNames,
    ...oldPreferences
  } = omitLegacySettings(previous);
  const {
    clients,
    customClients: names,
    ...preferences
  } = omitLegacySettings(next);
  const changes = Object.fromEntries(
    Object.entries(preferences).filter(
      ([key, value]) =>
        JSON.stringify(value) !==
        JSON.stringify(oldPreferences[key as keyof typeof oldPreferences])
    )
  ) as Partial<typeof preferences>;
  const oldById = new Map(oldClients.map((client) => [client.id, client]));
  const nextIds = new Set(clients.map((client) => client.id));
  const changedClients = clients.filter(
    (client) =>
      JSON.stringify(oldById.get(client.id)) !== JSON.stringify(client)
  );
  for (const client of oldClients) {
    if (!nextIds.has(client.id))
      changedClients.push({ ...client, archived: true });
  }
  return {
    changes,
    ...(changedClients.length ? { clients: changedClients } : {}),
  };
}

const legacySettingKeys = [
  "integrations",
  "integrationAccounts",
  "editorPermissions",
  "density",
] as const;

export function omitLegacySettings<T extends object>(settings: T) {
  return Object.fromEntries(
    Object.entries(settings).filter(
      ([key]) =>
        !legacySettingKeys.includes(key as (typeof legacySettingKeys)[number])
    )
  ) as Omit<T, (typeof legacySettingKeys)[number]>;
}
