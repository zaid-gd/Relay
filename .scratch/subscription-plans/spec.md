# Relay Workspace subscription plans

Status: ready-for-agent
Date: 2026-08-31

## Problem Statement

Relay has approved Free, Creator, and Team offers, but the current product cannot enforce them as written. Clerk currently bills the signed-in user, while Relay defines a Subscription Plan as a Workspace property. Convex checks only whether the current user can upload and gives Creator and Studio the same fixed 200 MB limit. Team membership has one hard three-person cap that counts Owners, Editors, Viewers, and pending invitations alike. Most proposed paid capabilities have no server-side plan checks. Client Contacts and the Client Hub do not exist yet.

This leaves the marketing promise ahead of the product. A Team Owner could pay while Editors remain unable to upload, free users can reach paid features, Viewers consume the same capacity as Editors, and storage cannot match the advertised quota or add-ons. Cancellation, failed payments, over-quota downgrades, ownership transfer, event retries, and stale billing state also lack defined behavior.

## Solution

Make each Relay Workspace map one-to-one to a Clerk Organization and use Clerk Billing for the Free, Creator, and Team subscriptions. Clerk owns checkout, monthly and annual prices, the Creator trial, recurring charges, billing status, customer-facing plan management, and verified billing events. The Clerk Organization is the payer. The current Workspace remains Relay's product and data boundary.

Convex stores the confirmed billing projection for each Workspace and resolves one set of Workspace entitlements from it. Every protected query, mutation, upload, invitation, and paid feature checks that resolver. Convex also owns Workspace storage usage, Relay roles, billable Editor counts, free Viewer access, Client Contacts, Client Hub publication, and safe downgrade behavior.

The Team Plan includes three billable editing seats, including the Owner. Owners and Editors occupy the Clerk Organization membership used for seat billing. Viewers and Client Contacts authenticate with Clerk but remain Convex memberships outside the billable Clerk Organization member count. Pending Editor invitations reserve a seat. Extra Editor seats cost $5 monthly or $50 annually and add 2 GB each. A 50 GB Storage Add-on costs $5 monthly or $50 annually.

Clerk webhooks are asynchronous and may retry. Relay verifies every event, deduplicates it by delivery ID, records the latest confirmed state in Convex, and acknowledges only successful processing. Checkout returns to a pending subscription screen until Convex receives or reconciles the new Clerk state. Convex never grants paid access from client input alone.

## User Stories

1. As a Workspace Owner, I want the Subscription Plan attached to my Workspace, so that every authorized user receives the correct access.
2. As a new Owner, I want Relay to create the matching Clerk Organization and Free subscription, so that my Workspace starts in a valid billing state.
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

- A Relay Workspace maps one-to-one to a Clerk Organization. Clerk Organizations exist here as billing payers and billable editing membership, while the Relay Workspace remains the product boundary in Convex.
- Clerk Billing owns Free, Creator, and Team plan configuration, monthly and annual prices, the seven-day Creator trial, checkout, renewals, payment state, and subscription management.
- Use Clerk Organization plans and an organization pricing table in `subscription-plans.tsx`. Replace user-scoped `PricingTable` usage with Organization plans and pricing so subscriptions belong to the active Workspace organization, and add an organization-scoped checkout test. Do not keep user-level subscriptions for the new offers.
- The Team Plan includes three editing seats, including the Owner. Owners and Editors consume editing seats. Pending Owner or Editor invitations reserve seats. Viewers and Client Contacts consume no editing seat.
- Owners and Editors mirror to Clerk Organization membership so Clerk can handle seat-based Team billing. Viewers and Client Contacts remain authenticated Clerk users with Convex access records, but they do not join the billable Clerk Organization membership.
- Convex stores the Clerk Organization identifier, Clerk subscription identifiers, plan slug, billing period, subscription status, trial dates, total billable Owner/Editor member quantity, included Team seat quantity, purchased extra Editor seat quantity, Storage Add-on quantity, last Clerk event time, and reconciliation state for each Workspace. Confirmed Editor quantity means total billable Owner and Editor members; derive included seats and purchased extra seats separately so reconciliation and entitlement tests assert the exact seat conversion used by billing and storage calculations.
- Keep one server-side Workspace entitlement resolver. It returns plan capabilities, editing-seat allowance, storage quota, billing health, and reasons an operation is blocked.
- Public Convex functions derive the current Workspace and identity on the server. They never accept a caller-supplied plan, quota, billing status, or user identity as authority.
- Verify Clerk webhook signatures. Deduplicate deliveries by the Clerk or Svix delivery identifier. Process billing updates through idempotent Convex mutations.
- Treat Clerk webhook state as eventually consistent. After checkout, show a pending state and reconcile through Clerk's Backend API when confirmed state does not arrive within a short bounded window.
- The Free Plan has no hosted upload quota. Creator has 5 GB. Team has 15 GB plus 2 GB per paid Editor Seat above the three included seats, plus 50 GB per active Storage Add-on.
- Convex owns an exact retained-byte counter per Workspace. Update it in the same mutation that commits or deletes stored file metadata. Do not calculate quota by scanning every Project during an upload.
- Reserve quota before issuing or completing an upload. Release reservations after completion, expiry, or failure so abandoned uploads cannot consume quota forever.
- Existing files stay readable when a Workspace exceeds its quota. Block new hosted uploads until usage returns below quota or confirmed capacity increases. Never delete files automatically.
- Use Relay's roles as the authority for product permissions. Clerk Organization membership proves billable Owner and Editor membership but does not replace Convex authorization checks.
- A downgrade never removes Team Members or files. It blocks new Editor invitations, Viewer-to-Editor promotions, and uploads that exceed the new allowance.
- Client Contacts are separate from Team Members. Client Hub access requires Clerk authentication, an active Client Contact record, and explicit Project publication to that Client.
- The Client Portal stays token-based and Project-specific. Creator portal branding applies only to fields approved for public display and cannot weaken portal access rules.
- Plan checks belong at capability boundaries for uploads, Workflow Template changes, advanced reports, Salary Plans, Client Hub access, portal branding, Team membership, assignments, payouts, and workload reports.
- Configure the 50 GB Storage Add-on only after a cost review approves the public price. If the cost check fails, keep the add-on hidden without delaying Free, Creator, or base Team.
- Replace the old Studio slug, prices, onboarding copy, and claims. Keep a short compatibility window only if existing development subscriptions require it, then remove it.
- Preserve the existing capability-port direction. Route-facing code receives display-ready entitlement state and semantic actions instead of branching on Clerk or Convex details.
- Do not deploy, alter production Clerk plans, touch live Convex data, or enable R2 as part of ticket implementation without separate approval.

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
- Turning Viewers or Client Contacts into billable Clerk Organization members.
- Replacing Clerk Billing with direct Stripe Billing. Clerk may use Stripe for payment processing, but Relay integrates with Clerk Billing.
- Production deployment, live subscription migration, live data migration, DNS changes, or R2 enablement without separate approval.
- Public launch before Relay name clearance and the storage cost gate are complete.

## Further Notes

- Clerk supports Organization plans, organization pricing tables, trials, billing webhooks, Backend API subscription reads, and seat-based plans. Billing features change often, so implementation must pin and verify behavior against the installed Clerk SDK.
- Clerk's native seat count follows Organization membership. Keeping free Viewers and Client Contacts outside billable Clerk Organization membership prevents them from raising the paid Editor quantity.
- Clerk automatically returns canceled or unpaid payers to its default Free Plan. Convex still needs safe over-limit behavior because Workspace data and membership may exceed Free limits.
- Convex is the enforcement source inside Relay. Clerk is the billing source. The stored Convex record is a verified projection of Clerk state, not an independent billing system.
- Cloudflare R2 remains disabled today. Base plan work may continue with the existing provider, but Team storage economics and public Storage Add-ons require a cost check before publication.
- The marketing site may launch Creator messaging first. Do not advertise Client Hub, custom portal branding, or paid storage until the corresponding tickets pass release checks.
- Relevant Clerk references: https://clerk.com/docs/guides/billing/for-b2b, https://clerk.com/docs/guides/billing/seat-based-plans, https://clerk.com/docs/guides/development/webhooks/billing, and https://clerk.com/docs/reference/backend/billing/get-organization-billing-subscription.
