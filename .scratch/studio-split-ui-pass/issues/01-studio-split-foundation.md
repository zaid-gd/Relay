# 01 - Studio Split foundation

**What to build:** Add the approved Studio Split token and shared component contract beside the current presentation so later route migrations can use one true-black, monochrome, full-width system without breaking existing workflows.

**Blocked by:** None - can start immediately.

**Status:** resolved

- [x] Dark tokens provide a true-black canvas, white primary text, restrained charcoal work areas, and muted semantic red, amber, and green.
- [x] Light tokens provide a soft neutral-gray canvas, white work areas, black primary text, gray controls, and matching semantic states.
- [x] Geist, balanced and compact density, 6px control and work-area radii, 8px overlay radii, focus, disabled, loading, read-only, and selection states are available through semantic interfaces.
- [x] Shared controls and Page System pieces can render Studio Split spacing and surface contrast without continuous divider lines, decorative card chrome, or a brand accent.
- [x] The approved motion allowlist and reduced-motion replacements have named reusable states without introducing continuously repainting animation.
- [x] Existing production routes retain their current presentation and behavior until their migration ticket completes.
- [x] The shared component seam has a red-green test for the Studio Split theme, density, focus, and reduced-motion contract.
- [x] Focused tests, typecheck, and production build pass.

## Answer

Verified and completed the Studio Split foundation: true-black dark and soft-gray light tokens with monochrome control surfaces and muted semantics, Geist type, balanced (36/40) and compact (32/34) density, 6px control/panel and 8px overlay radii with pill tokens, focus/disabled/loading/read-only/selection semantic states, spacing-driven Page System surfaces without continuous dividers or brand accent, and named motion allowlist states (silver pass, edge sweep, thinking orb, gooey, transition) with reduced-motion static fallbacks. Updated DataTableFrame and empty-state surfaces to 6px, expanded the workspace-page red-green contract to cover theme/density/focus/reduced-motion, and verified via focused tests, typecheck, and production build.
