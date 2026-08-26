# Extract the remaining route modules

Status: blocked
Blocked by: 10 Extract the Projects application module

## Work

Move one capability at a time out of `tracker-app.tsx`: Settings, Resources, Salary Plans and Batches, Team, Integrations, Profiles, Client Portals, and shared onboarding composition.

For each capability:

- define the smallest useful controller interface;
- move the existing implementation rather than rewriting it;
- keep presentation free of persistence and authorization decisions;
- run its focused checks;
- delete the old implementation before starting the next capability.

## Done when

- `tracker-app.tsx` contains shared composition only.
- Route behavior remains unchanged.
- No temporary adapter or duplicate implementation remains.
- Dependency checks enforce the seams described in ADR 0001.
