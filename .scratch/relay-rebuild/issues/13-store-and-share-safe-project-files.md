# 13 — Store and share safe Project files

**What to build:** Let cloud users add and manage safe Project-owned documents and images, share selected files through short-lived access, and understand quota or deletion effects. Storage pressure must block new writes without hiding or deleting existing files. Commit this slice to the shared rebuild branch; do not open a separate pull request or deploy it.

**Blocked by:** 12 — Review Media Versions with Comments.

**Status:** resolved

- [x] PDF, plain text, Markdown, JPEG, PNG, and WebP files up to 20 MB are accepted; HTML, SVG, scripts, executables, archives, direct video, and direct audio are rejected.
- [x] Private files use short-lived signed links; portal visibility is explicit; Allow Download defaults off for shared image, PDF, and text files; Markdown renders without raw HTML while visible text remains copyable.
- [x] The free Workspace limit is 200 MB, all retained Media Versions and archived files count, and a service-capacity guard blocks new uploads before provider capacity is exhausted.
- [x] Archive and permanent deletion explain retained size and affected history, and tests cover type, size, quota, version accounting, signed access, visibility, download, service refusal, and no automatic deletion.

## Answer

Implemented Relay-owned Project file storage with server-side type, extension, size, Workspace quota, and service-capacity checks. Private and portal access use signed storage links; portal sharing and download permission stay explicit and default off. Archived files and retained Media Versions count toward storage, permanent deletion frees the stored blob, and the UI-safe Markdown renderer never injects raw HTML. Focused tests cover each acceptance path.
