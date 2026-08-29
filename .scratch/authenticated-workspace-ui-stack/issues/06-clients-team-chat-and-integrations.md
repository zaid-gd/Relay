# 06: Clients, team, chat, and integrations

**What to build:** Give workspace managers coherent people, communication, and integration surfaces without changing permissions or workflows.

**Blocked by:** 02: App Shell and navigation.

**Status:** resolved

- [x] Clients, team, chat, and integrations use shared page geometry and owned controls.
- [x] Lists, menus, overlays, empty states, and responsive layouts follow the same interaction rules.
- [x] Permissions, invitations, archived records, and integration behavior remain unchanged.
- [x] Keyboard and focus behavior remain accessible.
- [x] Relevant type and component checks pass.

## Answer

These routes already used the shared Page System and owned shadcn controls. The remaining generic client-search icon action now uses the owned Button and Tooltip. Purpose-built client rows remain native selectors, and no permission or data flow changed.
