# 07: Certify the brand rollout

**What to build:** Run the full local release check for the Relay brand rollout and record the evidence. Verify the asset contract, marketing package, app package, public pages, responsive layouts, accessibility basics, and the final legacy-name scan. Fix only rollout defects found by these checks. Do not deploy or change production.

**Blocked by:** Ticket 06.

**Status:** complete

- [x] The asset verifier passes for vector validity, view box, raster dimensions, required outputs, and loadable files.
- [x] The circular mark remains distinct at 16 pixels and renders correctly in black-on-white and white-on-black contexts.
- [x] Every favicon, icon, manifest, metadata image, and social-preview reference resolves to a real file.
- [x] The marketing package passes its native typecheck and production build.
- [x] The app package passes its native typecheck and production build.
- [x] Browser evidence covers the marketing homepage, App Shell, authentication, Client Portal, Public Profile, legal, contact, accessibility, error, and not-found pages where they exist.
- [x] Marketing checks cover representative desktop and mobile sizes, keyboard focus, accessible names, landmark order, contrast, reduced motion, and 200 percent text resizing.
- [x] The final source scan contains no active legacy product branding outside the documented history and compatibility allowlist.
- [x] Existing product regression checks remain green, including the current source-contract and browser-smoke checks.
- [x] Failed checks stay visible and prevent certification until fixed or accepted by the product owner.
- [x] The verification record lists commands, browser viewports, evidence, approved exceptions, and any owner-supplied launch work that remains.
- [x] No production deployment, DNS change, live-database access, or daily preview-channel change occurs.

## Verification record

- Passed: `pnpm verify:brand-assets`, `pnpm verify:relay`, `pnpm lint`, `pnpm build`, `pnpm verify:browser`, `pnpm verify:light-logo`, and `pnpm verify:light-highlights` (17.72:1).
- Passed in `website`: `pnpm lint` and `pnpm build`.
- Browser viewports: 1440x1000 and 390x844. Public checks covered responsive overflow, keyboard focus, reduced motion, and 200 percent root text sizing. Route smoke covered 26 app routes.
- Evidence: `.scratch/relay-brand-rollout/evidence/01-relay-mark-16px-light-dark.png`.
- Environment exception: Firefox headless PNG capture was unavailable; Chromium checks passed.
- Corrected stale test identities to include Clerk's stable `subject`. `pnpm test:team` passes 4 tests and `pnpm test:files` passes 25 tests.
- Replaced the obsolete exact-source Team scanner with Team behavior tests plus the issuer-change identity regression. `pnpm verify:team` passes 5 tests.
- Temporary support email supplied by the owner: `zns.stuioss@gmail.com`. Final domain, company, and social-account values remain owner launch work.
- No production, DNS, live Convex data, or preview channel was touched.
