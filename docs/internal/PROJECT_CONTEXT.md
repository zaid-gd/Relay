# CutLab Studio Project Context

## What This App Is

CutLab Studio is a video editing operations tracker for managing editing work from one workspace. It is built around the day-to-day needs of an editor or small editing studio: tracking projects, clients, due dates, reviews, deliverables, salary edits, files, templates, resources, reports, and team workflows.

The app is not meant to feel like a marketing site. It should feel like a premium production workspace: calm, fast, professional, and useful for repeated daily work.

## Core Product Areas

- Dashboard: high-level view of active work, deadlines, salary edit progress, collected money, and recent delivery activity.
- Projects: primary list of edit jobs with status, due date, amount, progress, notes, client, and actions.
- Clients: client-focused view that groups project history and client delivery context.
- Calendar: scheduling view for deadlines and project dates.
- Timeline: chronological delivery/progress view.
- Media: project files, deliverables, versions, and upload/review context.
- Feedback / Reviews: review queue and revision status tracking.
- Templates: reusable work templates for common editing jobs.
- Resources: saved links, folders, handoff assets, and reference material.
- Integrations: connected external tools/services.
- Reports: analytics, payout/salary batch progress, and production metrics.
- Team: collaboration and workspace member management.
- Settings: workspace, profile, preferences, theme, density, and configuration.
- Public/Profile views: editor-facing or public-facing profile/timeline surfaces.

## Current Tech Stack

- Next.js App Router
- React
- TypeScript
- Convex backend
- Clerk authentication
- Tailwind CSS 4
- shadcn/Radix-style UI primitives
- Lucide React icons
- Motion for restrained UI animation
- TanStack Table for richer tables
- Custom local month-grid calendar for delivery scheduling
- Recharts for analytics/report charts
- Sonner-style toast/action feedback patterns

Material UI still exists in parts of the older code, especially inside the large tracker app file. The direction is to continue phasing out MUI screen by screen, not to rip everything out blindly.

## Design Direction

The current desired design direction is a premium Apple/Linear-inspired workspace, not generic AI dashboard UI.

Design principles:

- Graphite dark mode without purple tint.
- Cool white / silver light mode.
- Electric blue or cyan accent, used with restraint.
- Dense but readable workspace layout.
- Minimal borders, hairline dividers, subtle depth.
- 6-8px radii, not overly rounded bubbly UI.
- Geist-like typography and careful spacing.
- Useful animation only: navigation, panel changes, drawers, hover/focus feedback.
- Long lists should scroll inside their panels, not stretch the whole page.
- Avoid duplicate stats, redundant shortcut cards, or filler sections.
- Preserve routes and workflows while improving visuals.

## Major Work Completed So Far

A large UI overhaul was implemented around a new Precision Workspace direction.

Recent additions/changes include:

- New workspace shell and sidebar structure.
- Grouped navigation sections for overview, work, operations, and workspace.
- New command/search bar pattern.
- New shadcn-style UI primitives under `src/components/ui/`.
- New precision screen modules under `src/components/`:
  - `precision-dashboard.tsx`
  - `precision-projects.tsx`
  - `precision-schedule.tsx`
  - `precision-media.tsx`
  - `precision-workspaces.tsx`
  - `workspace-shell.tsx`
- New global Tailwind/token styling in `src/app/globals.css`.
- Production UI/charts helpers in:
  - `src/app/production-ui.tsx`
  - `src/app/production-charts.tsx`
- README was rewritten to showcase the app rather than explain installation.
- Design QA screenshots and notes were added under `docs/design/qa-artifacts/` and `docs/design/qa.md`.
- QA scripts were added:
  - `scripts/capture-ui-qa.mjs`
  - `scripts/verify-ui-interactions.mjs`

## Recent Bug / Layout Fixes

The project and client list areas were updated so long lists scroll inside their own boxes instead of causing the full page to scroll forever.

Important files for that fix:

- `src/components/precision-projects.tsx`
- `src/components/precision-workspaces.tsx`

The intended behavior is:

- The project library panel owns its own scrolling.
- The client directory owns its own scrolling.
- The selected client project history owns its own scrolling.
- The workspace shell should remain stable while list content moves inside panels.

## Current Branch And PR

Current branch:

`codex/Bug-fixes`

Draft PR:

https://github.com/zaid-gd/Cutlab-Studio/pull/10

Recent commit:

`f3eeb28 Overhaul precision workspace UI`

## Validation Recently Run

The following checks passed after the latest layout fix:

- `npm run lint`
- `npm run build`
- `node scripts/capture-ui-qa.mjs projects-light-desktop`

## Known Local Environment Note

The repo moved from the old Windows user path to the Administrator profile.

Current repo path:

`C:\Users\Administrator\Documents\Github\Work Tracker`

Old path that no longer exists:

`C:\Users\Screen\Documents\Github\Work Tracker`

If Codex shows “Current working directory missing,” reopen or switch the workspace to the Administrator path.

## Local Junk Files

These local log files were intentionally not committed and can be deleted or ignored:

- `.codex-dev.err.log`
- `.codex-dev.log`
- `.plan-preview.stderr.log`
- `.plan-preview.stdout.log`
- `.ui-interactions.stderr.log`
- `.ui-interactions.stdout.log`
- `.ui-preview.stderr.log`
- `.ui-preview.stdout.log`

## Convex / Backend Warning

This project uses Convex.

Before editing Convex code, read:

`convex/_generated/ai/guidelines.md`

This is required by `AGENTS.md` and should be followed over generic Convex assumptions.

Be careful with schema changes, persisted records, auth, permissions, portals, and migrations. Do not casually rename statuses or change persisted values without compatibility handling.

## What To Focus On Next

Future work is mostly small polish and bug fixing on top of the new UI.

Likely areas to check:

- Remaining layout glitches across desktop/tablet/mobile.
- Any pages where panels still stretch the full page instead of scrolling internally.
- Dark mode contrast and theme consistency.
- Calendar behavior and visual quality.
- Dashboard duplicate stats or redundant sections.
- Removing unnecessary shortcut cards or filler blocks.
- Ensuring buttons, menus, filters, dialogs, and sheets are wired correctly.
- Checking that Clerk auth and Convex sync still work after UI changes.
- Making sure project CRUD, filters, inspectors, client views, reports, settings, and integrations still behave correctly.
- Continuing to migrate away from old MUI screens only when their replacement screen is ready.

## Development Style Preferences

Keep changes focused and practical.

- Do not redesign unrelated screens while fixing a small bug.
- Do not remove existing workflows or routes.
- Do not break persisted local/Convex data.
- Prefer existing project patterns and shared UI components.
- Add polish where it helps usability: spacing, hierarchy, motion, focus states, empty states, and responsive behavior.
- Validate with `npm run lint` and `npm run build` for meaningful UI changes.
- Use browser/QA screenshots when fixing visual layout issues.
