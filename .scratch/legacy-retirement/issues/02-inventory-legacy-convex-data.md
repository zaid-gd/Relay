# Inventory legacy Convex data

Status: ready
Blocked by: none

## Work

With explicit approval for the target deployment, run read-only counts and integrity checks for:

- `workItems` without matching `projects` records;
- `portalDeliverables` without matching Project Output and Media Version records;
- Client Portals missing `enabled`;
- Salary Batches missing `projectIds`;
- Projects with string workflow stages or positional legacy stage IDs;
- settings that still depend on `integrationAccounts`, `integrations`, or `editorPermissions`.

Record counts and orphan cases without copying private record contents into the ticket.

## Done when

- The ticket names the checked deployment.
- Every migration has a count, an integrity query, and a go or no-go result.
- No data changes have run.

## Comments

This ticket must finish before any backfill ticket starts.
