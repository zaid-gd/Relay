# Normalize Salary Batches

Status: resolved
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

## Result

- Production dry run: 0 legacy batches, 0 current batches, 0 batches missing Project IDs, and 0 payment conflicts. No data write ran.
- Removed the legacy Salary Batch API and all runtime count-based settlement. New local and cloud batches store exact Project IDs.
- Current payment writes keep `paid` and `received` aligned while the widened schema remains for ticket 11.
- The focused Project Salary Batch transition and payment check passes.
