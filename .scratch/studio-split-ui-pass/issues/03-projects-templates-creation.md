# 03 - Projects, Workflow Templates, and creation

**What to build:** Move Projects and Workflow Templates to Studio Split and make every Project or Client creation entry use the approved short, recoverable Quick Create flow.

**Blocked by:** 02 - App Shell and Dashboard.

**Status:** resolved

- [x] Projects use a compact directory with search, filters, table and optional board views, delivery-risk ordering, and a contextual right inspector.
- [x] Each Project exposes Client, Project Group, workflow stage, due state, Review state, payment state, and current next action without card-per-row chrome.
- [x] Quick Create, Projects header, Clients header, empty states, command search, and shortcuts open the same Project or Client flow.
- [x] New Project requires name and Client and offers Workflow Template, due date, Project Group, and relevant Salary Plan choices.
- [x] Create new Client inside the Client selector returns to the unfinished Project with the new Client selected and never stacks dialogs.
- [x] New Client requires name and offers optional email and company details.
- [x] Changed forms warn before discard, failed submissions preserve input, repeat submission is blocked, and cancel restores focus.
- [x] Successful Project creation opens the new Project Workspace; successful Client creation follows its calling context.
- [x] Workflow Templates preserve current create, edit, copy, delete, permission, starter Project Output, and relative-date behavior.
- [x] Liquid Gooey runs only on the approved Quick Create transition; reduced motion opens the same content without the effect.
- [x] Local, sample, cloud, read-only, keyboard, mobile sheet, and error paths pass at the agreed seams.
- [x] Focused tests, typecheck, and production build pass.

## Answer

Migrated Projects and Workflow Templates to Studio Split, unified Project and Client creation around the short recoverable Quick Create flow, and verified directory, permission, responsive, keyboard, reduced-motion, persistence, and error behavior.
