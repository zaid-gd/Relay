# 02: App Shell and navigation

**What to build:** Give authenticated workspace members a consistent persistent navigator, top bar, and mobile navigation with clear route state and accessible interaction feedback.

**Blocked by:** 01: Shared UI boundary and fixed density.

**Status:** resolved

- [x] Desktop and mobile navigation preserve the existing route structure and workflows.
- [x] The active route uses restrained shared-layout motion and remains clear without motion.
- [x] Icon-only navigation actions expose accessible names and tooltips.
- [x] Sidebar collapse state, keyboard navigation, and mobile-sheet focus behavior remain correct.
- [x] App Shell end-to-end checks pass.

## Answer

The App Shell now keeps Radix-backed menus, tooltips, command search, and the mobile sheet behind owned shadcn components. Its active route uses one shared Motion indicator, remaining raw navigation buttons use the owned Button, and reduced-motion behavior is preserved.
