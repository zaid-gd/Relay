# 02: Launch Creator checkout and trial

**What to build:** Let a Workspace Owner subscribe their Clerk user to Creator. Clerk handles checkout and subscription management. Relay projects confirmed billing onto the Owner's Workspace and shows a pending result until Convex confirms the Clerk state.

**Blocked by:** 01: Establish Workspace subscription authority.

**Status:** paused

- [x] Clerk development has Free and Creator User plans with stable Relay slugs.
- [ ] Creator production prices and trial terms receive a final review before checkout opens.
- [x] `subscription-plans.tsx` uses Clerk User plans and Clerk's built-in pricing and account settings.
- [x] Only the Workspace Owner can start checkout or manage the subscription.
- [x] Successful checkout returns to Relay and shows pending until Convex confirms or reconciles the plan.
- [x] Cancellation, incomplete checkout, and failed payment produce clear states without granting paid access.
- [x] The app does not claim payment succeeded from a redirect parameter alone.
- [ ] Production Clerk Billing connects to Stripe and the signed Clerk webhook.
- [ ] Browser coverage proves monthly, annual, trial, pending, canceled, and signed-out behavior without depending on Clerk component markup.
- [x] Type checking, build, and focused component checks pass with checkout paused.

Checkout is deliberately paused with `NEXT_PUBLIC_BILLING_PURCHASES_ENABLED=false`. Relay uses Clerk's User `PricingTable` and `UserProfile`, and grants paid access only from the confirmed Convex projection. Resume this ticket after production Stripe and webhook setup.
