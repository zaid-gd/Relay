# Extract the Projects application module

Status: resolved
Blocked by: 01 Remove confirmed dead residue

## Comments

Claimed on 2026-08-26 after ticket 01 resolved. Test through the real Project routes and the existing Project controller interface. Preserve local, sample, and cloud behavior while moving one complete Project path at a time.

Resolved on 2026-08-27. Project routes now enter through `ProjectsApplication`; Project-opening search and workspace callers share `projectHref`. Project state, permissions, persistence operations, workspace presentation, cloud adapters, and dialogs live under `src/features/projects`. `tracker-app.tsx` keeps shell composition and hands the existing mode-aware item updater to the Project port once.

## Work

- Use Projects as the tracer capability from ADR 0001.
- Move Project domain rules, persistence operations, permissions, controller state, full-page workspace, and Project dialogs behind the Projects capability interface.
- Reuse the existing local, sample, Convex, and in-memory adapter pattern. Do not add a generic registry or one large Workspace interface.
- Leave routes responsible only for composition and route parameters.

## Done when

- Project screens import no generated Convex functions and receive no generic state setters.
- Local, sample, and cloud Project behavior pass the same application checks.
- Project routes and every Project-opening caller use the extracted module.
- The moved implementation and its old definitions do not coexist in `tracker-app.tsx`.

## Answer

- Added a Project port over the existing local, sample, and cloud item adapters. Controllers now use semantic add, replace, update, remove, and client-rename operations instead of React state setters.
- Moved Project route state, permission rules, workspace, file/activity/comment adapters, edit/delete dialogs, route parsing, and Project links into the capability.
- Project screens no longer import generated Convex functions. The cloud adapter validates upload responses before converting the opaque storage ID.
- Verified with `npm run lint`, 26 focused Project tests, `npm run build`, `npm run verify:ui`, and `git diff --check`.
