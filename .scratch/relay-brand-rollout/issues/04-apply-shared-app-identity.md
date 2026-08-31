# 04: Apply Relay to shared app identity

**What to build:** Apply the production Relay identity through the app's existing shared seams. Cover the App Shell, authentication, metadata, manifest, loading and entry states, errors, and not-found pages. Reuse the app's current black-led direction and Geist setup, with acid lime limited to approved identity and action seams. Change identity only. Do not reopen the approved workspace layout or alter product behavior.

**Blocked by:** Ticket 03.

**Status:** ready-for-agent

- [ ] Shared app branding uses one reusable mark or lockup path instead of repeated local copies.
- [ ] The App Shell shows the approved Relay mark and product name in both dark and light treatments.
- [ ] Authentication, entry, loading, error, and not-found surfaces use the same approved identity.
- [ ] App metadata, favicon, and manifest references resolve to the production brand assets.
- [ ] Existing Geist typography and true-black dark mode remain the base. No second brand token system is introduced.
- [ ] The existing light-logo browser check covers the shared brand path in light and dark contexts.
- [ ] Keyboard access, focus visibility, accessible names, contrast, reduced motion, and 200 percent text resizing remain correct on the changed surfaces.
- [ ] Workspace navigation, projects, clients, reviews, files, reports, settings, authentication behavior, and stored data behave as before.
- [ ] No Convex schema, query, mutation, authorization, billing, storage, or migration code changes.
- [ ] The app passes its native typecheck, production build, and relevant browser checks.
