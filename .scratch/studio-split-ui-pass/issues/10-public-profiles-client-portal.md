# 10 - Public profiles and Client Portal

**What to build:** Move public profiles and the Client Portal to Relay's approved minimal public system so visitors and Clients see only intentional public or shared work without internal effects or Workspace data.

**Blocked by:** 04 - Project Workspace; 07 - Files, Media, and Reviews.

**Status:** resolved

- [x] Public pages use a minimal Relay mark, narrow content width, theme support, and no internal App Shell.
- [x] Public profiles preserve identity, short bio, selected public work, public links, profile save behavior, and only intentionally public stats.
- [x] The Client Portal preserves Project identity, shared Media Versions, Review state, Comments, approval, and delivery actions.
- [x] Internal navigation, money, workflow stages, unshared files, Team data, and private Project details never appear publicly.
- [x] Public pages and the Client Portal use no blur or glow, including dialogs and media overlays.
- [x] The Client Portal starts from the Client device theme and does not inherit the editor's private Workspace preference.
- [x] Missing, invalid, expired, denied, loading, empty, saving, and failed access states explain recovery without leaking scoped data.
- [x] Token routes, public slugs, profile editing, portal sharing, Review, and delivery deep links remain intact.
- [x] Keyboard, landmarks, headings, focus, contrast, reduced motion, 200 percent text, light, dark, and narrow responsive layouts pass.
- [x] Focused tests, typecheck, and production build pass.

## Answer

Public profiles and Client Portal routes now use the minimal Relay public surface. Public profile content is constrained to a readable width, legacy CutLab branding is removed, and the portal keeps its device-theme isolation and scoped recovery states without changing public data or deep-link behavior.

