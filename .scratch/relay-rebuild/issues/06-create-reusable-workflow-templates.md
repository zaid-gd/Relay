# 06 — Create reusable Workflow Templates

**What to build:** Let Workspace Owners manage reusable Workflow Templates with editable stage labels, fixed reporting purposes, starter Project Outputs, relative dates, roles, and Client Portal defaults. Templates must act as copies, so later edits never rewrite live Projects. Commit this slice to the shared rebuild branch; do not open a separate pull request or deploy it.

**Blocked by:** 05 — Manage durable Clients.

**Status:** ready-for-agent

- [ ] The default Workflow Template contains Planned, Editing, Client Review, Revisions, Approved, and Delivered purposes with editable visible labels.
- [ ] Every template retains exactly one Delivered-purpose stage; Cancelled remains outside the ordered path; stages in use cannot be removed until Projects are reassigned.
- [ ] Owners can create, edit, rename, reorder, archive, and inspect templates with starter outputs, relative deadlines, roles, and portal defaults.
- [ ] Domain and controller tests prove stage invariants and that template edits do not mutate copied Project setup.
