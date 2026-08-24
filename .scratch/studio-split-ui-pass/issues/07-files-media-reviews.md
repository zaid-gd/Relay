# 07 - Files, Media, and Reviews

**What to build:** Move Files, Media, and Review work to Studio Split so Project context, current versions, feedback state, and upload intent remain clear across library and Project Workspace journeys.

**Blocked by:** 04 - Project Workspace.

**Status:** resolved

- [x] Files opens on Files first and remembers the last-used view after the user changes it.
- [x] Media opens as a grid with an optional list and remembers the last-used view.
- [x] Global upload requires Project and Project Output; Project Workspace upload retains the Project and asks only for the Project Output.
- [x] Media and file rows preserve search, filters, collections, current version, Project context, safe open, copy, download, and permission behavior.
- [x] Reviews use the states Needs your action, Waiting on Client, Approved, and Resolved with text or icons in addition to color.
- [x] Media and Reviews share the Project viewer without mixing unshared files or internal-only context into Client access.
- [x] A newly selected Review Media Version receives one monochrome edge sweep for at most 600ms, then keeps a static selected state.
- [x] Reduced motion changes Review selection without the sweep.
- [x] Non-drag controls provide every upload, select, reorder, or move action that otherwise uses pointer interaction.
- [x] Loading, empty, failure, refresh, read-only, sample, keyboard, mobile sheet, light, and dark states pass.
- [x] Focused tests, typecheck, and production build pass.

## Answer

Aligned Files, Media, and Reviews with Studio Split, made Media grid-first with a remembered list option, and added the reduced-motion-safe Review selection sweep.

