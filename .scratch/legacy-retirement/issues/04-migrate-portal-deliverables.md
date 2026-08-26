# Migrate portal deliverables

Status: blocked
Blocked by: 02 Inventory legacy Convex data

## Work

- Map every retained `portalDeliverables` row to a Project Output and client-visible Media Version.
- Preserve title, link, download policy, status, timestamps, and portal visibility.
- Make the migration idempotent so retries cannot create duplicate outputs or versions.
- Verify public portal projections before retiring the old reader.

## Done when

- Dry run and backfill counts match the inventory.
- Public portal tests prove old and migrated records render the same client-safe result.
- No portal depends only on `portalDeliverables`.
