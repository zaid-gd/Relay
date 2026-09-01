# Design system overview

## Purpose

Give every Relay surface one clear visual and interaction contract while keeping the current features and fonts. The product should feel calm, dense, and direct for video-work production.

## Anatomy

The system has tokens, owned shadcn/Radix primitives, workspace-page layout patterns, feature compositions, and route-level content. Screens own data and actions; shared modules own visual rules.

## Behavior

Use semantic tokens and composition. Keep common actions visible, move rare actions into menus or sheets, and use one primary work surface per page. Never import Convex or Clerk into visual primitives.

## States

Every control and page defines default, hover, pressed, focus-visible, selected, disabled, loading, empty, no-results, error, success, and read-only states. See [states and feedback](states-feedback.md).

## Responsive rules

Use the same content at each width. Change layout, overflow, and disclosure, not meaning. Keep essential actions and data reachable at 320px and at 200% text zoom.

## Accessibility

Target WCAG 2.2 AA. Use semantic HTML, visible focus, named landmarks, keyboard paths, contrast checks, and reduced motion. See [accessibility](accessibility.md).

## Preserved features

Keep local, sample, and cloud modes; current routes and aliases; theme, accent, density, date, and currency settings; permissions; and current fonts (Space Grotesk display, Geist Sans interface/body, and Geist Mono for code and fixed-width data).

## Acceptance checks

- One token source serves light and dark themes.
- Shared primitives have documented keyboard and state behavior.
- Every route family links to a feature contract.
- Existing UI and browser checks pass after each slice.

Source: [best practices](../../research/frontend-ui-best-practices-2026.md) and [audit](../current-frontend-audit.md).
