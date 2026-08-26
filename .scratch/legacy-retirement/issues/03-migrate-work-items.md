# Migrate workItems into Projects

Status: blocked
Blocked by: 02 Inventory legacy Convex data

## Work

- Make current Project writes authoritative during the migration window.
- Backfill each unmatched `workItems` record into `projects` with stable IDs and preserved ownership.
- Verify project files, activity, groups, permissions, and salary links resolve through `projects`.
- Stop runtime reads and writes through `convex/workItems.ts`.

## Done when

- The backfill dry run and real run report the expected counts.
- Every retained legacy Project has a verified current Project.
- Focused Project, Team, File, Activity, and Salary tests pass.
- `workItems` removal is safe for ticket 08.
