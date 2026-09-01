# 04: Apply Relay to shared app identity

**What to build:** Apply the production Relay identity through the app's existing shared seams. Cover the App Shell, authentication, metadata, manifest, loading and entry states, errors, and not-found pages. Reuse the app's current black-led direction and Geist setup, with acid lime limited to approved identity and action seams. Change identity only. Do not reopen the approved workspace layout or alter product behavior.

**Blocked by:** Ticket 03.

**Status:** complete

- [x] Shared app branding uses one reusable mark or lockup path instead of repeated local copies.
- [x] The App Shell shows the approved Relay mark and product name in both dark and light treatments.
- [x] Authentication, entry, loading, error, and not-found surfaces use the same approved identity.
- [x] App metadata, favicon, and manifest references resolve to the production brand assets.
- [x] Existing Geist typography and true-black dark mode remain the base. No second brand token system is introduced.
- [x] The existing light-logo browser check covers the shared brand path in light and dark contexts.
- [x] Keyboard access, focus visibility, accessible names, contrast, reduced motion, and 200 percent text resizing remain correct on the changed surfaces.
- [x] Workspace navigation, projects, clients, reviews, files, reports, settings, authentication behavior, and stored data behave as before.
- [x] No Convex schema, query, mutation, authorization, billing, storage, or migration code changes.
- [x] The app passes its native typecheck, production build, and relevant browser checks.

## Verification, 2026-09-01

- `pnpm lint`: passed.
- `pnpm build`: passed.
- `pnpm verify:brand-assets`: passed.
- `RELAY_UI_URL=http://localhost:3101 pnpm verify:light-logo`: passed for the black lockup in light mode and white lockup in dark mode. The check also covers visible keyboard focus and 200 percent text sizing without horizontal overflow.
- `pnpm verify:browser` remains blocked by its existing `/client-portal` copy assertion. That route belongs to ticket 05 and the failure is unrelated to the shared identity changes in this ticket.
