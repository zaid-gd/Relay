# 08: Cleanup and workspace verification

**What to build:** Finish the Authenticated Workspace UI migration with one maintained component path and a high-level regression contract.

**Blocked by:** 03: Dashboard and Projects directory; 04: Project workspace and media review; 05: Calendar, search, resources, and templates; 06: Clients, team, chat, and integrations; 07: Reports, settings, account, and organization.

**Status:** resolved

- [x] Dead UI compatibility code and confirmed conflicting UI dependencies are removed.
- [x] Feature code has no direct Radix or Animate UI imports.
- [x] One Playwright workspace UI contract covers App Shell routes, interactive overlays, focus restoration, reduced motion, and removal of the Density control.
- [x] Public surfaces remain outside the migration and retain their existing behavior.
- [x] Type checking, targeted tests, the MUI allowlist, production build, and workspace end-to-end checks pass.

## Answer

The authenticated workspace now uses one owned shadcn component path with Radix kept inside `components/ui`, fixed balanced density, restrained Motion feedback, and a cross-route Playwright contract. The focused workspace checks pass. The broad legacy Playwright suite still reports stale project-helper, shell-radius, dashboard-copy, and board-persistence assertions outside this ticket.
