# Normalize Workflow Stages

Status: blocked
Blocked by: 02 Inventory legacy Convex data

## Work

- Convert string stage arrays into structured Workflow Stage records.
- Replace positional legacy stage IDs with stable stage IDs.
- Preserve labels, order, purpose, progress, and current Project stage.

## Done when

- No Project requires string stages or positional IDs.
- Workflow and Project transition tests pass.
- The legacy normalizers are safe for ticket 11 to remove.
