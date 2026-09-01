# 10: Remove old plans and certify the launch model

**What to build:** Remove Studio, old prices, and user-level billing assumptions from active Relay surfaces. First migrate existing subscriptions, then reconcile billing projections and entitlements, then verify no active UI, tests, entitlements, or Clerk configuration references the old Creator/Studio identifiers before final removal or slug renaming. Make marketing, onboarding, subscription management, upgrade prompts, and backend enforcement agree on Free, Creator, and Team, then verify each plan as a real user would use it.

**Blocked by:** 02: Launch Creator checkout and trial. 03: Enforce Creator feature access. 04: Enforce accurate Workspace storage quotas. 05: Deliver the Creator client experience. 06: Launch Team with correct seat rules. 07: Sell extra Editor Seats. 08: Sell 50 GB Storage Add-ons. 09: Handle billing changes without data loss.

**Status:** ready-for-agent

- [ ] Active product copy shows only Free, Creator, and Team with approved monthly, annual, trial, storage, and seat terms.
- [ ] Studio and the old Creator and Studio prices no longer appear in active UI, tests, entitlements, or Clerk configuration.
- [ ] The marketing site lists only capabilities that have passed their implementation tickets.
- [ ] Upgrade prompts identify the exact capability and correct target plan.
- [ ] Free, Creator trial, paid Creator, base Team, expanded Team, and over-limit downgrade journeys pass end to end.
- [ ] Owner, Editor, Viewer, Client Contact, and unrelated-user access match the plan document.
- [ ] Storage totals, Editor quantities, add-on quantities, Clerk subscription state, and Convex entitlements agree after reconciliation.
- [ ] Repository checks find no active user-level billing assumption or stale Studio entitlement.
- [ ] Type checking, relevant tests, application build, focused browser checks, and full repository verification pass.
- [ ] Production deployment, live Clerk plan changes, live Convex migration, and R2 enablement remain separately approved operations.
