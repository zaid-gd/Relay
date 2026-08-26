# Legacy retirement and application split

Status: ready

## Outcome

Remove confirmed dead Relay code, migrate stored legacy formats, delete their compatibility paths, and split `tracker-app.tsx` by product capability without changing user-visible behavior.

## Scope

- Remove the internal workspace-page prototype, stale brand material, and stale modal checks.
- Replace CutLab and FrameDesk names in active code with Relay names.
- Migrate `workItems` records to `projects`.
- Migrate `portalDeliverables` records to Project Outputs and Media Versions.
- Backfill Client Portal access into one field.
- Backfill Salary Batches, Workflow Stages, integration settings, and role permissions into their current forms.
- Remove old schema fields, tables, functions, validators, fallbacks, and tests after migration checks pass.
- Turn `tracker-app.tsx` into route composition. Move each capability's behavior and screen into its own module.

## Non-goals

- No product redesign.
- No live migration without an explicit deployment choice and confirmation.
- No new state library or generic application framework.
- No rewrite of working screens.

## Architecture

Use the capability seams already accepted in `docs/adr/0001-rebuild-relay-at-capability-seams.md`.

- Routes compose capability modules.
- Capability controllers own display state and actions.
- Local, sample, and Convex adapters hide persistence.
- Screens receive display-ready models and semantic actions.
- `tracker-app.tsx` stops owning feature implementations.

Keep modules together until navigation becomes hard. File count is not the goal. Locality is.

## Migration rule

Every stored-data change follows widen, migrate, verify, narrow.

1. Keep old and new formats readable while new writes use the current format.
2. Run a dry run against the selected deployment.
3. Run the backfill in batches.
4. Prove no legacy rows or fields remain.
5. Remove fallback reads, legacy writes, schema fields, tables, and migration code in a later deploy.

## Dependency order

1. Remove dead files and repair the browser contract.
2. Inventory legacy data in the selected Convex deployment.
3. Run independent backfills that the inventory proves necessary.
4. Narrow the schema only after every backfill verification passes.
5. Extract Projects as the first application module.
6. Extract the remaining route capabilities one at a time.

## Acceptance criteria

- No product route or verification script expects the removed project-detail modal.
- No public prototype route remains.
- Active source uses Relay naming.
- The selected Convex deployment has no required data only present in legacy tables or fields.
- The schema and runtime contain no approved-for-removal compatibility paths.
- `tracker-app.tsx` is a small composition module, not the owner of route screens, persistence, permissions, and feature dialogs.
- Local, sample, and cloud modes keep their current behavior.
- Type checking, focused Convex tests, workspace tests, production build, and browser verification pass after each tracer ticket.

## Rollback

- Code cleanup rolls back through its commit.
- Each migration keeps the widened schema and fallback reader until verification succeeds.
- Backfills must be idempotent and resumable.
- Do not delete legacy records until the current model has matching verified records.
