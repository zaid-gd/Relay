# 01 — Establish Relay's domain and rebuild boundary

**What to build:** Make Relay and its new domain terms authoritative before they appear in code or UI. Record the accepted controller, capability-port, adapter, and presentation boundaries, the clean-start cloud-data rule, and the known name-clearance risk. Prepare the replacement beside the current product without changing the deployed experience. Commit this work to the shared Relay rebuild branch; do not open a separate pull request or deploy it.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] The glossary names Relay and defines Workspace, Client, Project Group, Project, Project Output, Media Version, Workflow Template, Salary Plan, and Salary Batch with no conflict between old and new terms.
- [x] Architecture records state that route-facing controllers return display-ready models and semantic actions through capability-specific ports with local, sample, Convex, and in-memory adapters.
- [x] The replacement uses new cloud records and leaves all old tables and records unread, unmigrated, and undeleted.
- [x] The existing deployed product remains unchanged, and the work stays local with no ticket-level pull request or deployment.

## Answer

Made Relay authoritative in the glossary, recorded the capability seams and clean-start cloud rule, preserved the name-clearance warning, and added a repeatable contract check. The global local-development password gate is also removed.
