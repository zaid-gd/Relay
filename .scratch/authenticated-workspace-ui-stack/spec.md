# Authenticated Workspace UI Stack

Status: ready-for-agent

## Problem Statement

Relay's Authenticated Workspace UI mixes shared primitives, route-local controls, and legacy compatibility code. The result is uneven interaction behavior, duplicated styling decisions, a user-facing Density setting that no longer fits the product direction, and unclear ownership between shadcn, Radix, Motion, and feature screens. The workspace needs one component boundary and a restrained motion system without changing its workflows, data, routes, or public surfaces.

## Solution

Standardize the Authenticated Workspace UI on owned shadcn components styled with Tailwind. Keep Radix and selected Animate UI behavior inside the owned `components/ui` layer. Use Motion for purposeful state transitions and interaction feedback, with reduced-motion support and no decorative or continuously repainting effects. Remove the global Density setting and use balanced workspace spacing while retaining local compact variants for dense controls. Migrate the App Shell and authenticated routes in phases, preserve product behavior, and remove conflicting or dead UI compatibility code when its consumers have migrated.

## User Stories

1. As an authenticated workspace member, I want every internal route to use the same App Shell, so that navigation stays predictable.
2. As an authenticated workspace member, I want the active route to be clear, so that I always know where I am.
3. As a keyboard user, I want navigation and controls to expose visible focus states, so that I can work without a pointer.
4. As a screen-reader user, I want menus, tooltips, tabs, dialogs, and sheets to keep correct accessible behavior, so that controls remain understandable.
5. As a workspace member, I want overlays to restore focus after closing, so that I can continue where I left off.
6. As a workspace member, I want tabs to show restrained state transitions, so that changes feel connected without slowing my work.
7. As a workspace member, I want tooltips to explain icon-only actions, so that compact controls remain clear.
8. As a workspace member, I want dropdowns to open and close smoothly, so that state changes are easy to follow.
9. As a workspace member, I want dialogs and sheets to use consistent motion and spacing, so that every workflow feels related.
10. As a workspace member, I want buttons and icons to provide small interaction feedback, so that actions feel responsive.
11. As a user who prefers reduced motion, I want nonessential transitions removed, so that the workspace remains comfortable.
12. As a workspace member, I want the interface to avoid decorative effects and animated backgrounds, so that content stays primary.
13. As a workspace member, I want one balanced workspace density, so that pages do not change size unexpectedly.
14. As a workspace member, I want dense tables and similar controls to retain local compact layouts, so that repeated data stays efficient.
15. As a workspace member, I do not want a global Density preference, so that Settings contains only supported choices.
16. As a workspace member, I want my existing theme and accent choices preserved, so that the visual migration does not remove unrelated preferences.
17. As a workspace member, I want dashboard actions and summaries to use the shared Page System, so that the starting view matches the rest of the product.
18. As a project manager, I want Projects list and board controls to share buttons, tabs, menus, and dialogs, so that switching views does not change interaction rules.
19. As a project contributor, I want project detail panes and media review controls to use the same component system, so that complex work stays coherent.
20. As a workspace member, I want Calendar, resources, templates, clients, team, chat, reports, integrations, settings, account, and organization surfaces to share the same primitives, so that the full workspace feels like one product.
21. As a mobile workspace member, I want responsive navigation and sheets to keep their current workflows, so that the migration does not reduce mobile access.
22. As a workspace member, I want loading, empty, error, and disabled states to retain clear meaning, so that visual changes do not hide system state.
23. As a workspace member, I want existing URLs and saved views to keep working, so that the UI migration does not break navigation.
24. As a workspace member, I want existing project, client, media, team, and settings workflows preserved, so that this migration changes presentation rather than product rules.
25. As a developer, I want feature screens to import owned shadcn components rather than Radix or Animate UI directly, so that UI ownership stays clear.
26. As a developer, I want obsolete and conflicting UI dependencies or compatibility shims removed after migration, so that the frontend has one maintained path.
27. As a developer, I want the migration delivered in verifiable phases, so that regressions have a small source area.
28. As a product owner, I want public profiles, the Client Portal, access, contact, and legal pages left unchanged, so that this slice stays focused.

## Implementation Decisions

- The first slice covers the Authenticated Workspace UI only.
- Feature screens consume owned shadcn components through the shared UI component layer.
- Radix provides accessible behavior behind owned components. Feature screens do not import Radix directly.
- Selected Animate UI patterns are adapted into the owned component layer rather than introduced as a second feature-facing component system.
- Tailwind remains the styling system and source of design tokens.
- Motion provides shared state transitions and small interaction feedback.
- The selected animated behaviors are tabs, tooltips, dropdowns, dialogs, sheets, buttons, icons, and the active navigation indicator.
- Motion stays short, restrained, interruptible, and safe under reduced-motion preferences.
- Decorative motion, animated backgrounds, shimmer, pulse, blur animation, and other continuous repaint effects are excluded.
- The workspace keeps true-black dark surfaces, white primary text, dense information layout, minimal copy, and limited decorative chrome.
- The global Density preference and its persistence path are removed.
- Balanced spacing becomes the single App Shell and Page System density.
- Purpose-built local compact variants remain where they improve tables, text areas, or other repeated controls.
- Theme and accent preferences remain supported.
- Existing routes, domain behavior, data flow, permissions, and backend contracts remain unchanged.
- Existing shared primitives are reused before adding new code or dependencies.
- No new UI package is added when the installed shadcn, Radix, Tailwind, Motion, and animation utilities already cover the behavior.
- Conflicting UI packages are removed only if the dependency audit finds them installed or imported. Dead compatibility props and shims are removed after their callers migrate.
- Migration order is tokens and shared primitives, App Shell and navigation, Page System geometry, primary work routes, remaining authenticated routes, then cleanup and release verification.

## Testing Decisions

- Tests assert external behavior and accessibility rather than component internals, animation frame values, or library-specific markup.
- The highest verification seam is one Playwright workspace UI contract in the existing local-mode end-to-end suite.
- The contract covers App Shell rendering across authenticated routes, keyboard and pointer operation, overlay focus restoration, reduced-motion behavior, removal of the Density control, and unchanged public-route boundaries.
- Existing workspace primitive tests remain the prior art for Page System rendering contracts.
- Existing local project end-to-end tests remain the prior art for App Shell geometry, navigation, project workflows, keyboard operation, dialogs, and focus restoration.
- Type checking, the MUI import allowlist, production build, and targeted component tests act as implementation checks.
- Each migration phase runs the narrowest relevant checks before the final full workspace contract.

## Out of Scope

- Public Profiles.
- Client Portal surfaces.
- Access, contact, privacy, terms, and other public or support routes.
- Product workflow changes, new domain features, backend changes, or schema changes.
- A new design direction beyond the approved persistent workspace navigator.
- A user-selectable Density setting.
- Replacing every local compact layout with one global spacing value.
- Decorative Animate UI examples, animated backgrounds, magnetic controls, ripples, or continuous effects.
- Adding a second feature-facing UI library.

## Further Notes

- The component boundary and Density meaning are recorded in the project glossary.
- The current dependency set already contains the needed stack. Dependency work should focus on removal and consolidation.
- Public surfaces will receive a separate spec and migration slice.
