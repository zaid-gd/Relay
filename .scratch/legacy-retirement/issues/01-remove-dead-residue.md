# Remove confirmed dead residue

Status: resolved
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

Implemented on 2026-08-26. The obsolete prototype route was already removed. The mobile Dashboard now opens the full Project route, and the unused CutLab asset generator and unreferenced product documents are removed. Type checking, the production build, and the full UI verifier pass.

## Answer

Removed the confirmed dead residue and replaced the mobile Project modal contract with the full-page Project route. The shared scroll check now waits for hydrated Local Workspace data while preserving its detailed failure output.
