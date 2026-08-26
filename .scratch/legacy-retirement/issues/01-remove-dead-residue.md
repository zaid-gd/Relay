# Remove confirmed dead residue

Status: ready
Blocked by: none

## Work

- Remove `/prototype/workspace-page-primitives` and its fixture.
- Remove the unused CutLab asset generator and obsolete CutLab product documents after checking for current references.
- Update `verify-ui-interactions.mjs` so project opens assert full-page routes instead of the deleted modal.

## Done when

- Source search finds no modal test contract or public prototype route.
- `npm run verify:ui`, `npm run lint`, and `npm run build` pass.

## Comments

This ticket changes no stored data.
