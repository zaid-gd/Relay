# 03: Enforce Creator feature access

**What to build:** Make Creator unlock its existing paid capabilities across both the interface and Convex. Free keeps its promised Project, Client, Review, delivery, portal, and external-embed workflow but cannot bypass paid entry points.

**Blocked by:** 01: Establish Workspace subscription authority. 02: Launch Creator checkout and trial.

**Status:** ready-for-agent

- [ ] Creator unlocks hosted uploads, custom Workflow Template changes, advanced reports, and Salary Plans.
- [ ] Free retains unlimited Projects and Clients, basic workflow tracking, Reviews, delivery, standard Client Portals, and External Video Embeds.
- [ ] Free cannot upload files or create internal Team Member invitations.
- [ ] Interface visibility and server enforcement use the same Workspace entitlement result.
- [ ] Editors receive Workspace entitlements rather than needing personal paid subscriptions.
- [ ] Trialing Creator Workspaces receive Creator access until Clerk confirms the trial ended or changed state.
- [ ] Past-due and canceled behavior follows the safe downgrade rules without deleting data.
- [ ] Tests drive each protected public capability as Free, Creator, and unrelated users.
- [ ] Existing feature behavior remains unchanged when access is allowed.
- [ ] Type checking and relevant Convex tests pass.
