# Remove CutLab and FrameDesk compatibility names

Status: ready
Blocked by: none

## Work

- Replace the active FrameDesk lockup with Relay branding.
- Rename or inline the `cutlab` design token object.
- Remove the legacy `sx` compatibility property once its callers are gone.
- Keep old local-storage keys only where changing them would strand user data. Document those keys as persisted compatibility identifiers.

## Done when

- User-visible UI and active source use Relay naming.
- A source scan finds no active CutLab or FrameDesk product name outside documented persisted keys or history.
- Branding and workspace browser checks pass.
