# 01: Shared UI boundary and fixed density

**What to build:** Give authenticated workspace members one balanced interface density and a consistent owned component layer for accessible, restrained interaction behavior.

**Blocked by:** None: can start immediately.

**Status:** resolved

- [x] Feature screens consume owned shadcn components rather than importing Radix or Animate UI directly.
- [x] Shared tabs, tooltips, dropdowns, dialogs, sheets, buttons, and icons support restrained motion and reduced-motion preferences.
- [x] The global Density setting and persistence path are removed.
- [x] Balanced workspace spacing remains the default while purpose-built local compact variants still work.
- [x] Type checking and targeted settings or component tests pass.

## Answer

Relay now uses one balanced global density. Legacy Density values are ignored and omitted from future settings writes, while local control variants remain. The owned shadcn layer includes the missing animated Tabs primitive, and feature code has no direct Radix imports.
