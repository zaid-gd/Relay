# Migrate portal deliverables

Status: resolved
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

## Result

- Production inventory and dry run: 0 `portalDeliverables`, 0 missing Project Outputs, and 0 missing Media Versions. No backfill or data write ran.
- Removed legacy deliverable reads and mutations from `clientPortals`. Its compatibility projection now reads current client-visible Project Files only; the active Project Portal flow already reads Project Outputs and Media Versions.
- Focused editor and public portal checks cover current deliverable creation, private draft filtering, approved and final delivery, and the result limit before this ticket is resolved.
- Runtime source scan outside the schema and tests reports no `portalDeliverables` query.
