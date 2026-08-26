# Normalize Client Portal access

Status: blocked
Blocked by: 02 Inventory legacy Convex data

## Work

- Write `enabled` for every Client Portal that still derives access from `published`.
- Keep the fallback reader during the migration deploy.
- Verify public access and owner controls for enabled and disabled portals.

## Done when

- Dry-run and backfill counts match the inventory.
- No Client Portal lacks `enabled`.
- Portal tests pass and the old fallback is safe for ticket 11 to remove.
