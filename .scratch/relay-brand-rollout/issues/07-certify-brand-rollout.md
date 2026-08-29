# 07: Certify the brand rollout

**What to build:** Run the full local release check for the Relay brand rollout and record the evidence. Verify the asset contract, marketing package, app package, public pages, responsive layouts, accessibility basics, and the final legacy-name scan. Fix only rollout defects found by these checks. Do not deploy or change production.

**Blocked by:** Ticket 06.

**Status:** ready-for-agent

- [ ] The asset verifier passes for vector validity, view box, raster dimensions, required outputs, and loadable files.
- [ ] The circular mark remains distinct at 16 pixels and renders correctly in black-on-white and white-on-black contexts.
- [ ] Every favicon, icon, manifest, metadata image, and social-preview reference resolves to a real file.
- [ ] The marketing package passes its native typecheck and production build.
- [ ] The app package passes its native typecheck and production build.
- [ ] Browser evidence covers the marketing homepage, App Shell, authentication, Client Portal, Public Profile, legal, contact, accessibility, error, and not-found pages where they exist.
- [ ] Marketing checks cover representative desktop and mobile sizes, keyboard focus, accessible names, landmark order, contrast, reduced motion, and 200 percent text resizing.
- [ ] The final source scan contains no active legacy product branding outside the documented history and compatibility allowlist.
- [ ] Existing product regression checks remain green, including the current source-contract and browser-smoke checks.
- [ ] Failed checks stay visible and prevent certification until fixed or accepted by the product owner.
- [ ] The verification record lists commands, browser viewports, evidence, approved exceptions, and any owner-supplied launch work that remains.
- [ ] No production deployment, DNS change, live-database access, or daily preview-channel change occurs.
