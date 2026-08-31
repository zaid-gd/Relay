# 01: Establish Workspace subscription authority

**What to build:** Give every Relay Workspace a matching Clerk Organization and one trusted Convex subscription projection. New Workspaces start on Free. Existing development Workspaces receive a safe Free projection. The app can show the confirmed plan and a pending or repair state without trusting client input.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

- [ ] Each Workspace maps to one Clerk Organization used as its billing payer.
- [ ] Convex stores the verified Workspace plan, billing period, status, subscription identifiers, quantities, last event, and reconciliation state.
- [ ] A single server-side entitlement result describes plan features, Editor Seats, Storage Quota, and billing health.
- [ ] Public Convex functions derive Workspace and identity on the server and reject client-supplied billing authority.
- [ ] New Workspaces receive Free access even while Clerk and Convex synchronization is pending.
- [ ] Existing development Workspaces gain a recoverable Free projection without touching production or deleting data.
- [ ] Owner transfer preserves the Workspace-to-Clerk-Organization mapping.
- [ ] Tests prove Free defaults, Workspace isolation, pending state, repair state, and transfer behavior.
- [ ] Type checking and relevant Convex tests pass.
