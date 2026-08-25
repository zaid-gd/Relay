# 02 - App Shell and Dashboard

**What to build:** Move the production App Shell and Dashboard to Studio Split so a solo editor lands in a full-width workspace with stable navigation, compact global actions, clear daily decisions, and the right money summary.

**Blocked by:** 01 - Studio Split foundation.

**Status:** resolved

- [x] The desktop App Shell matches the approved expanded sidebar, compact top bar, full-width work canvas, and static monochrome selected state.
- [x] Navigation preserves every current href, deep link, command action, shortcut, notification, account action, sample marker, permission rule, and Local Workspace status.
- [x] Selected navigation runs one silver pass for at most 600ms, then unmounts it; reduced motion shows the static selected state immediately.
- [x] Quick Search sits at the top of the sidebar; Quick Create, notifications, and account controls sit in the top bar without adding a second persistent create action to the sidebar.
- [x] The Dashboard shows today's decisions, active Projects, due work, waiting Reviews, collected money, current Salary Batch, and a short activity list.
- [x] Dashboard items open the correct preserved route or Project context.
- [x] Team navigation remains hidden until the Owner invites another Team Member.
- [x] Responsive navigation, keyboard access, route announcements, focus restoration, light and dark themes, and reduced motion pass at the agreed browser seam.
- [x] Focused tests, typecheck, and production build pass.

## Answer

Migrated the live App Shell and Dashboard to Studio Split, placed Quick Search in the sidebar and account actions in the top bar, added the short selected-route pass, hid Team routes for solo Workspaces, and aligned Dashboard metrics with active work, due work, waiting Reviews, collected money, and Salary Batches.
