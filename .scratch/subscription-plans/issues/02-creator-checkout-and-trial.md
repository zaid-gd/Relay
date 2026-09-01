# 02: Launch Creator checkout and trial

**What to build:** Let a Workspace Owner subscribe the active Clerk Organization to Creator at $9 monthly or $90 annually with a seven-day trial. Clerk handles checkout and subscription management. Relay shows a pending result until Convex confirms or reconciles the Clerk state.

**Blocked by:** 01: Establish Workspace subscription authority.

**Status:** ready-for-agent

- [ ] Clerk has Free, Creator, and Team Organization plans with stable Relay slugs and approved monthly and annual prices.
- [ ] Creator has a seven-day trial and Team has no trial.
- [ ] `subscription-plans.tsx` uses Clerk Organization plans and pricing, targeting the active Clerk Organization rather than the signed-in user, and an organization-scoped checkout test covers the flow.
- [ ] Only the Workspace Owner can start checkout or manage the subscription.
- [ ] Successful checkout returns to Relay and shows pending until Convex confirms or reconciles the plan.
- [ ] Cancellation, incomplete checkout, and failed payment produce clear states without granting paid access.
- [ ] The app does not claim payment succeeded from a redirect parameter alone.
- [ ] Browser coverage proves monthly, annual, trial, pending, canceled, and signed-out behavior without depending on Clerk component markup.
- [ ] Type checking, build, and focused browser checks pass.
