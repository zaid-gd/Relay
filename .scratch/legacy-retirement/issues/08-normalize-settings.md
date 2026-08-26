# Normalize integration and permission settings

Status: blocked
Blocked by: 02 Inventory legacy Convex data

## Work

- Backfill `integrationConfigs` from old integration flags and accounts.
- Backfill role permissions from flat `editorPermissions`.
- Keep `integrations`, `integrationAccounts`, and `editorPermissions` only in read-time migration input.
- Omit those legacy fields from local storage and `api.settings.upsert`, and make the Convex writer accept only the current format.

## Done when

- No settings record depends on `integrations`, `integrationAccounts`, or `editorPermissions`.
- Persistence tests prove newly written local and Convex settings omit all three legacy fields.
- Integration and Team permission tests pass.
- Old fields and readers are safe for ticket 11 to remove.
