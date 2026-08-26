# Normalize integration and permission settings

Status: blocked
Blocked by: 02 Inventory legacy Convex data

## Work

- Backfill `integrationConfigs` from old integration flags and accounts.
- Backfill role permissions from flat `editorPermissions`.
- Make current settings the only write format during the migration deploy.

## Done when

- No settings record depends on `integrations`, `integrationAccounts`, or `editorPermissions`.
- Integration and Team permission tests pass.
- Old fields and readers are safe for ticket 11 to remove.
