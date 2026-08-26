# Migrate workItems into Projects

Status: blocked
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
