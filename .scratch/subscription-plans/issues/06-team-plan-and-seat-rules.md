# 06: Launch Team with correct seat rules

**What to build:** Add a future Team User plan after its Clerk Billing model is approved. Team includes three editing seats, including the Owner, while Viewers remain free.

**Blocked by:** 01: Establish Workspace subscription authority. 02: Launch Creator checkout and trial. 04: Enforce accurate Workspace storage quotas.

**Status:** paused

- [ ] Team monthly and annual checkout uses an approved Clerk User plan.
- [x] The entitlement model includes three editing seats, including the Owner.
- [x] Owners and Editors consume editing seats in Convex.
- [x] Pending Editor invitations reserve seats until accepted, revoked, or expired.
- [x] Viewers authenticate with Clerk and receive Convex Workspace access without consuming editing seats.
- [ ] Viewer invitations, removals, and access do not change the Editor quantity.
- [x] Team unlocks roles, Project assignments, payouts, and workload reports through server-side entitlements.
- [x] The fixed three-record Workspace cap no longer limits Viewers or confirmed Editors.
- [ ] Tests cover Owner, Editor, Viewer, pending invitation, promotion, demotion, removal, and Workspace isolation.
- [ ] Type checking, Team tests, and focused browser checks pass.

The backend seat rules are in place. Checkout, Clerk configuration, full role coverage, and browser checks remain paused.
