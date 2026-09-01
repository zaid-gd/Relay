# Third-Party Integration Review

This review records which external providers are trusted enough to model in Relay and what must be true before any live OAuth, API synchronization, webhook delivery, accounting sync, or payment collection is implemented.

Current implementation status: Relay only stores provider-neutral links, provider IDs, local invoice draft CSVs, and Convex/Clerk-backed app data. It does not exchange OAuth tokens with Google Drive, Dropbox, Slack, or Frame.io, does not send Slack messages, does not sync provider files through external APIs, and does not collect payments.

## Approval Standard

A provider can move from modeled-only to live integration only when all of these are true:

- The provider has an official security or trust center with current security, privacy, compliance, and availability material.
- OAuth scopes or API permissions are documented and can be limited to the smallest practical access.
- Secrets, refresh tokens, signing secrets, and API keys have a server-side storage and rotation plan.
- Webhooks, if used, have signature verification, replay protection, idempotency, and bounded retries.
- User-facing copy clearly identifies what data leaves Relay and which provider receives it.
- Tests cover authorization, token absence, token revocation, provider failure, webhook verification, and local fallback behavior.

## Reviewed Providers

| Provider                    | Current Relay Scope                           | Trust Evidence                                                                                                                                                                                 | Live Integration Decision                                                                                                                                                                          |
| --------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Drive / Google Cloud | Modeled links and provider file IDs.          | Google Cloud publishes a compliance resource center with certifications, attestations, audit reports, and compliance mappings.                                                                 | Acceptable candidate for future OAuth/API sync after scope, token storage, and failure-mode design.                                                                                                |
| Dropbox                     | Modeled links and provider file IDs.          | Dropbox publishes security, encryption, sharing controls, vulnerability testing, GDPR/HIPAA support, and SOC report material.                                                                  | Acceptable candidate for future OAuth/API sync after scope, token storage, and provider-limit handling.                                                                                            |
| Slack                       | Modeled workspace/channel/message links only. | Slack publishes a Trust Center covering security, privacy, compliance, data management, data requests, and status resources.                                                                   | Acceptable candidate for future notifications only after webhook signing/secrets, workspace consent, and retry design.                                                                             |
| Frame.io / Adobe            | Modeled links and provider asset IDs.         | Adobe publishes a Trust Center covering security, privacy, availability, compliance resources, product status, and independent audits.                                                         | Acceptable candidate for future review-asset/comment sync after Adobe/Frame.io OAuth scope review.                                                                                                 |
| Convex                      | Live backend sync.                            | Convex documents encryption at rest/in transit, isolated customer databases, MFA controls, vulnerability scanning, penetration tests, SOC 2 Type II, HIPAA, and GDPR posture.                  | Already live; continue using server-side identity and bounded query rules from Convex guidelines.                                                                                                  |
| Clerk                       | Live authentication.                          | Clerk is already the configured auth provider for this app; live usage remains limited to authentication identity passed into Convex.                                                          | Already live; any auth expansion still needs server-derived identity and no client-provided user ID trust.                                                                                         |
| Stripe                      | Future payment candidate only.                | Stripe documents PCI Service Provider Level 1 certification, SOC 1/SOC 2 Type II reports, SOC 3, TLS, API key controls, webhook verification guidance, and payment-specific security controls. | Preferred candidate for future payment collection, but not implemented until secrets, Checkout/Payment Links choice, webhook verification, reconciliation, and accounting boundaries are designed. |

## Non-Goals For This Patch

- No OAuth consent screens.
- No stored external access or refresh tokens.
- No Slack webhook dispatch.
- No Drive, Dropbox, or Frame.io API reads or writes.
- No Stripe checkout, invoice payment, or accounting sync.

## Source URLs Reviewed

- Google Cloud compliance: https://cloud.google.com/compliance
- Dropbox security: https://www.dropbox.com/features/security
- Slack Trust Center: https://slack.com/trust
- Adobe Trust Center: https://www.adobe.com/trust.html
- Convex security: https://www.convex.dev/security
- Stripe security: https://docs.stripe.com/security
