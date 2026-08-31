# 06: Launch Team with correct seat rules

**What to build:** Let an Owner subscribe the Workspace's Clerk Organization to Team at $24 monthly or $240 annually. Team includes three editing seats, including the Owner, while Viewers remain free and do not raise the Clerk seat count.

**Blocked by:** 01: Establish Workspace subscription authority. 02: Launch Creator checkout and trial. 04: Enforce accurate Workspace storage quotas.

**Status:** ready-for-agent

- [ ] Team monthly and annual checkout targets the active Clerk Organization.
- [ ] The base Team price includes three editing seats, including the Owner.
- [ ] Owners and Editors consume editing seats and mirror to Clerk Organization membership.
- [ ] Pending Editor invitations reserve seats until accepted, revoked, or expired.
- [ ] Viewers authenticate with Clerk and receive Convex Workspace access without joining the billable Clerk Organization membership.
- [ ] Viewer invitations, removals, and access do not change the Editor quantity.
- [ ] Team unlocks roles, Project assignments, payouts, and workload reports through server-side entitlements.
- [ ] The fixed three-record Workspace cap no longer limits Viewers or purchased Editors.
- [ ] Tests cover Owner, Editor, Viewer, pending invitation, promotion, demotion, removal, and Workspace isolation.
- [ ] Type checking, Team tests, and focused browser checks pass.
