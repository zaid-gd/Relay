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

Added the Studio Split Page System marker, monochrome light and dark tokens, Geist typography, compact and balanced density, reduced-motion handling, and shared surface rules. The focused test, TypeScript check, and production build pass.
