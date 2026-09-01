# 05: Apply Relay to public and client-facing app pages

**What to build:** Apply the shared Relay identity to the Client Portal, Public Profile, legal, contact, accessibility, support, and other public app pages. Keep the mark restrained on client work pages so the editor's content stays primary. Replace active product naming and known contact details without changing routes, permissions, review flows, delivery flows, or page purpose.

**Blocked by:** Ticket 04.

**Status:** complete

- [x] Client Portal pages use the shared Relay identity without competing with project content.
- [x] Public Profile pages use the approved Relay mark, name, typography, and neutral palette.
- [x] Legal, contact, accessibility, and support pages use consistent Relay naming and known contact details.
- [x] Other public app entry pages use the same shared brand path instead of local logo copies.
- [x] Unknown domains, email addresses, company details, or social accounts are recorded as owner-supplied launch work instead of invented.
- [x] Existing routes, permissions, portal access, review actions, delivery actions, and public-profile behavior remain unchanged.
- [x] Browser checks cover the Client Portal, Public Profile, legal, contact, accessibility, error, and not-found identity at representative desktop and mobile sizes.
- [x] Changed pages keep working with keyboard navigation, visible focus, accessible names, adequate contrast, reduced motion, and 200 percent text resizing.
- [x] No Convex schema, authorization, storage, billing, or data migration changes.
- [x] The app passes its native typecheck, production build, and relevant browser checks.

## Verification

- `pnpm lint`, `pnpm build`, and `pnpm verify:browser` passed.
- Public-page browser checks ran at 1440x1000 and 390x844 with reduced motion, keyboard focus, and 200 percent root text sizing.
- Temporary support email supplied by the owner: `zns.stuioss@gmail.com`. Final domain, company details, and social accounts remain owner launch work.
