# Accessibility

## Purpose

Make every Relay task work with keyboard, touch, zoom, and assistive technology.

## Anatomy

Semantic landmarks, skip link, headings, named controls, visible focus, status text, keyboard alternatives, focus-managed overlays, and text/chart alternatives.

## Behavior

Use semantic HTML first and Radix for focus and ARIA wiring. Announce route title then h1. Keep focus visible and return it to the trigger after dialogs and sheets.

## States

Test focus-visible, selected, disabled, error, loading, success, read-only, and permission-denied states in light and dark themes.

## Responsive rules

Support 320px reflow, 200% text resize, touch target minimums, landscape, and no obscured focus. Complex data surfaces may retain intentional scroll.

## Accessibility

Target WCAG 2.2 AA: keyboard, focus order, focus not obscured, contrast, resize, reflow, target size, dragging alternatives, reduced motion, and hover/focus content rules.

## Preserved features

Keep current skip link, focus-visible styles, reduced-motion support, Radix primitives, route semantics, and access/portal/legal landmarks.

## Acceptance checks

- Keyboard-only pass covers navigation, search, CRUD, filters, tables, sheets, dialogs, and settings.
- Screen-reader pass covers names, headings, landmarks, status, errors, and chart alternatives.
- Automated checks plus desktop/mobile light/dark/reduced-motion captures pass.

Source: [best practices](../../research/frontend-ui-best-practices-2026.md).
