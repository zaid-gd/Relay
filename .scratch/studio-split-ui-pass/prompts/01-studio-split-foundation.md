# Kick off ticket 01

Implement `.scratch/studio-split-ui-pass/issues/01-studio-split-foundation.md` on the current shared branch.

## Read first

Read these sources completely before editing:

1. `AGENTS.md`, `CLAUDE.md`, and `CONTEXT.md`.
2. `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, and `docs/agents/triage-labels.md`.
3. `docs/adr/0001-redesign-relay-before-final-publishing.md` and `docs/adr/0002-use-a-dark-first-monochrome-interface.md`.
4. `.scratch/studio-split-ui-pass/spec.md` and the full Ticket 01 file.
5. `docs/design/relay-visual-direction.md`, `docs/design/DESIGN_SYSTEM.md`, and the relevant system contracts.
6. The approved Studio Split Variant B prototype and its styles under the development-only Relay UI prototype route.
7. The relevant Next.js 16 guides under `node_modules/next/dist/docs/` before changing Next.js code.

## Authority

The approved Studio Split prototype is the visual source. Rebuild its decisions as production React components. The current production UI is behavior references only, also ignore the resolved `unified-frontend-redesign` draft. Do not borrow their teal accent, bordered card system, typography, centered app frame, or other discarded visual choices. The sidebar already represented in Studio Split is the approved sidebar.

Ticket 19 commit `8691405` is the behavior baseline. Preserve every existing route, controller, permission, Local Workspace, sample, cloud, backup, creation, Project, Review, money, Team, file, and Client Portal behavior.

Ticket 01 owns the semantic token contract, shared UI controls, Page System components, their focused tests, and the design contract needed to describe them. It does not own the App Shell, navigation, route components, Dashboard, or any other feature screen. Those migrations start in Ticket 02.

## Workflow

1. Record the current `HEAD` and inspect the dirty worktree. Treat every unrelated change as user-owned. Do not clean, reset, move, or stage unrelated files.
2. Change Ticket 01 status from `ready-for-agent` to `claimed`.
3. Use the `implement` flow with TDD at the approved shared UI and Page System component seam.
4. Work one red-green tracer at a time. Test external theme, density, focus, selection, and reduced-motion behavior rather than private CSS structure.
5. Add the Studio Split contract beside the current presentation. Ticket 01 must not migrate production routes or remove the old contract.
6. Keep the code typed. Avoid `any`, casting wrappers, speculative options, and runtime Svelte dependencies.
7. Use semantic tokens and React components. Port only the selected interaction ideas needed by the ticket.
8. If Convex code becomes necessary, read `convex/_generated/ai/guidelines.md` first. Ticket 01 should normally avoid Convex.
9. Delegate only bounded read-only audits to GPT-5.6 Luna or deepseek v4 flash free on opencode at medium or high reasoning. State file ownership before any delegated edit.
10. Run the focused component test after each tracer. Run typecheck and the production build before review.
11. Review the finished diff against both repo standards and the Studio Split spec. Fix every release-blocking finding.
12. Mark Ticket 01 `resolved`, add a concise `## Answer`, and commit only Ticket 01 files plus the production and test files it owns.

## Completion check

Stop only when every Ticket 01 acceptance criterion is checked, focused tests pass, typecheck passes, the production build passes, unrelated worktree changes remain untouched, and no production deployment or PR merge has occurred. Report the commit, changed files, tests, and any remaining non-blocking risk.
