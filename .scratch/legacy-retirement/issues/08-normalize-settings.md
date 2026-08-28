# Normalize integration and permission settings

Status: resolved
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

## Result

- Production dry run: 1 Settings record and 0 dependencies on legacy integration flags, accounts, or flat Editor permissions. No data write ran.
- Local storage and `settings.upsert` now omit all three legacy fields. The schema keeps them optional for read-time migration until ticket 11.
- Focused local persistence and Convex writer checks prove new records contain only the current settings format.
