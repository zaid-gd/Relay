# 08 — Manage Projects through the table

**What to build:** Give users a clear Projects table for scanning, sorting, filtering, opening, archiving, and, when authorized, permanently deleting Projects. Useful view state must survive return and sharing without cluttering solo use. Commit this slice to the shared rebuild branch; do not open a separate pull request or deploy it.

**Blocked by:** 07 — Create Projects and Project Groups.

**Status:** resolved

- [x] The table shows name, Client, stage, due date, payment state, and salary marker, plus assignees only when Team use makes them useful.
- [x] Useful filters and sorting use the URL, Editors default to assigned Projects unless Workspace policy allows all Team Projects, and the selected table or board view is remembered.
- [x] Archive is the normal removal action and preserves history; permanent deletion is Owner-only and explains effects on files, versions, portals, and Activity.
- [x] Table structure, empty, loading, error, focus, and keyboard behavior are tested through public interface contracts.

## Answer

Implemented the Studio Split Projects directory with URL-backed filtering and sorting, remembered table and board views, assigned-only Editor scope, archive and restore, and permission-gated permanent deletion with a full impact warning.
