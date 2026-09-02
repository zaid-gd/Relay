# Relay Workspace subscription plans

Status: paused-billing
Date: 2026-09-02

## Problem Statement

Relay has approved Free and Creator offers, with Team planned for later. Relay uses Clerk User Billing because Clerk Organization Billing requires the paid Organizations add-on. The paid subscription belongs to the Workspace Owner's Clerk user, while Convex projects the confirmed plan onto the Owner's Relay Workspace so Editors and Viewers receive Workspace entitlements.

Checkout is paused until Clerk Billing can connect to a supported production Stripe account. Plans may remain visible, but the app must not allow checkout while `NEXT_PUBLIC_BILLING_PURCHASES_ENABLED` is false. Team checkout, extra Editor billing, and storage add-ons remain deferred.

## Solution

Use Clerk User Billing for Free and Creator. Clerk owns plan configuration, checkout, recurring charges, billing status, and customer-facing plan management. Convex links the Owner's Clerk user ID to a Workspace subscription projection. The Relay Workspace remains the product and data boundary.

Convex stores the confirmed billing projection for each Workspace and resolves one set of Workspace entitlements from it. Every protected query, mutation, upload, invitation, and paid feature checks that resolver. Convex also owns Workspace storage usage, Relay roles, billable Editor counts, free Viewer access, Client Contacts, Client Hub publication, and safe downgrade behavior.

The future Team Plan includes three editing seats, including the Owner. Convex counts Owners, Editors, and pending Editor invitations against confirmed capacity. Viewers and Client Contacts do not consume editing seats. The billing model for extra Editors and storage add-ons must be designed for Clerk User Billing before those offers ship.

Clerk webhooks are asynchronous and may retry. Relay verifies every event and rejects events older than the latest confirmed state. Delivery-ID deduplication and Backend API reconciliation remain required before checkout opens. Convex never grants paid access from client input or a checkout redirect alone.

## User Stories

1. As a Workspace Owner, I want the Subscription Plan attached to my Workspace, so that every authorized user receives the correct access.
2. As a new Owner, I want Relay to link my Clerk user to a Free Workspace projection, so that my Workspace starts in a valid billing state.
3. As a Free Owner, I want unlimited Projects and Clients, so that I can assess Relay through real work.
4. As a Free Owner, I want standard Reviews, delivery, Client Portals, and External Video Embeds, so that I can complete a basic client workflow.
5. As a Free Owner, I want file uploads blocked on both the interface and server, so that the Free limit cannot be bypassed.
6. As a Free Owner, I want internal Team Member invitations blocked, so that Free remains a solo Workspace.
7. As a prospective Creator, I want to choose monthly or annual billing in Clerk checkout, so that I can choose my payment period.
8. As a prospective Creator, I want a seven-day trial, so that I can test paid capabilities before the first charge.
9. As a Creator Owner, I want 5 GB of Workspace storage, so that I can keep active project media in Relay.
10. As a Creator Owner, I want custom Workflow Templates, advanced reports, and Salary Plans, so that Relay supports my freelance business.
11. As a Creator Owner, I want custom Client Portal branding, so that client-facing work carries my identity.
12. As a Creator Owner, I want a Client Hub, so that each Client can find the Projects I published to them.
13. As a Client Contact, I want to sign in through Clerk without becoming a Team Member, so that I can use my Client Hub without consuming a seat.
14. As a Client Contact, I want to see only Projects published to my Client, so that other client work remains private.
15. As a Client Contact, I want project-specific review links to remain separate from the Client Hub, so that each access method keeps its purpose.
16. As a Team Owner, I want three editing seats including my own, so that a small team can start at the advertised base price.
17. As a Team Owner, I want Viewer access to remain free, so that stakeholders can follow work without consuming Editor Seats.
18. As a Team Owner, I want pending Editor invitations to reserve seats, so that accepted invitations cannot exceed purchased capacity.
19. As a Team Owner, I want to buy an extra Editor Seat, so that another Editor can join without changing plans.
20. As a Team Owner, I want each extra Editor Seat to add 2 GB, so that storage grows with the editing team.
21. As a Team Owner, I want 15 GB of shared base storage, so that Editors work from one Workspace quota.
22. As a Team Member, I want Project assignments, roles, payouts, and workload reports governed by the Team Plan, so that Team capabilities match the paid Workspace state.
23. As an Owner, I want to buy a 50 GB Storage Add-on, so that I can raise the quota without changing plans.
24. As an Owner, I want storage usage and quota shown together, so that I can act before uploads stop.
25. As a Team Member, I want existing files to remain available when the Workspace exceeds quota, so that a billing change does not remove work.
26. As a Team Member, I want new uploads blocked when the Workspace exceeds quota, so that usage cannot grow past the confirmed allowance.
27. As an Owner, I want archived files to count until deleted, so that the quota matches retained storage.
28. As an Owner, I want Relay never to delete files because of a downgrade or failed charge, so that billing cannot cause data loss.
29. As an Owner, I want failed payments and cancellations to move the Workspace to safe limits, so that access follows the confirmed Clerk state.
30. As an over-limit Owner, I want to remove files, Viewers, or Editors as appropriate, so that I can return to the new plan limit.
31. As an over-seat Team, I want current members preserved but new Editor invitations and promotions blocked, so that a downgrade does not remove people without consent.
32. As an Owner, I want ownership transfer to preserve Workspace billing, so that the Workspace does not lose its Subscription Plan.
33. As an Owner returning from Clerk checkout, I want a clear pending state, so that webhook delay does not look like a failed purchase.
34. As an operator, I want duplicate Clerk events to be harmless, so that webhook retries cannot duplicate subscriptions or quota.
35. As an operator, I want a reconciliation path against Clerk's Backend API, so that missed events can repair Convex billing state.
36. As an operator, I want Clerk and Convex plan identifiers mapped explicitly, so that a dashboard rename cannot silently change access.
37. As an operator, I want storage add-ons withheld until Convex and R2 costs are approved, so that Relay does not sell storage at a loss.
38. As a contributor, I want one Workspace entitlement resolver, so that features do not invent separate plan rules.
39. As a contributor, I want public Convex behavior tested under each plan and role, so that tests reflect what users can do.
40. As a product owner, I want Studio and all old prices removed before launch, so that the app and marketing site show one offer.

## Implementation Decisions

- A Workspace subscription projection links to its Owner's Clerk user. Relay currently supports one active owned Workspace per billing user.
- Clerk Billing owns Free and Creator plan configuration, monthly and annual prices, the Creator trial, checkout, renewals, payment state, and subscription management. Team remains hidden or non-purchasable until its User Billing model is approved.
- Use Clerk User plans with `PricingTable for="user"` and Clerk's `UserProfile` billing settings. Do not require Clerk Organizations for subscriptions or Relay membership.
- The Team Plan includes three editing seats, including the Owner. Owners and Editors consume editing seats. Pending Owner or Editor invitations reserve seats. Viewers and Client Contacts consume no editing seat.
- Relay membership stays in Convex. Clerk authenticates Owners, Editors, Viewers, and Client Contacts but does not require them to join a Clerk Organization.
- Convex stores the Clerk user ID, subscription identifiers, plan slug, billing period, subscription status, trial dates, confirmed Editor capacity, included Team seats, purchased extra Editor seats, Storage Add-on quantity, latest Clerk event time, and reconciliation state for each Workspace.
- Keep one server-side Workspace entitlement resolver. It returns plan capabilities, editing-seat allowance, storage quota, billing health, and reasons an operation is blocked.
- Public Convex functions derive the current Workspace and identity on the server. They never accept a caller-supplied plan, quota, billing status, or user identity as authority.
- Existing Relay data uses Clerk's full `tokenIdentifier` as its account key. Changing the production Clerk issuer requires a planned data migration before the issuer changes.
- Verify Clerk webhook signatures. Reject older subscription updates by Clerk event time. Add delivery-ID deduplication before enabling production checkout.
- Treat Clerk webhook state as eventually consistent. After checkout, show a pending state and reconcile through Clerk's Backend API when confirmed state does not arrive within a short bounded window.
- The Free Plan has no hosted upload quota. Creator has 5 GB. Team has 15 GB plus 2 GB per paid Editor Seat above the three included seats, plus 50 GB per active Storage Add-on.
- Convex owns an exact retained-byte counter per Workspace. Update it in the same mutation that commits or deletes stored file metadata. Do not calculate quota by scanning every Project during an upload.
- Reserve quota before issuing or completing an upload. Release reservations after completion, expiry, or failure so abandoned uploads cannot consume quota forever.
- Existing files stay readable when a Workspace exceeds its quota. Block new hosted uploads until usage returns below quota or confirmed capacity increases. Never delete files automatically.
- Use Relay's Convex roles as the authority for product permissions.
- A downgrade never removes Team Members or files. It blocks new Editor invitations, Viewer-to-Editor promotions, and uploads that exceed the new allowance.
- Client Contacts are separate from Team Members. Client Hub access requires Clerk authentication, an active Client Contact record, and explicit Project publication to that Client.
- The Client Portal stays token-based and Project-specific. Creator portal branding applies only to fields approved for public display and cannot weaken portal access rules.
- Plan checks belong at capability boundaries for uploads, Workflow Template changes, advanced reports, Salary Plans, Client Hub access, portal branding, Team membership, assignments, payouts, and workload reports.
- Configure the 50 GB Storage Add-on only after a cost review approves the public price. If the cost check fails, keep the add-on hidden without delaying Free, Creator, or base Team.
- Replace the old Studio slug, prices, onboarding copy, and claims. Keep a short compatibility window only if existing development subscriptions require it, then remove it.
- Preserve the existing capability-port direction. Route-facing code receives display-ready entitlement state and semantic actions instead of branching on Clerk or Convex details.
- Keep `NEXT_PUBLIC_BILLING_PURCHASES_ENABLED=false` until production Clerk Billing, its Stripe connection, the Clerk webhook endpoint, and `CLERK_WEBHOOK_SIGNING_SECRET` are configured and verified.

## Testing Decisions

- Test external behavior at the highest stable seam. Drive public Convex functions with mocked Clerk identities and confirmed Workspace subscription records.
- Use one shared entitlement test matrix across Free, Creator, Team, trialing, past-due, canceled, over-quota, and over-seat states.
- Test Owner, Editor, Viewer, Client Contact, and unrelated authenticated user behavior. Assert allowed results and denied operations, not private helper calls.
- Test verified webhook input through the public webhook route and Convex billing mutation boundary. Cover invalid signatures, duplicate delivery IDs, out-of-order events, retries, and unsupported events.
- Test checkout return behavior as pending until Convex confirms or reconciles the Clerk subscription.
- Test storage through upload reservation, completion, failed upload, expiry, deletion, downgrade, Editor Seat changes, and Storage Add-on changes.
- Include a positive Team upload case and assert that upload entitlement checks resolve the Team Clerk slug.
- Test membership through Owner creation, Editor invitation, pending invitation reservation, Viewer invitation, promotion, demotion, removal, extra-seat purchase, downgrade, and ownership transfer.
- Test Client Hub publication with two Clients and multiple Client Contacts. Prove that each contact sees only explicitly published Projects for their Client.
- Test feature gates through the real capability entry points for Workflow Templates, advanced reports, Salary Plans, portal branding, assignments, payouts, and workload reports.
- Reuse existing Convex test patterns for Team permissions, Project files, Salary Plans, portals, and Projects. Extend existing subscription entitlement and onboarding tests instead of creating a second plan test system.
- Use browser checks for Clerk pricing, trial messaging, billing status, upgrade prompts, quota display, and pending checkout confirmation. Avoid tests tied to Clerk component markup.
- Run type checking, relevant Convex tests, the application build, and focused browser verification for every ticket. Run the full repository verification before release.

## Out of Scope

- Invoices generated by Relay.
- Client payment collection through Relay.
- Priority support tiers.
- Unlimited storage or automatic storage overage billing.
- An Enterprise or fourth public plan.
- Negotiated Team bundle automation. Staff can handle custom bundles outside the public plan flow until there is measured demand.
- More storage pack sizes beyond the approved 50 GB pack.
- Charging Viewers or Client Contacts as paid seats.
- Replacing Clerk Billing with direct Stripe Billing. Clerk may use Stripe for payment processing, but Relay integrates with Clerk Billing.
- Production deployment, live subscription migration, live data migration, DNS changes, or R2 enablement without separate approval.
- Public launch before Relay name clearance and the storage cost gate are complete.

## Further Notes

- Relay uses Clerk User Billing to avoid a dependency on Clerk Organizations. Team seat charges cannot rely on Clerk's Organization membership count.
- Clerk automatically returns canceled or unpaid payers to its default Free Plan. Convex still needs safe over-limit behavior because Workspace data and membership may exceed Free limits.
- Convex is the enforcement source inside Relay. Clerk is the billing source. The stored Convex record is a verified projection of Clerk state, not an independent billing system.
- Cloudflare R2 remains disabled today. Base plan work may continue with the existing provider, but Team storage economics and public Storage Add-ons require a cost check before publication.
- The marketing site may launch Creator messaging first. Do not advertise Client Hub, custom portal branding, or paid storage until the corresponding tickets pass release checks.
- Relevant Clerk references: https://clerk.com/docs/guides/billing/for-users and https://clerk.com/docs/guides/development/webhooks/billing.
