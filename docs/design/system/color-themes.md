# Color and themes

## Purpose

Use one semantic palette across light, dark, accent, status, and selection states.

## Anatomy

Define canvas, surface, foreground, muted, border, input, primary, secondary, accent, destructive, success, warning, info, focus, and selection tokens. Keep Relay's dark-first base: graphite canvas/surfaces, teal action, cyan highlight, green success, amber warning, red error.

## Behavior

Feature code consumes CSS variables. Dark mode overrides the same names. Use color to reinforce status, with text, icon, label, or shape as a second cue.

`globals.css` is the source of truth for theme values. Runtime theme code sets the light or dark class and may override only `--app-accent` and its contrast-safe foreground. Provider brand colors (`--brand-*`), workflow stage colors (`--workflow-stage-*`), and decorative media palettes (`--decorative-thumb-*`, `--media-package-*`) are named tokens because they carry brand or grouping meaning rather than interface state.

## States

Check default, hover, active, selected, disabled, error, success, warning, focus, chart, placeholder, and read-only tokens in both themes.

## Responsive rules

Theme changes do not alter layout. Theme and accent boot before hydration to avoid a flash.

## Accessibility

Meet 4.5:1 text contrast and 3:1 non-text contrast, including borders, charts, focus, and disabled-adjacent content. Never rely on color alone.

## Preserved features

Keep theme, accent, and stored preference boot behavior and existing brand assets.

## Acceptance checks

- Token audit finds no raw feature colors.
- Light, dark, and accent captures pass contrast checks.
- Status remains clear in grayscale and with assistive text.

Source: [best practices](../../research/frontend-ui-best-practices-2026.md) and [brand system](../DESIGN_SYSTEM.md).
