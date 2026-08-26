# Normalize Workflow Stages

Status: blocked
Blocked by: 02 Inventory legacy Convex data

## Work

- Convert string stage arrays into structured Workflow Stage records.
- Replace positional legacy stage IDs with stable stage IDs.
- Inventory duplicate labels and unknown current stages. Stop ambiguous mappings for manual resolution.
- Preserve stable IDs, labels, order, empty stages, purpose, progress, and current Project stage.

## Done when

- No Project requires string stages or positional IDs.
- Every current stage maps only after duplicate-label and unknown-stage conflicts reach zero.
- Workflow and Project transition tests pass.
- The legacy normalizers are safe for ticket 11 to remove.
