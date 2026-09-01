# 06: Retire active legacy branding

**What to build:** Remove the remaining active CutLab, CutLab Studio, FrameDesk, and Frame Desk identity after Relay replacements exist. Cover current user-facing copy, metadata, assets, source names, scripts, and guidance that contributors use now. Keep historical records and compatibility identifiers that protect persisted data. Coordinate this work with the existing legacy-retirement naming ticket so the two efforts do not repeat the same cleanup.

**Blocked by:** Tickets 03 and 05.

**Status:** complete

- [x] A repository scan finds no active user-facing CutLab, CutLab Studio, FrameDesk, or Frame Desk product branding.
- [x] Active source names, comments, scripts, metadata, and current guidance use Relay where renaming is safe.
- [x] Obsolete logo, favicon, icon, and marketing assets are removed only after all active references use their Relay replacements.
- [x] Persisted local-storage keys and other compatibility identifiers remain where a rename would strand existing data.
- [x] Historical specs, screenshots, completed decisions, migrations, and data records remain intact as history.
- [x] Every allowed legacy-name match has a short recorded reason tied to history or compatibility.
- [x] Unknown external replacement values remain explicit owner-supplied launch work and are not fabricated.
- [x] The overlap with the existing legacy-retirement naming work is recorded so broad compatibility cleanup is not implemented twice.
- [x] The marketing and app packages pass their native typechecks and production builds after cleanup.
- [x] Relevant browser checks confirm that active public pages and shared app pages display Relay.

## Allowed legacy-name matches

- `cutlab-studio:*` local-storage keys remain to preserve existing browser data.
- `CUTLAB_*` QA environment aliases remain so existing local automation commands do not break; `RELAY_*` is now primary.
- `cutlab-e2e+clerk_test@example.com` remains the existing Clerk development test identity.
- `CONTEXT.md` and `scripts/verify-relay-rebuild.mjs` contain legacy names only as forbidden-name guidance and scanner literals.
- README history, research, audits, refactor records, completed rollout records, screenshots, and `.scratch` specifications remain historical evidence.

The cleanup fulfills the active brand portion of the older naming-retirement work. It does not rename persisted identifiers a second time.
