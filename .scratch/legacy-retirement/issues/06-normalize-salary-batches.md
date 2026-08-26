# Normalize Salary Batches

Status: blocked
Blocked by: 02 Inventory legacy Convex data

## Work

- Backfill exact `projectIds` for every retained Salary Batch that lacks them.
- Count ambiguous historical batches and conflicting `received` and `paid` values. Stop for manual resolution rather than guessing.
- Verify the agreed payment state, totals, attribution, and batch membership.

## Done when

- Every retained Salary Batch has verified Project IDs.
- Conflict counts are zero before removing either payment-state fallback.
- Every normalized batch stores the agreed payment state.
- Reports and Salary tests pass without the count-based fallback.
- The fallback is safe for ticket 11 to remove.
