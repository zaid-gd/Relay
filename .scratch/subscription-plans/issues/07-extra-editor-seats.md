# 07: Sell extra Editor Seats

**What to build:** Let a Team Owner add Editors above the three included editing seats. Clerk handles the recurring $5 monthly or $50 annual seat charge, and Convex grants one additional Editor capacity plus 2 GB of Workspace storage for each confirmed extra seat.

**Blocked by:** 06: Launch Team with correct seat rules.

**Status:** ready-for-agent

- [ ] The Team billing setup charges only for editing seats above the three included seats.
- [ ] Monthly Team uses $5 monthly extra seats and annual Team uses $50 annual extra seats.
- [ ] The app cannot mix monthly base billing with annual seat billing or the reverse.
- [ ] Convex uses only confirmed Clerk quantity when allowing an Editor invitation or promotion.
- [ ] Each confirmed extra Editor Seat adds exactly 2 GB to the Workspace Storage Quota.
- [ ] Pending Editor invitations reserve confirmed capacity but do not cause duplicate charges.
- [ ] Removing or demoting an Editor updates billing through an idempotent flow and never removes files.
- [ ] Clerk event retries, stale quantities, and failed changes cannot over-provision Editors or storage.
- [ ] Tests cover fourth and fifth Editors, quantity increases and decreases, pending invitations, failed billing, and annual pricing.
- [ ] Type checking, Team tests, billing-event tests, and focused browser checks pass.
