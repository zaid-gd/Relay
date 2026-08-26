# Frame Desk design system

This index defines the unified UI contract for the Frame Desk workspace. It keeps the current Next.js, Tailwind, shadcn/ui, Radix, Lucide, Motion, TanStack Table, Recharts, and existing fonts. The implementation must preserve current routes, data flows, local/cloud modes, permissions, and feature actions.

## System sections

- [Overview](system/overview.md)
- [Layout](system/layout.md)
- [Navigation](system/navigation.md)
- [Components](system/components.md)
- [Typography](system/typography.md)
- [Spacing and density](system/spacing-density.md)
- [Color and themes](system/color-themes.md)
- [Interactions and motion](system/interactions-motion.md)
- [States and feedback](system/states-feedback.md)
- [Responsive behavior](system/responsive.md)
- [Accessibility](system/accessibility.md)

## Feature contracts

- [Dashboard](features/dashboard.md)
- [Projects](features/projects.md)
- [Clients](features/clients.md)
- [Calendar and timeline](features/calendar-timeline.md)
- [Media and reviews](features/media-reviews.md)
- [Templates and resources](features/templates-resources.md)
- [Reports](features/reports.md)
- [Team chat](features/team-chat.md)
- [Integrations and settings](features/integrations-settings.md)
- [Profiles and portals](features/profiles-portals.md)
- [Access and support](features/access-support.md)

The research basis is [frontend UI best practices](../research/frontend-ui-best-practices-2026.md), [competitor UI patterns](../research/competitor-ui-patterns-2026.md), and the [current frontend audit](current-frontend-audit.md). The current implementation order and acceptance gates live in the [legacy retirement spec](../../.scratch/legacy-retirement/spec.md).

---

## Existing brand foundations

The brand-kit images in `assets/` are the visual source of truth. Product code should consume the shared tokens and components rather than copying color or typography values into individual routes.

## Reference-board foundations

- Dark-first canvas: `#0C0F12`
- Primary surface: `#1A1F24`
- Primary text: `#E6E5E3`
- Action teal: `#2D8C97`
- Highlight cyan: `#69C4CE`
- Success: `#23B58E`
- Warning: `#F5A623`
- Error: `#FF5B5B`
- Display type: Space Grotesk, semibold or bold
- Current UI and body type: Geist Sans, regular through semibold
- Spacing follows a 4px/8px rhythm
- Standard controls and panels use an 8px radius
- Borders are cool, low-contrast, and 1px
- Shadows are reserved for overlays and dialogs

The implementation source is [`src/app/design-system.ts`](../../src/app/design-system.ts), with global tokens in [`src/app/globals.css`](../../src/app/globals.css).

## Product Language

- Use teal for actions, active navigation, progress, and selected states.
- Use semantic colors only for status and feedback.
- Keep layouts structured, information-dense, and calm.
- Prefer flat bordered surfaces over nested elevated cards.
- Use outline-first, geometric icons with consistent visual weight.
- Use the CutLab workflow mark for product identity, not a generic video icon.
- Empty states use the shared workflow-line illustration and concise guidance.

## Navigation

The desktop sidebar contains only primary product hubs:

- Dashboard
- Projects
- Clients
- Library
- Reports
- Team
- Settings

Related destinations remain addressable routes but appear as contextual navigation inside their parent hub. This keeps deep links intact while reducing sidebar clutter.

## Shared Components

- `CutLabLockup` provides the product identity.
- The `workspace-page` module provides headers, toolbars, sections, metrics, tables, pane layouts, and empty states.
- Owned shadcn/Radix components under `src/components/ui/` provide controls, menus, dialogs, sheets, tooltips, and feedback.
- Feature modules compose these shared parts without route-local color or spacing systems.

New routes should reuse these foundations before introducing route-specific styling.
