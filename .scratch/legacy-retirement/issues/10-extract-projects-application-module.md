# Extract the Projects application module

Status: blocked
Blocked by: 01 Remove confirmed dead residue

## Work

- Use Projects as the tracer capability from ADR 0001.
- Move Project domain rules, persistence operations, permissions, controller state, full-page workspace, and Project dialogs behind the Projects capability interface.
- Reuse the existing local, sample, Convex, and in-memory adapter pattern. Do not add a generic registry or one large Workspace interface.
- Leave routes responsible only for composition and route parameters.

## Done when

- Project screens import no generated Convex functions and receive no generic state setters.
- Local, sample, and cloud Project behavior pass the same application checks.
- Project routes and every Project-opening caller use the extracted module.
- The moved implementation and its old definitions do not coexist in `tracker-app.tsx`.
