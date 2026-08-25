# 11 — Publish a safe Client Portal

**What to build:** Let users preview and publish one mobile-ready Client Portal for one Project, choose what Clients can see, and control access with a long random token, optional PIN, expiry, closure, and token regeneration. Public reads must come from a server-built client-safe view. Commit this slice to the shared rebuild branch; do not open a separate pull request or deploy it.

**Blocked by:** 10 — Track Project Outputs and Media Versions.

**Status:** resolved

- [x] Users can preview, open, close, expire, protect, and regenerate a Project Portal and choose its public notes, dates, and Project Outputs.
- [x] The portal shows only the current shared Media Version and allowed Project data; it never returns internal notes, assignees, money, Salary Plans, private dates, unshared files, or old versions.
- [x] Closed, expired, invalid-token, and wrong-PIN requests receive clear access states without losing internal history.
- [x] The portal works on mobile from this release, uses Relay branding for free cloud users, and has focused public-contract and Convex authorization tests.

## Answer

Implemented a Relay-branded Project Portal with a server-built public view, selected current Outputs, preview, PIN and expiry controls, closure, and bearer-token regeneration without storing plaintext tokens.
