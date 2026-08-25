# 05 - Clients

**What to build:** Move Clients to Studio Split so a solo editor can scan a compact directory, inspect durable Client context, create or edit records, and understand restricted states without leaving the page.

**Blocked by:** 02 - App Shell and Dashboard.

**Status:** resolved

- [x] Clients use a compact directory with search, useful summary data, deliberate selection, and a contextual right inspector.
- [x] Client name is the display name; optional company information remains supporting context.
- [x] The inspector preserves contact details, Project history, Project Groups, money totals, Salary Plan context, and Client Portal links allowed by current permissions.
- [x] New Client uses the shared creation flow and opens Client detail when called from the Clients route.
- [x] Small discrete changes save immediately; text and multi-field edits use Save and Cancel.
- [x] Read-only users can see permitted data with an explicit read-only state; inaccessible destinations and actions remain hidden.
- [x] Empty, loading, refresh, failure, delete confirmation, keyboard, focus, compact density, light, dark, and responsive states pass.
- [x] Focused tests, typecheck, and production build pass.

## Answer

Aligned the Clients directory and inspector with Studio Split while preserving Client creation, editing, project history, totals, selection, and responsive behavior.

