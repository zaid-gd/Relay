# Normalize Workflow Stages

Status: resolved
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

## Result

- Production dry run: 16 Projects, 0 string stage arrays, 0 positional current-stage IDs, 0 duplicate-label workflows, and 0 unknown current stages. No data write ran.
- Current Project writes already require structured stages with stable unique IDs and exactly one Delivered stage.
- Read-time string and positional normalizers remain only for the widened migration window and are safe for ticket 11 to remove.
- Focused workflow normalization and Project transition checks pass.
