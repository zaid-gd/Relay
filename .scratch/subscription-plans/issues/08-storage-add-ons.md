# 08: Sell 50 GB Storage Add-ons

**What to build:** After the storage cost gate passes, let Creator and Team Owners add 50 GB storage packs for $5 monthly or $50 annually. Clerk handles the recurring add-on, while Convex increases quota only for confirmed active quantities.

**Blocked by:** 04: Enforce accurate Workspace storage quotas.

**Status:** paused

The cost gate, R2 launch, and Clerk User Billing add-on model are not approved.

- [ ] A recorded Convex and Cloudflare R2 cost review approves the public add-on price before the offer becomes visible.
- [ ] Creator and Team Owners can buy monthly or annual packs that match the Workspace billing period.
- [ ] Each confirmed active quantity adds exactly 50 GB to the Workspace Storage Quota.
- [ ] Free cannot buy a Storage Add-on without first selecting a paid base plan.
- [ ] Only the Workspace Owner can change add-on quantity.
- [ ] Convex does not raise quota from client input, checkout redirects, incomplete items, or failed payments.
- [ ] Removing a pack never deletes files; it blocks new uploads while retained usage exceeds the reduced quota.
- [ ] Duplicate and out-of-order Clerk events leave the final quantity correct.
- [ ] If the cost gate fails, the add-on remains hidden without blocking the base plans.
- [ ] Type checking, storage tests, billing-event tests, and focused browser checks pass.
