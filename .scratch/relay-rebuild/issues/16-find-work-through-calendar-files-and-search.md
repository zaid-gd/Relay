# 16 — Find work through Calendar, Files, and global search

**What to build:** Let users find commitments and material without editing them outside their owner. Relay must provide a read-only Calendar and subscribed feed, a searchable Workspace Files index whose write actions stay in Projects, and global search across core records and actions. Commit this slice to the shared rebuild branch; do not open a separate pull request or deploy it.

**Blocked by:** 15 — Track payments and report consistent money.

**Status:** resolved

- [x] Calendar presents Project, Project Output, review, and payment dates without drag or event writes and exposes a read-only subscribed calendar feed.
- [x] Files provides a searchable Workspace-wide index, but create, update, version, visibility, archive, and deletion actions remain in the owning Project.
- [x] Global search finds allowed Clients, Projects, Project Groups, Project Outputs, and common actions without exposing archived or restricted data by default.
- [x] Calendar, Files, and search work with keyboard-only use, high zoom, reduced motion, stable shell scrolling, and the relevant local, sample, and cloud capabilities.

## Answer

Implemented read-only Workspace Calendar and Files views plus keyboard-first global search. Calendar derives Project, Output, review, and payment dates and exports an importable read-only feed. Files indexes authorized Project files without moving write controls out of Projects. Search covers allowed active records and common actions.
