# 05 — Manage durable Clients

**What to build:** Let users create, edit, inspect, search, archive, and restore durable Client records rather than matching copied names. A Client page must show the relationship's active and past work, Project Groups, allowed money context, and portal links across supported modes. Commit this slice to the shared rebuild branch; do not open a separate pull request or deploy it.

**Blocked by:** 04 — Back up Local Mode and import it into an empty cloud Workspace.

**Status:** ready-for-agent

- [ ] A Client stores name, company, contact name, email, phone, notes, and archive state, and Projects refer to its durable identifier.
- [ ] Client create, edit, search, archive, and restore work through display-ready controllers in local, sample, cloud, and in-memory behavior where each mode allows them.
- [ ] The Client page derives active Projects, past Projects, Project Groups, outstanding money when authorized, and Client Portal links without duplicate totals.
- [ ] Archived Clients stay out of active views by default but remain available to requested search and historical reporting.
