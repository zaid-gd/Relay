# Current frontend audit

**Scope:** Frame Desk App Router frontend, shared UI, workspace screens, public and support routes.
**Date:** 2026-08-11
**Method:** Read-only review of the repository, local design references, existing QA notes and captured screenshots. No internet research was used for this audit.

## Executive summary

Frame Desk already has a strong workspace base. The shell, grouped navigation, command search, local and cloud data modes, reduced-motion handling, responsive project inspector, and the `workspace-page` layout module give the redesign a good starting point. The local reference boards define a clear dark-first CutLab language: graphite surfaces, teal/cyan actions, Space Grotesk headings, Inter body copy, 4/8px spacing and compact production tables.

The main risk is not missing UI primitives. It is split ownership. `tracker-app.tsx` is a very large route/controller module with older styling and MUI compatibility code, while newer Precision screens use shared shadcn-style primitives. The result is likely visual drift between the main work screens and administration, profile, resources, templates, integrations, team and chat. The redesign should keep the current routes and data flows, then move screen families onto a small set of shared layout and state seams.

## Route and feature inventory

### Authenticated workspace routes

All of these routes except profile currently enter `TrackerApp`, which supplies data, permissions, dialogs, notifications and `WorkspaceShell`.

| Route            | Screen / preserved capabilities                                                                                                                 | Current implementation                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `/`              | Dashboard: operational stats, filters, due and review queues, activity, active projects, salary progress, project inspector, create/edit/delete | `PrecisionDashboard`                       |
| `/projects`      | Personal/team project lists, search/filter/sort, status/progress, project CRUD, responsive detail sheet                                         | `PrecisionProjects`                        |
| `/clients`       | Client directory, client history, add client, open project                                                                                      | `PrecisionClients`                         |
| `/calendar`      | Month grid, week start, delivery counts, selected-day detail, open project                                                                      | `PrecisionCalendar`                        |
| `/timeline`      | Chronological delivery and progress view                                                                                                        | `PrecisionTimeline`                        |
| `/media`         | Project file/deliverable library, list/grid view, collection filter, search, selected project context                                           | `PrecisionMedia`                           |
| `/feedback`      | Review/revision queue and project context                                                                                                       | `PrecisionFeedback`                        |
| `/reports`       | Production metrics, payout periods, paid/outstanding batches, charts, payout and invoice CSV export                                             | `PrecisionReports`                         |
| `/resources`     | Saved links, folders, project links, create/edit/delete/copy/open actions                                                                       | `ResourcesDesignPage` in `tracker-app.tsx` |
| `/templates`     | Reusable project templates and blank-project flow                                                                                               | `TemplatesDesignPage` in `tracker-app.tsx` |
| `/integrations`  | Integration settings and project link configuration                                                                                             | `IntegrationsDesignPage`                   |
| `/team`          | Team members, roles and workspace management                                                                                                    | `TeamDesignPage`                           |
| `/team-chat`     | Team conversation surface                                                                                                                       | `TeamChatPage`                             |
| `/settings`      | Workspace settings, profile preferences, theme, accent, density, date/currency and project options                                              | `SettingsDesignPage`                       |
| `/account`       | Account/auth settings                                                                                                                           | `AccountSettingsPage`                      |
| `/profile`       | Public-facing profile summary, project stats and profile data                                                                                   | `ProfileDesignPage` (special shell bypass) |
| `/profile/edit`  | Profile editing                                                                                                                                 | `ProfileEditPage`                          |
| `/organization`  | Team/organization profile and team project summary                                                                                              | `OrganizationProfilePage`                  |
| `/sample-studio` | Read-only/sample dashboard experience with sample mode bar                                                                                      | `TrackerApp experienceMode="sample"`       |

### Public, access and support routes

| Route                                  | Purpose                                      | Current implementation                                                        |
| -------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| `/access`                              | Access-code entry                            | CSS module form and semantic `main`/`section`                                 |
| `/client-portal`                       | Client portal landing and token instructions | Standalone shadcn-style page                                                  |
| `/client-portal/[token]`               | Shared client portal view                    | Server route plus client portal view                                          |
| `/u/[slug]`                            | Shared public editor profile                 | `public-profile-page.tsx`                                                     |
| `/contact`                             | Contact form and support copy                | `LegalPage` plus `ContactForm`                                                |
| `/accessibility`                       | Accessibility statement                      | `LegalPage`                                                                   |
| `/privacy`, `/privacy-policy`          | Privacy policy; alias redirects              | `LegalPage` and redirect                                                      |
| `/terms`                               | Terms of service                             | `LegalPage`                                                                   |
| `/not-found`, `/error`                 | Error and missing-route recovery             | Shared app error surfaces                                                     |
| `/prototype/workspace-page-primitives` | Internal layout primitive fixture            | `WorkspacePageFixture`; should stay non-product and out of primary navigation |

## Existing stack and component inventory

### Application stack

- Next.js App Router 16, React 19 and TypeScript.
- Convex for cloud data, Clerk for optional auth, and local storage/data context for local mode.
- Tailwind CSS 4 with CSS variables and `tw-animate-css`.
- shadcn-style owned components under `src/components/ui`, backed by Radix primitives.
- Lucide icons, Motion for transitions, TanStack Table for dense data tables, Recharts for reports, Sonner for toasts.
- Geist Sans and Geist Mono loaded in the root layout; Space Grotesk loaded for display headings.
- MUI references and compatibility styles remain in legacy areas, chiefly the large `tracker-app.tsx`; `scripts/check-mui-allowlist.mjs` guards the migration.

### Shared application components

- `WorkspaceShell`: desktop sidebar, mobile sheet navigation, top bar, command dialog, account menu, notifications and new-project action.
- `workspace-page`: `WorkspacePage`, `PageHeader`, `PageContent`, `PageToolbar`, `MetricStrip`, `ContentSection`, `DataTableFrame`, `SplitPane`, `MasterDetail`, `FillViewport`, and empty-state primitives.
- Precision screen modules: dashboard, projects, schedule/timeline/calendar, media, clients/feedback/reports and workspace administration.
- `TrackerApp`: cross-screen state, data hooks, permissions, project dialogs, detail/delete dialogs, settings context and route dispatch.
- Brand helper: `CutLabLockup`, brand assets and empty-state assets.
- Owned UI primitives: alert dialog, accordion, avatar, badge, button, command, dialog, dropdown menu, field layout, input, label, popover, progress, select, sheet, skeleton, switch, textarea and tooltip.

### Design tokens already present

`src/app/globals.css` defines light and dark `--app-*` tokens for canvas, panels, sidebar, controls, text, borders, semantic colors, shadows, charts and motion. The root theme boot script applies stored theme, accent and density before hydration. The existing token set is practical, but its naming and values differ from the local CutLab reference boards in places: current light mode uses a teal/blue neutral UI, while the reference board is dark graphite with `#0C0F12`, `#1A1F24`, `#E6E5E3`, `#2D8C97` and `#69C4CE`.

## Current strengths

1. The shell has a clear route model and grouped navigation. The command menu and `G` route chords support fast repeated work.
2. New work screens already use a compositional layout seam instead of route-local page geometry. The workspace-page architecture documents scroll ownership and responsive rules well.
3. Project workflows are substantial and should be preserved: CRUD, personal/team scope, permissions, statuses, progress, due dates, client links, notes, activity, payment and detail actions.
4. The app supports local mode and cloud mode without requiring a single deployment setup. Theme boot and hydration fixes reduce visible theme drift.
5. Mobile project behavior has a useful pattern: compact list at narrow widths and a sheet for selected detail. This pattern can carry to clients, media, feedback and reports.
6. Focus-visible outlines, skip link, Radix focus management, reduced-motion hooks, semantic route pages and responsive screenshots show that accessibility is already part of the codebase.
7. The existing QA scripts cover desktop/mobile captures, theme states, route HTML, interaction checks, scroll behavior and reduced motion. This gives the redesign a regression loop.
8. Local brand references are unusually specific. They state the palette, type roles, status colors, spacing, radius, tables, navigation, dashboard modules and interaction principles needed for a unified system.

## Gaps and risks

### Consistency and architecture

- `tracker-app.tsx` remains a very large mixed module. It owns route dispatch, state, data mapping, dialogs and many screen implementations. This makes a global visual change risky and makes feature ownership hard to test.
- Precision screens use the `workspace-page` primitives, but resources, templates, integrations, team, chat, settings, account and profile still sit in legacy design code. These screens are the highest drift risk.
- There are two visible design sources: the current implemented token set and the CutLab reference boards. The redesign needs one approved token contract before changing screen-level styles.
- The sidebar exposes many destinations while the design-system note recommends a smaller set of primary hubs. Navigation labels also use both “Reviews” and “Feedback” in different product language.
- Brand naming still mixes Frame Desk and CutLab Studio in assets, comments and compatibility names. Keep the product name visible to users, but use one internal brand vocabulary and accessible label.

### Accessibility

- Audit every icon-only action in shell, tables, cards, charts and media view controls for a useful accessible name and visible tooltip where needed.
- Dense tables and interactive rows need consistent keyboard selection, row action access, `aria-sort`, focus retention after sheets/dialogs close, and non-color status cues.
- Charts in reports need text summaries or equivalent data tables. Progress rings and color-coded badges need readable labels, not color alone.
- Check contrast after adopting the reference teal/cyan palette in both themes, especially muted text, disabled controls, active nav and status chips.
- Confirm heading order and landmark ownership across screens that bypass `WorkspaceShell`, especially profile, access, portal and legal pages.
- Check mobile sheets for a clear title/description, escape behavior, focus return and content that remains reachable at 200% text zoom.

### Responsive behavior

- The shell currently uses a collapsed 60px desktop rail and a fixed top bar. Confirm tooltip labels, hit areas and content offset at tablet widths.
- Several workspace families need the documented fill-height and bounded internal scroll contract. Any screen still using page-level height or nested overflow can create scroll traps.
- Tables must have either a deliberate compact mobile list or an announced horizontal scroll region. Do not let important status, due date or progress columns disappear silently.
- Charts, calendar cells, three-pane media layouts and chat need tested behavior at 320px, 390px, 768px, 1024px and wide desktop sizes.
- Header actions and toolbars should wrap in a stable order; filters should remain discoverable on small screens rather than overflow offscreen.

### Interaction and state coverage

- Loading, empty, error, permission denied, read-only/sample, saving, saved, deleting and offline/local-mode states should share component patterns.
- Destructive project actions already use dialogs; carry the same confirmation and toast rules to resources, templates, integrations and team actions.
- Preserve reduced motion for route entry, drawer transitions and list changes. Avoid animation that changes layout height or hides content from captures and assistive technology.
- Keep selected project/detail state and shell scroll stable when filters, tabs or query results change.
- Ensure every primary action has a clear disabled reason or pending state. Avoid disabled controls that only change opacity.

## Feature-preservation checklist

Before merging any screen redesign, verify the following:

- [ ] All listed routes still resolve, including aliases, token routes, public profiles, sample mode and legal pages.
- [ ] Local mode works without Clerk/Convex configuration; cloud mode still respects Clerk identity and Convex permissions.
- [ ] Project create from blank and template, edit, delete, detail, status, checklist, payment and comment actions remain wired.
- [ ] Personal/team project scopes and permission gates remain intact.
- [ ] Search, filter, sort and date/status/billing views preserve their current values and reset behavior.
- [ ] Client creation and canonical name matching still work from project and client surfaces.
- [ ] Calendar month/week-start/selected-day behavior and timeline ordering remain correct.
- [ ] Media list/grid and collection filters preserve selection and project context.
- [ ] Feedback/review status, reports payout calculations, period selection and CSV exports remain correct.
- [ ] Resource links, templates, integrations, team, chat, settings, account and profile saves still persist.
- [ ] Theme, accent, density, date format and currency settings still apply before and after hydration.
- [ ] Sample mode remains read-only and clearly marked.
- [ ] Dialogs and sheets return focus and announce titles/descriptions.
- [ ] Desktop, tablet and mobile checks pass in light, dark and reduced-motion states.

## Suggested implementation seams and slice order

1. **Token contract and primitives.** Reconcile the reference board with `globals.css`, root theme boot, brand helpers and the owned shadcn primitives. Add semantic status, focus, disabled, selected, surface and density tokens. Do not change data behavior in this slice.
2. **Shell and navigation.** Stabilize sidebar widths, route groups, mobile navigation, top bar, breadcrumbs, command search, account menu and notification actions. Keep all current hrefs and shortcuts.
3. **Workspace-page geometry.** Apply the documented content rail, gutters, header, toolbar, section, panel, fill-height and scroll contracts. Add tests for responsive variants and focus/overflow behavior.
4. **Dashboard and projects.** These are the daily core and already use Precision modules. Align metrics, queues, tables, project inspector, empty states and actions to the new system, then run the existing UI verification.
5. **Schedule family.** Migrate calendar and timeline as one slice because they share dates, delivery status and fill-height layout.
6. **Library and review family.** Migrate media, feedback, resources and templates. Reuse the mobile selected-detail sheet and empty-state patterns.
7. **People and administration.** Migrate clients, team, team chat, integrations, reports, settings, account, profile and organization. Keep data and permissions in `TrackerApp` or extract them behind narrow props/hooks before visual work.
8. **Public and support surfaces.** Align access, client portal, public profile, contact and legal pages with the same typography, color, focus and responsive rules while keeping their simpler information architecture.
9. **Consolidation and removal.** Remove route-local visual constants and unused legacy/MUI presentation code only after each replacement passes feature and visual checks. Update design docs and route snapshots.

## Recommended QA gates

- Typecheck and production build after each family slice.
- Existing `verify:ui`, `verify:browser`, workspace layout checks and relevant unit tests.
- Desktop 1440px, mobile 390px, tablet 768/1024px, light/dark and reduced-motion captures.
- Keyboard-only pass for navigation, search, project CRUD, filters, tables, dialogs, sheets and settings.
- Screen-reader-oriented pass for landmarks, headings, control names, status text and chart/table alternatives.
- Preserve the current dirty worktree changes (`next-env.d.ts`, `src/app/providers.tsx`, `src/app/providers.test.tsx`) when applying the redesign.
