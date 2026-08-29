# 08: Cleanup and workspace verification

**What to build:** Finish the Authenticated Workspace UI migration with one maintained component path and a high-level regression contract.

**Blocked by:** 03: Dashboard and Projects directory; 04: Project workspace and media review; 05: Calendar, search, resources, and templates; 06: Clients, team, chat, and integrations; 07: Reports, settings, account, and organization.

**Status:** resolved

- [x] Dead UI compatibility code and confirmed conflicting UI dependencies are removed.
- [x] Feature code has no direct Radix or Animate UI imports.
- [x] One Playwright workspace UI contract covers App Shell routes, interactive overlays, focus restoration, reduced motion, and removal of the Density control.
- [x] Public surfaces remain outside the migration and retain their existing behavior.
- [x] Type checking, targeted tests, the MUI allowlist, and production build pass.
- [ ] The new workspace end-to-end contract is unverified; it has not been run.

## Answer

The authenticated workspace now uses one owned shadcn component path with Radix kept inside `components/ui`, fixed balanced density, restrained Motion feedback, and a cross-route Playwright contract. The focused workspace checks pass. The new workspace end-to-end contract has not been run.
