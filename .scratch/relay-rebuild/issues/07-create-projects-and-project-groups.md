# 07 — Create Projects and Project Groups

**What to build:** Let users group related jobs for one Client, create one tracked Project through a short form, copy its Workflow Template, and continue on a bookmarkable Project page. One Project remains one delivery, earnings, and Salary Plan count unit. Commit this slice to the shared rebuild branch; do not open a separate pull request or deploy it.

**Blocked by:** 06 — Create reusable Workflow Templates.

**Status:** resolved

- [x] Users can create, edit, archive, and inspect a Project Group tied to exactly one Client, with progress, count, and money derived from its Projects.
- [x] The new-Project form asks only for name, Client, optional Project Group, Template, due date, and financial type, then opens the new Project's URL.
- [x] The Project page contains Overview, Outputs and Versions, Client Review, Files and Links, and Activity sections, with stage, Client, due date, lead, and assignees kept in the header.
- [x] TanStack Form with Zod is tried on the new-Project form, its result is recorded, and server validation remains authoritative.

## Answer

Implemented durable Project Groups, the short Project form, and bookmarkable Project workspaces. TanStack Form and Zod fit the short form without adding parallel state or weakening server checks, so later bound forms should use the same pair. Convex rejects a Project Group unless it belongs to the selected Client and Workspace.
