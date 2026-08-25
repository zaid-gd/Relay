# 10 — Track Project Outputs and Media Versions

**What to build:** Let editors manage promised Project Outputs and add linked Media Versions while retaining history. The newest version becomes current, older versions stay internal, and several outputs never inflate Project or salary counts. Commit this slice to the shared rebuild branch; do not open a separate pull request or deploy it.

**Blocked by:** 09 — Move Projects through the workflow.

**Status:** resolved

- [x] Template starter outputs become real empty Project Output slots, and users can add, edit, archive, and set editor-controlled review states on outputs.
- [x] Adding a Media Version makes it current while retaining older versions and highlighting unresolved Comments from old versions for internal users.
- [x] YouTube and Vimeo URLs are validated and stored as normalized provider metadata; other valid HTTP or HTTPS URLs stay ordinary links; arbitrary embed code is never accepted.
- [x] Controller, domain, and adapter tests prove that Project Outputs and Media Versions do not change the one-Project salary count.

## Answer

Implemented real Project Output slots with editor review states, retained Media Version history, normalized provider links, old-version Comment warnings, atomic Template initialization, and isolated Project and salary counts.
