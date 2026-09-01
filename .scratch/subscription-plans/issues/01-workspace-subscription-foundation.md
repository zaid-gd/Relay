# 01: Establish Workspace subscription authority

**What to build:** Give every Relay Workspace a matching Clerk Organization and one trusted Convex subscription projection. New Workspaces start on Free. Existing development Workspaces receive a safe Free projection. The app can show the confirmed plan and a pending or repair state without trusting client input.

**Blocked by:** None. Can start immediately.

**Status:** resolved

- [x] Each Workspace maps to one Clerk Organization used as its billing payer.
- [x] Convex stores the verified Workspace plan, billing period, status, subscription identifiers, quantities, last event, and reconciliation state.
- [x] A single server-side entitlement result describes plan features, Editor Seats, Storage Quota, and billing health.
- [x] Public Convex functions derive Workspace and identity on the server and reject client-supplied billing authority.
- [x] New Workspaces receive Free access even while Clerk and Convex synchronization is pending.
- [x] Existing development Workspaces gain a recoverable Free projection without touching production or deleting data.
- [x] Owner transfer preserves the Workspace-to-Clerk-Organization mapping.
- [x] Tests prove Free defaults, Workspace isolation, pending state, repair state, and transfer behavior.
- [x] Type checking and relevant Convex tests pass.

## Comments

- Added idempotent Clerk Organization provisioning with safe Free fallback and repair state.
- Verified with `pnpm lint`, `pnpm build`, and `pnpm exec vitest run convex/workspaceSubscriptions.test.ts`.
- Full Vitest run: 55 passed, 5 pre-existing identity-fixture failures in `convex/team.test.ts` and `convex/identitySubject.test.ts`.
- Standards and spec reviews found no remaining ticket findings.
