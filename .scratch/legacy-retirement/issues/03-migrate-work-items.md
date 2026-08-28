# Migrate workItems into Projects

Status: resolved
Blocked by: 02 Inventory legacy Convex data

## Work

- Make current Project writes authoritative during the migration window.
- Backfill each unmatched `workItems` record into `projects` with stable IDs and preserved ownership.
- Move every direct legacy reader to `projects`, including Client Portals, Project Files, Project Activity, Team queries, Project Groups, and salary paths.
- Verify project files, activity, groups, permissions, portals, and salary links resolve through `projects`.
- Stop runtime reads and writes through `convex/workItems.ts`.

## Done when

- The backfill dry run and real run report the expected counts.
- Every retained legacy Project has a verified current Project.
- Focused Project, Team, File, Activity, and Salary tests pass.
- A source scan finds no runtime `workItems` query outside migration code.
- `workItems` removal is safe for ticket 11.

## Result

- Production inventory and dry run: 0 `workItems`, 0 unmatched, so no backfill mutation or data write was needed.
- Current `projects` writes remain authoritative. Client Portals, Project Files, Project Activity, Team project lookup, and member cleanup now read `projects` only.
- Removed the public `convex/workItems.ts` API. The empty legacy table stays in the widened schema until ticket 11.
- Focused checks: 26 Project File and Project Group tests pass; the current-Project Team comment check passes; TypeScript passes.
- Runtime source scan outside the schema and tests reports no `workItems` query or type reference.
