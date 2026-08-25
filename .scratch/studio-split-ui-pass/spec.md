# Studio Split full-product UI pass

**Status:** ready-for-agent

## Problem Statement

Relay's product workflows are complete, but the production interface does not match the approved Studio Split direction. The discarded UI draft uses the wrong visual language and must not guide implementation. Relay needs one coherent internal workspace that keeps important work visible, collapses secondary controls, supports solo editing first, and preserves every workflow completed by the Relay rebuild.

## Solution

Rebuild Relay's production presentation around the approved Studio Split prototype. Use its full-width sidebar workspace, compact top controls, monochrome token system, grouped charcoal or white work areas, KPI strips, contextual inspectors, and creation flows. Preserve current production routes, data, permissions, and behavior. Treat the current production UI only as a behavior reference. Treat the approved Studio Split prototype as the visual source.

The pass covers every internal route, the Project Workspace, Quick Create, Team Chat, onboarding, public profiles, and the Client Portal. Internal routes may use the limited approved blur and motion effects. Public and Client-facing routes use no blur or glow.

## User Stories

1. As a solo editor, I want a stable full-width workspace, so that the product feels like a working tool instead of a website inside a frame.
2. As a solo editor, I want the main navigation visible on desktop, so that I can move between frequent work areas without opening menus.
3. As a solo editor, I want secondary navigation to collapse, so that the current task keeps most of the screen.
4. As a solo editor, I want Quick Search at the top of the sidebar and creation, notifications, and account controls in the top bar, so that common global actions match the approved Studio Split shell.
5. As a keyboard user, I want a skip link and visible focus, so that I can reach the current work area quickly.
6. As a keyboard user, I want route and command shortcuts to remain available, so that the redesign does not slow down established work.
7. As a user opening a deep link, I want the correct route and selected navigation state restored, so that I do not lose context.
8. As a user, I want the interface to follow my theme choice, so that light and dark use remain consistent across sessions.
9. As a first-time user, I want Relay to follow the system color preference, so that the initial theme matches my device.
10. As a user, I want density changes to preview immediately, so that I can choose balanced or compact spacing without guessing.
11. As a user with reduced motion enabled, I want static selected and loading states, so that motion does not block or distract me.
12. As a solo editor, I want today's decisions at the top of the Dashboard, so that urgent work is clear.
13. As a solo editor, I want active Projects, due work, waiting Reviews, and collected money visible, so that I can assess the day quickly.
14. As a solo editor, I want the current Salary Batch visible without the full money operation, so that earnings progress stays useful and compact.
15. As a solo editor, I want a short activity list, so that recent changes are visible without opening an audit log.
16. As a solo editor, I want Dashboard items to open the relevant Project or Review, so that the summary leads directly to work.
17. As a solo editor, I want a compact Projects directory, so that I can compare active work without scanning large cards.
18. As a solo editor, I want Projects ordered by delivery risk, so that problems surface before routine work.
19. As a solo editor, I want filters and search near the Projects list, so that narrowing the directory does not hide the list.
20. As a solo editor, I want a contextual Project inspector, so that details remain visible without leaving the directory.
21. As a solo editor, I want a table view and an optional board, so that I can choose the right view for the task.
22. As a solo editor, I want Project rows to show Client, stage, due state, Review state, and payment state, so that I can compare what matters.
23. As a solo editor, I want New Project available from the page header and Quick Create, so that creation works from expected places.
24. As a solo editor, I want Project creation to require only name and Client, so that I can start work without completing a long form.
25. As a solo editor, I want optional Workflow Template, due date, Project Group, and Salary Plan choices, so that useful setup remains available.
26. As a solo editor, I want to create a missing Client inside Project creation, so that I do not lose the unfinished Project.
27. As a solo editor, I want changed creation forms to warn before closing, so that accidental dismissal does not erase work.
28. As a solo editor, I want successful Project creation to open its Project Workspace, so that I can continue setup.
29. As a solo editor, I want a compact Clients directory with a right inspector, so that Client history and totals remain close to the list.
30. As a solo editor, I want Client name to be the display name, so that optional company data does not replace the person or account I recognize.
31. As a solo editor, I want New Client to require a name and offer optional email and company fields, so that creation stays short.
32. As a read-only user, I want accessible data to remain visible with clear restrictions, so that permissions do not look like missing records.
33. As a user without access to a destination, I want that destination hidden, so that navigation does not advertise unusable areas.
34. As a solo editor, I want the Project Workspace to open on Project Outputs first, so that promised results lead the workflow.
35. As a returning editor, I want the Project Workspace to remember my last-used view, so that I can resume where I left off.
36. As a solo editor, I want Outputs, Media, Reviews, and Activity in one Project Workspace, so that Project context stays intact.
37. As a solo editor, I want the current Project state and selected item visible in a contextual inspector, so that metadata does not crowd the central work view.
38. As a solo editor, I want hover to leave inspector context unchanged, so that selection remains deliberate.
39. As a solo editor, I want immediate save for small discrete fields, so that quick updates stay quick.
40. As a solo editor, I want Save and Cancel for notes, money, Client Portal settings, and multi-field edits, so that larger changes remain controlled.
41. As a solo editor, I want destructive Project actions in a labelled overflow menu, so that routine work stays safe.
42. As a solo editor, I want a Project Output list with current version, Review state, due date, and next action, so that delivery work is easy to scan.
43. As a solo editor, I want selected Review media to receive one short silver edge sweep, so that selection change is clear.
44. As a reduced-motion user, I want the selected Review media to change without a sweep, so that selection remains clear without motion.
45. As a solo editor, I want Media to open as a grid with an optional list, so that visual files lead while comparison remains possible.
46. As a returning editor, I want Media to remember my last-used view, so that repeated work stays consistent.
47. As a solo editor, I want global upload to ask for Project and Project Output, so that files never lose their work context.
48. As a solo editor, I want Project-scoped upload to keep its existing Project, so that I only choose the Project Output.
49. As a solo editor, I want Review states named Needs your action, Waiting on Client, Approved, and Resolved, so that feedback status is unambiguous.
50. As a solo editor, I want Calendar on the first Schedule visit, so that upcoming work appears immediately.
51. As a returning editor, I want Schedule to remember Calendar or Timeline, so that I can resume my planning view.
52. As a solo editor, I want Files first in the Files area, so that saved work is not hidden behind secondary views.
53. As a solo editor, I want Quick Search to find routes, Projects, Clients, Media, files, and commands, so that one action covers retrieval.
54. As a user, I want old data to remain visible while it refreshes, so that the interface does not flash empty.
55. As a user, I want a blurred refresh overlay labelled Refreshing data, so that temporary stale data is clear.
56. As a user, I want Thinking Orbs to last only for the active refresh, so that loading motion matches real work.
57. As a reduced-motion user, I want a static refresh indicator, so that loading state remains accessible.
58. As a solo editor, I want Reports to open on an overview with period controls, so that the current reporting range is obvious.
59. As a solo editor, I want work, money, and Salary Batch summaries together, so that the report answers operational questions without a large dashboard.
60. As a solo editor, I want charts to have text or table alternatives, so that information does not depend on graphics.
61. As a Workspace Owner, I want Team navigation hidden until I invite someone, so that solo Relay stays simple.
62. As a Workspace Owner, I want a clear invitation entry in Settings, so that the move from solo to Team remains discoverable.
63. As a Team Member, I want one Workspace-wide text chat, so that the Team can communicate without channels or Project setup.
64. As a Team Member, I want Team Chat to reject file uploads and Project attachments, so that it remains text only.
65. As a Team Member, I want static Name is typing text, so that typing presence is clear without continuous animation.
66. As a Team Member, I want a frosted focused chat composer, so that the active writing area is clear.
67. As a reduced-motion or limited-graphics user, I want the chat composer to use an opaque static state, so that it remains readable.
68. As a new user, I want a short setup path for my first Client and Project, so that Relay becomes useful quickly.
69. As a new user, I want Workflow Template setup to be optional, so that I can skip process design.
70. As a new user, I want an explicit Explore sample workspace option, so that sample data never mixes with real work.
71. As a Local Workspace user, I want a small storage status in the account menu, so that local mode remains visible without a page-wide warning.
72. As a Local Workspace user, I want strong warnings near backup and import, so that browser storage risk is clear where it matters.
73. As a user deleting ordinary records, I want a simple confirmation, so that deletion is safe without needless typing.
74. As a Workspace Owner deleting a Workspace or bulk irreversible data, I want typed confirmation, so that large loss requires deliberate action.
75. As a user, I want selected navigation to receive one silver pass for at most 600ms, so that route change is visible without ambient motion.
76. As a user, I want selected navigation to settle into a static monochrome state, so that the shell remains quiet.
77. As a user, I want ordinary transitions to finish in 120ms to 180ms, so that controls respond without decorative delay.
78. As a user, I want Quick Create to use the approved Liquid Gooey treatment, so that the global creation action is distinct.
79. As a reduced-motion user, I want Quick Create to open without the gooey transition, so that creation remains direct.
80. As a public visitor, I want a minimal Relay shell, narrow reading width, and theme support, so that public pages stay focused.
81. As a public profile owner, I want identity, a short bio, selected public work, links, and chosen public stats, so that I control what appears.
82. As a Client, I want a simple Project review page, so that internal Workspace details do not distract from feedback.
83. As a Client, I want shared Media Versions, Review state, Comments, and delivery actions, so that the portal contains only relevant work.
84. As a Client, I want no blur or glow in the Client Portal, so that the page stays sharp and restrained.
85. As a public visitor, I want no blur or glow on public pages, so that the public system remains separate from internal effects.
86. As a Client, I want missing, expired, invalid, and denied token states to explain recovery, so that access failures are actionable.
87. As a mobile user, I want directories to become compact lists with detail sheets, so that features remain usable on narrow screens.
88. As a mobile user, I want primary actions and current context to remain reachable, so that responsive layout does not hide workflows.
89. As a user at 200 percent text size, I want content to reflow without lost controls, so that zoom does not break the workspace.
90. As a release reviewer, I want every preserved route and workflow to pass before merge, so that the UI pass does not regress Ticket 19.

## Implementation Decisions

- The approved Studio Split prototype is the visual source for production work. Its full-width shell, expanded sidebar, compact top bar, KPI strip, grouped work areas, split lists, and contextual inspectors bind the implementation.
- The discarded production UI draft and the resolved unified frontend redesign are not visual sources. Implementation may inspect them only to preserve routes, data, permissions, actions, and tested behavior.
- The current Relay sidebar is retained only through the form already represented in the approved Studio Split prototype. Do not mix in other discarded visual choices.
- Production code will rebuild the selected design with typed React components and the existing component stack. Do not promote or import prototype components directly.
- Ideas from the supplied Svelte libraries may be rebuilt in React. Do not add a Svelte runtime or copy a library's brand styling.
- Internal dark mode uses a true-black canvas, white primary text, and charcoal work areas where grouping needs contrast. Light mode uses a soft neutral-gray canvas, white work areas, black type, and gray controls.
- The interface remains monochrome. Muted red, amber, and green are allowed only for semantic states with supporting text or icons.
- Geist is the product typeface. Display and interface typography do not retain the discarded draft's font choices.
- Group content with spacing and surface contrast. Avoid continuous horizontal or vertical divider lines. Use local borders only where controls, rows, tables, work areas, or overlays would lose their edge.
- Work areas and controls use restrained 6px radii. Overlays may use 8px radii. Full pills are limited to tags, avatars, and compact status markers.
- Dark work areas remain flat. Light-mode shadow is limited to floating overlays.
- The expanded desktop sidebar targets roughly 232px to 244px. The collapsed rail targets 56px. Work content uses the available width without a centered website container.
- Quick Search sits at the top of the sidebar. Quick Create, notifications, and account controls sit in the top bar.
- The balanced density targets roughly 40px rows, 36px controls, and 16px to 20px work-area padding. Compact density may reduce rows without hiding columns or actions.
- Quick Create is one shared flow for Projects and Clients. New Project requires name and Client. New Client requires name and offers optional email and company.
- Simple field changes save immediately. Text and multi-field edits use explicit Save and Cancel.
- Refresh keeps current data visible under an internal blurred overlay. Thinking Orbs run for the active refresh only.
- The motion allowlist contains the selected-navigation silver pass, Thinking Orbs, Liquid Gooey on Quick Create, the selected Review media edge sweep, and ordinary state transitions. Reduced motion replaces each effect with a static state.
- Public pages and the Client Portal use no blur or glow, including dialogs and media overlays.
- Team Chat remains one Workspace-wide text-only conversation. It has no channels, direct messages, Project attachment, or file upload.
- No Convex schema, permission, auth, route, or data migration is part of this pass unless a preserved workflow exposes a verified regression.
- The work follows an expand, migrate, contract sequence. Add the Studio Split system beside the current presentation, migrate complete route families, then remove replaced presentation code after verification.
- Ticket 19 commit `8691405` is the production-behavior baseline. PR merge, publishing, production deployment, and cloud-record changes remain blocked until the full UI pass passes its release gates.

## Testing Decisions

- Tests observe behavior through public interfaces. They do not assert private helper structure or reproduce CSS implementation details.
- The primary seam is the real App Router journey driven through Playwright. Existing entry, discovery, Project workflow, backup, Client review, Local Workspace, and cloud workflow tests provide prior art.
- The secondary seam is the shared App Shell and Page System component boundary. Existing workspace-page component tests provide prior art for landmarks, headings, geometry, focus, themes, density, and reduced motion.
- Each ticket uses one red-green tracer at the agreed seam before its production change. Add tests only for behavior the ticket changes or newly guarantees.
- Each migration ticket runs typecheck, its focused component or route tests, and a production build before resolution.
- Full verification runs route checks, UI interaction checks, browser journeys, production verification, visual captures, light and dark themes, reduced motion, keyboard paths, contrast checks, and responsive widths at 320px, 390px, 768px, 1024px, 1280px, and 1440px.
- Visual captures are review evidence. They do not replace behavior, accessibility, or contrast checks.
- The final gate preserves every workflow completed by Ticket 19 and adds explicit checks for Studio Split shell geometry, full-width content, Quick Create, contextual inspectors, public no-blur rules, and the approved motion allowlist.

## Out of Scope

- New business capabilities unrelated to the approved UI pass.
- A new Team model, chat channels, direct messages, chat files, or Project-linked chat.
- A new backend schema, auth provider, payment provider, or deployment target.
- Production deployment, PR merge, or cloud data changes.
- Runtime Svelte dependencies.
- Copying the discarded UI draft, its teal accent, its card treatment, or its typography.
- Shipping the prototype route or its fixture data as production code.

## Further Notes

- The owner approved Studio Split after one focused prototype revision.
- The old UI examined during the review was a discarded draft. It must not influence the new visual implementation.
- The prototype remains a primary visual reference while production code is rebuilt to normal quality, typing, testing, accessibility, and error-handling standards.
- Local tickets live under this feature directory and must be worked from the unblocked frontier.
