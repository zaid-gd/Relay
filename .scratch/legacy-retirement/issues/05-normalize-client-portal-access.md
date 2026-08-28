# Normalize Client Portal access

Status: resolved
Blocked by: 02 Inventory legacy Convex data

## Work

- Write `enabled` for every Client Portal that still derives access from `published`.
- Keep the fallback reader during the migration deploy.
- Verify public access and owner controls for enabled and disabled portals.

## Done when

- Dry-run and backfill counts match the inventory.
- No Client Portal lacks `enabled`.
- A value-level parity query reports zero cases where backfilled `enabled` differs from the resolved legacy `published` state.
- `readPublicPortalAccess` tests cover enabled and disabled portals.
- Portal tests pass and the old fallback is safe for ticket 11 to remove.

## Result

- Production dry run and no-op backfill: 0 Client Portals and 0 missing `enabled`. No data write ran.
- Parity query: 0 records where stored `enabled` differs from the legacy `published` access state.
- Current portal creation and access-control writes already store `enabled`. The fallback reader remains for the widened migration window and is safe for ticket 11 to remove.
- Focused access-control checks cover enabled, disabled, and expired public links.
