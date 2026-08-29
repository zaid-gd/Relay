# 03: Dashboard and Projects directory

**What to build:** Give workspace members a coherent Dashboard and Projects directory built from the shared Page System and owned interactive controls.

**Blocked by:** 02: App Shell and navigation.

**Status:** resolved

- [x] Dashboard sections and actions use shared page geometry and controls.
- [x] Projects list and board views use owned tabs, menus, buttons, tables, and tooltips.
- [x] Project creation and related overlays use the shared dialog or sheet behavior.
- [x] Keyboard table, filter, view-switch, and navigation workflows remain intact.
- [x] Targeted Dashboard and Projects UI checks pass.

## Answer

Dashboard activity and Projects view and scope selectors now use the owned animated Tabs primitive. Existing shadcn inputs, selects, menus, sheets, tables, and buttons remain in place. The final verification ticket retains two broader existing failures: a stale Dashboard metric label assertion and a local board stage-persistence failure outside the tab change.
