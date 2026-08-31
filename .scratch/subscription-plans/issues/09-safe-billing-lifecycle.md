# 09: Handle billing changes without data loss

**What to build:** Make trials, renewals, cancellations, failed payments, plan changes, ownership transfers, and missed Clerk events settle into one safe Workspace state. Relay preserves files and members while blocking only actions that exceed the confirmed plan.

**Blocked by:** 03: Enforce Creator feature access. 06: Launch Team with correct seat rules. 07: Sell extra Editor Seats. 08: Sell 50 GB Storage Add-ons.

**Status:** ready-for-agent

- [ ] The webhook route verifies Clerk signatures and rejects spoofed events.
- [ ] Convex deduplicates every delivery and handles supported events idempotently.
- [ ] Out-of-order events cannot replace a newer confirmed subscription state.
- [ ] A bounded reconciliation path reads the current Clerk Organization subscription when webhook state is late or missing.
- [ ] Trial end, cancellation, past due, failed renewal, paid recovery, upgrade, and downgrade resolve to documented entitlements.
- [ ] Downgrades never delete files or Team Members.
- [ ] Over-quota Workspaces keep read access but cannot upload until compliant.
- [ ] Over-seat Workspaces keep existing members but cannot invite or promote Editors until compliant.
- [ ] Ownership transfer keeps billing attached to the Workspace's Clerk Organization.
- [ ] Tests cover retries, replays, missed events, reconciliation, state ordering, and every lifecycle transition.
- [ ] Type checking, billing-event tests, and relevant Convex tests pass.
