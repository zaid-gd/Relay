# Normalize Salary Batches

Status: blocked
Blocked by: 02 Inventory legacy Convex data

## Work

- Backfill exact `projectIds` for every retained Salary Batch that lacks them.
- Detect ambiguous historical batches and stop for manual resolution rather than guessing.
- Verify paid state, totals, attribution, and batch membership.

## Done when

- Every retained Salary Batch has verified Project IDs.
- Reports and Salary tests pass without the count-based fallback.
- The fallback is safe for ticket 11 to remove.
