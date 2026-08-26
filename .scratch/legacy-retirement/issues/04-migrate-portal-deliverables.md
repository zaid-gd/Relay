# Migrate portal deliverables

Status: blocked
Blocked by: 02 Inventory legacy Convex data

## Work

- Map every retained `portalDeliverables` row to a Project Output and client-visible Media Version.
- Preserve title, link, download policy, status, timestamps, and portal visibility.
- Make the migration idempotent so retries cannot create duplicate outputs or versions.
- Give migrated records stable legacy identities and deduplicate dual-read results by that identity during rollout.
- Verify both editor and public portal projections before retiring either old reader.

## Done when

- Dry run and backfill counts match the inventory.
- Editor and public portal tests prove old and migrated records render the same result.
- Every deliverable renders once during dual reads, and deduplication happens before the result limit is applied.
- No portal depends only on `portalDeliverables`.
