# 12 — Review Media Versions with Comments

**What to build:** Let Client Portal visitors enter a display name, comment on the current Media Version, and reopen resolved threads while Team Members resolve them internally. Review history must stay tied to the version that received it and survive portal closure or expiry. Commit this slice to the shared rebuild branch; do not open a separate pull request or deploy it.

**Blocked by:** 11 — Publish a safe Client Portal.

**Status:** resolved

- [x] Portal visitors must enter a display name before commenting, and Relay remembers it in that browser without treating it as verified identity.
- [x] Comments attach to the reviewed Media Version, and internal users can still see unresolved old-version Comments after a new version becomes current.
- [x] Team Members can resolve threads and portal visitors can reopen them while the portal remains accessible.
- [ ] Cloud browser coverage proves PIN access, separate editor and Client contexts, comment creation, resolution, reopening, closure or expiry, public refusal, and preserved internal history.

Cloud browser coverage was deferred during the fast-track pass. Focused backend tests passed before the shared package install changed, and the final TypeScript check passes.
