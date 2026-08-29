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
