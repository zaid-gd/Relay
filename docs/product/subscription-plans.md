# Relay subscription plans

Status: proposed launch model for review

Relay has three public plans. A Workspace owns one Subscription Plan. Clients and Client Contacts do not consume internal seats.

## Plan summary

| Plan    | Monthly | Annual | Trial  | Storage                 | Internal Editors   |
| ------- | ------: | -----: | ------ | ----------------------- | ------------------ |
| Free    |      $0 |     $0 | None   | No Relay-hosted uploads | 1 Workspace owner  |
| Creator |      $9 |    $90 | 7 days | 5 GB                    | 1 Workspace owner  |
| Team    |     $24 |   $240 | None   | 15 GB shared            | 3 included Editors |

Annual pricing gives two months free. Team customers can contact Relay for discounted bundles. A bundle is a negotiated Team price, not a fourth public plan.

## Free

Free is for trying Relay and managing basic solo work.

Included:

- Unlimited Projects
- Clients
- Basic workflow tracking
- Basic Reviews and delivery
- Standard project-specific Client Portals
- External Video Embeds

Limits:

- No Relay-hosted file uploads
- No Relay storage quota
- No internal Team Members

External Video Embeds let users reference video hosted on Vimeo, YouTube, Frame.io, or another external service without using Relay storage.

## Creator

Creator is for one freelance editor managing stored project media and client relationships.

Includes everything in Free, plus:

- Relay-hosted file uploads
- 5 GB Storage Quota
- Client Hub
- Custom portal branding
- Custom Workflow Templates
- Advanced reports
- Retainers, using Relay's existing Salary Plan model
- 7-day trial

Creator supports one internal Workspace owner. Client Contacts remain free and do not become Team Members.

## Team

Team is for a small editing team working in one shared Workspace.

Includes everything in Creator, plus:

- 3 included paid Editor seats, including the Workspace owner
- 15 GB shared Storage Quota
- Team Workspace access
- Team roles
- Project assignments
- Team payouts
- Workload reports
- Free internal Viewer access

Each extra paid Editor costs $5/month or $50/year and adds 2 GB to the shared Storage Quota.

Examples:

- 3 included paid Editors, including the owner: 15 GB shared
- 4 paid Editors, including the owner: 17 GB shared
- 5 paid Editors, including the owner: 19 GB shared

## Storage add-ons

Storage add-ons increase the Workspace's shared Storage Quota.

| Add-on | Monthly | Annual |
| ------ | ------: | -----: |
| 50 GB  |      $5 |    $50 |

Additional storage packs can be added after Relay measures real Convex and Cloudflare R2 usage. A larger custom storage bundle can be included in a negotiated Team bundle.

## Access rules

### Team Members

- Owners and Editors are internal Workspace users.
- Included and added Editors consume paid Editor seats.
- Viewers do not consume paid seats.

### Clients

- A Client is separate from Workspace membership.
- A Client can have multiple Client Contacts.
- Client Contacts do not consume paid seats.
- Client Contacts can sign in to the Client Hub.
- The Client Hub shows only Projects explicitly published to that Client.
- The Client Portal remains a project-specific review and delivery page.

## Storage behavior

When a Workspace reaches its Storage Quota:

1. Relay blocks new file uploads.
2. Existing files remain available.
3. Relay shows storage usage and an upgrade notice.
4. Users can delete old archived files, add a Storage Add-on, or use External Video Embeds for future media.
5. Relay never deletes files automatically.

Removing an Editor does not immediately remove storage from the Workspace. If the Workspace remains over quota, new uploads stay blocked until the user removes files or adds storage.

## Out of launch scope

These items are not included in the current launch promise:

- Relay-generated invoices and client payment collection
- Priority support tiers
- Unlimited storage
- Automatic storage overage billing
- A fourth Enterprise plan

## Review points

- Confirm whether the Workspace owner counts as one of the 3 included Team Editor seats.
- Confirm that $5 extra Editor pricing includes only the seat and 2 GB quota increase, not extra storage packs.
- Confirm that annual storage add-ons receive the same two-month discount.
- Confirm Convex and Cloudflare R2 cost assumptions before publishing Team storage add-ons.
- Rename the old `Studio` plan to `Team` in the billing configuration when implementation begins.
