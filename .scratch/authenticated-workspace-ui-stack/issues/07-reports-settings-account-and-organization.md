# 07: Reports, settings, account, and organization

**What to build:** Give workspace owners consistent reporting and configuration surfaces while preserving theme and accent preferences and using one balanced density.

**Blocked by:** 01: Shared UI boundary and fixed density; 02: App Shell and navigation.

**Status:** resolved

- [x] Reports and salary views use shared page geometry and owned controls.
- [x] Settings no longer exposes or persists a global Density preference.
- [x] Theme and accent preferences continue to work.
- [x] Account and organization surfaces use the same buttons, tabs, menus, dialogs, and responsive sheets.
- [x] Existing reporting, settings, account, and organization workflows remain unchanged.
- [x] Relevant component checks pass.
- [ ] Relevant end-to-end checks are unverified; they have not been run.

## Answer

Report range controls now use owned animated Tabs. The global Density setting and write path are gone, while theme and accent settings remain. Existing report calculations pass their focused tests and all affected routes type-check.
