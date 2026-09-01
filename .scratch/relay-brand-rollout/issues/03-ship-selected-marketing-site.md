# 03: Ship the selected marketing site

**What to build:** Implement the product owner's selected static direction in the existing marketing package. Replace the current CutLab identity with Relay across the homepage, navigation, calls to action, metadata, favicon, social preview, and public copy. Keep the chosen layout intact across desktop and mobile. Use the production brand assets and the existing project toolchain.

**Blocked by:** Ticket 02.

**Status:** ready-for-agent

- [ ] The marketing homepage matches the selected direction's structure at desktop and mobile sizes.
- [ ] The site uses the approved Relay mark, horizontal lockup, palette, typography, and brand line.
- [x] Current user-facing marketing copy identifies the product as Relay and contains no active CutLab Studio or Frame Desk branding.
- [x] Navigation and the primary call to action work with a pointer and keyboard.
- [ ] Metadata, favicon references, manifest references, and the social preview resolve to real production brand assets.
- [ ] Focus states, accessible names, landmark order, text contrast, reduced-motion behavior, and 200 percent text resizing meet the parent spec.
- [ ] The site has no continuous paint-heavy animation and does not depend on animation to explain the identity.
- [x] Unknown external values such as a final public domain or email address are recorded as owner-supplied launch work instead of invented.
- [x] The marketing package passes its native typecheck and production build.
- [ ] Browser checks cover the homepage at desktop and mobile sizes and save evidence for the implemented result.
- [x] App workflows and production services remain unchanged.

## Verification, 2026-09-01

- Passed: `pnpm --dir website lint` and `pnpm --dir website build`.
- Passed at the desktop viewport: Relay copy, named controls, landmarks, working navigation targets, and production favicon and social-preview assets. Each checked asset returned HTTP 200.
- Existing responsive evidence is recorded in `website/design-qa.md`, but the current browser could not save a fresh mobile capture after resizing. Keep the browser-evidence item open.
- The approved brand line, `From first cut to final handoff.`, appears only in social-preview alt text. It is absent from the homepage copy.
- The homepage has no manifest reference.
- The implementation uses gradients, glow, glass effects, and continuously rendered `Noise`, `Threads`, `MagicRings`, and `LaserFlow` effects. This conflicts with the parent spec and keeps the motion item open. Reduced-motion guards exist, but they do not satisfy the ban on continuous paint-heavy animation for the default experience.
- Focus CSS, accessible names, landmark order, and reduced-motion rules are present. Contrast and 200 percent text resizing still need a recorded browser pass, so the full accessibility item remains open.
