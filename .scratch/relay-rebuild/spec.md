# Relay full product and UI rebuild

Status: ready-for-agent  
Date: 2026-08-14

## Problem Statement

Freelance video editors and small post-production teams need one clear place to manage clients, video projects, reviews, deadlines, files, earnings, and salary batches. The current product contains many of these capabilities, but its navigation, information hierarchy, cards, sections, and project details make daily work hard to scan and make the product feel less polished than it should.

The current implementation also mixes route selection, screen state, permissions, dialogs, and product rules in one large client component. Local, sample, and cloud data behavior share a broad context. Clients are stored mainly as names rather than durable records. Project-template stages do not control the real project workflow. Suggested deliverables are separate from operational project files. Salary batches count delivered projects but do not safely attribute shared team work, and reports use inconsistent meanings for earned, collected, and outstanding money.

The product owner wants a clean replacement rather than another visual pass. The deployed product must remain unchanged while the replacement is built locally. Existing cloud records must remain untouched, but the replacement does not need to migrate or display them. The finished rebuild will ship in one pull request after the full agreed release surface passes its checks.

## Solution

Rebuild the product as Relay, a video-workflow workspace for freelance editors and small post-production teams. Use a clear domain model built around one Workspace, durable Clients, optional Project Groups, Projects, Project Outputs, Media Versions, Reviews, Client Portals, Salary Plans, Salary Batches, Reports, and Team Members.

Treat one Project as one tracked video job and one possible salary count. Let a Project contain several Project Outputs, such as a main video, short cut, thumbnail, captions, or document. Keep each Project Output's Media Version history while exposing only its current version through the Client Portal. Tie Comments to the Media Version that received them.

Replace the current fixed and duplicated status behavior with reusable Workflow Templates. Each visible stage has an editable label and a fixed reporting purpose. A protected Delivered stage records the completion time and drives project earnings and salary progress.

Give users a clear choice between Local Mode, a cloud account, sign-in, and a read-only Sample Workspace. Local Mode keeps solo records in the browser and supports backup export and import. Cloud accounts add sync, Client Portals, file storage, and a small Team. The first paid direction adds larger storage, more seats, and white-labelled Client Portals; pricing and subscription billing will follow private-beta evidence.

Build real Next.js routes with a shared App Shell and feature-owned modules. Keep Convex subscriptions for cloud data, Clerk for identity, the owned Radix-based design system, Tailwind, TanStack Table, Vitest, Playwright, OpenNext, and Cloudflare. Add TanStack Form with Zod after a new-project-form trial and add dnd-kit for the Project board with a non-drag alternative. Do not add TanStack Query, TanStack Router, Redux, Zustand, TanStack Virtual, or another component framework without measured need.

## User Stories

1. As a first-time visitor, I want to understand that Relay manages video-editing work, so that I know whether the product fits me.
2. As a first-time visitor, I want to choose Local Mode, create an account, explore a Sample Workspace, or sign in, so that I can enter Relay in the way that suits me.
3. As a returning user, I want Sign In available below the primary welcome choices, so that the first-run screen stays focused without hiding account access.
4. As a visitor, I want to explore a realistic read-only Sample Workspace, so that I can understand Relay before saving my own work.
5. As a local user, I want to create and manage work without an account, so that I can use Relay without cloud services.
6. As a local user, I want a clear warning that my work stays in this browser, so that I understand the risk of clearing browser storage.
7. As a local user, I want to export a JSON backup, so that I can protect my work.
8. As a local user, I want to import a valid JSON backup, so that I can restore my work.
9. As a local user, I want invalid or incompatible backups rejected with clear guidance, so that a bad file does not corrupt my workspace.
10. As a local user creating an account, I want an import preview with record counts, so that I know what will move to the cloud.
11. As a local user creating an empty cloud account, I want to import my local workspace once, so that I do not have to recreate it.
12. As a user with existing cloud work, I want Relay to refuse an automatic local-data merge, so that my cloud workspace is not overwritten.
13. As a cloud user, I want my clients, projects, comments, settings, salary records, and reports to sync across devices, so that I can work from more than one device.
14. As a cloud user, I want existing records to remain readable if my plan or quota changes, so that a downgrade does not hide my work.
15. As a user, I want one Workspace that starts solo and can become a Team workspace, so that I do not have to move work when I invite people.
16. As a Workspace Owner, I want to set the Workspace name, currency, time zone, and default Workflow Template, so that Relay matches my business.
17. As a Workspace Owner, I want one Workspace currency, so that reports and Salary Batches do not combine incomparable amounts.
18. As a Workspace Owner, I want to invite up to two people on the free plan, so that a small team can test shared work.
19. As a Workspace Owner, I want to assign Owner, Editor, or Viewer access, so that each Team Member receives suitable access.
20. As a Workspace Owner, I want Clients kept outside Team membership, so that client access stays scoped to the Client Portal.
21. As a Workspace Owner, I want to choose each Editor's project, review, portal, and finance permissions, so that access matches their role.
22. As a Workspace Owner, I want finance access disabled for Editors by default, so that private money data is not exposed by accident.
23. As an Editor with finance access, I want to see Reports and Finance and mark client work paid, so that I can help maintain accurate records.
24. As an Editor without finance access, I want finance fields and actions hidden, so that the interface matches my permissions.
25. As an Editor, I want my assigned Projects shown by default, so that I can focus on my own work.
26. As a Workspace Owner, I want an option that lets Editors see all Team Projects, so that teams with open visibility can work that way.
27. As a Viewer, I want read-only access to allowed Workspace data, so that I can inspect work without changing it.
28. As a Workspace Owner, I want to transfer ownership before leaving or deleting my account, so that the Team always has an Owner.
29. As a Workspace Owner, I want a removed Team Member's Projects and Activity preserved, so that the Workspace history remains accurate.
30. As a Workspace Owner, I want removed members' open assignments to become unassigned, so that I can reassign them deliberately.
31. As a Workspace user, I want Clients to be durable records, so that contact and project history do not depend on matching free-text names.
32. As a Workspace user, I want to store a Client's name, company, contact name, email, phone, notes, and archive state, so that I have the context needed for project work.
33. As a Workspace user, I want to see a Client's active Projects, past Projects, Project Groups, outstanding money, and portal links, so that I can understand the relationship in one page.
34. As a Workspace user, I want archived Clients hidden from active views but retained in reports and search when requested, so that old work stays available without adding noise.
35. As a Workspace user, I want an optional Project Group tied to one Client, so that I can group a retainer, campaign, or production run.
36. As a Workspace user, I want Project Group progress, count, and money derived from its Projects, so that I do not maintain duplicate totals.
37. As a Workspace user, I want archived Project Groups retained in historical reports, so that closing a group does not erase its results.
38. As an editor, I want one Project to represent one tracked video job, so that workflow, completion, reports, and Salary Plans count the same unit.
39. As an editor, I want several related video jobs grouped without making them one salary unit, so that batch work remains easy to understand.
40. As a Workspace user, I want to create a Project with a short form, so that starting work is fast.
41. As a Workspace user, I want the new-Project form to ask for name, Client, optional Project Group, Template, due date, and financial type, so that it captures only the first required choices.
42. As a Workspace user, I want saving a new Project to open its full page, so that I can continue setup without using a large dialog.
43. As a Workspace user, I want every Project to have its own URL, so that I can bookmark and share internal links and use browser navigation.
44. As a Workspace user, I want the Project page to show Overview, Outputs and Versions, Client Review, Files and Links, and Activity, so that related work stays together without one long form.
45. As a Workspace user, I want the Project header to keep stage, Client, due date, lead, and assignees visible, so that key context remains clear.
46. As a Project lead, I want one lead and several assigned Editors, so that delivery ownership and contribution are distinct.
47. As a Workspace user, I want a Projects table with name, Client, stage, due date, payment state, and salary marker, so that I can scan active work.
48. As a Team user, I want an assignee column when it is useful, so that shared work can be scanned without cluttering solo use.
49. As a Workspace user, I want to sort and filter Projects, so that I can find the work that matters now.
50. As a Workspace user, I want useful Project filters reflected in the URL, so that I can return to or share the same view.
51. As a Workspace user, I want a Project board grouped by workflow stage, so that I can understand work in progress visually.
52. As a pointer user, I want to drag a Project between stages, so that I can update workflow quickly.
53. As a keyboard or assistive-technology user, I want a normal stage menu that performs the same change as dragging, so that the board is not pointer-only.
54. As a Workspace user, I want Relay to remember whether I prefer the table or board, so that I return to my chosen view.
55. As a Workspace user, I want to archive a Project as the normal removal action, so that completed work leaves active views without losing history.
56. As a Workspace Owner, I want permanent Project deletion behind a clear danger action, so that accidental loss is less likely.
57. As a Workspace Owner, I want Project deletion to explain the effect on files, versions, portal history, and activity, so that I understand the result.
58. As a Workspace user, I want the default workflow to be Planned, Editing, Client Review, Revisions, Approved, and Delivered, so that video work starts with useful stages.
59. As a Workspace Owner, I want to rename and reorder visible workflow labels, so that Relay matches my process.
60. As a Workspace Owner, I want each stage to keep a fixed reporting purpose behind its label, so that reports do not guess from text.
61. As a Workspace Owner, I want every Workflow Template to retain exactly one Delivered stage, so that completion has one clear meaning.
62. As a Workspace Owner, I want to reassign Projects before deleting a used stage, so that active work never moves silently.
63. As a Project lead, I want a confirmation before moving work to Delivered, so that I see the effect on earnings and salary progress.
64. As a Project lead, I want Relay to record the actual delivery time, so that reports do not use the due date as a completion date.
65. As a Project lead, I want reopened work removed from incomplete salary progress, so that progress reflects currently delivered work.
66. As a Workspace Owner, I want completed Salary Batches to remain unchanged when old Projects reopen or are deleted, so that financial history stays stable.
67. As a Workspace Owner, I want to create reusable Workflow Templates, so that common project setups take less time.
68. As a Workspace Owner, I want a Template to define stages, starter Project Outputs, relative deadlines, roles, and portal defaults, so that it captures a repeatable workflow.
69. As a Workspace user, I want a Template copied into each new Project, so that later Template edits do not rewrite live work.
70. As a Workspace user, I want Project Outputs such as main video, short cut, thumbnail, captions, and documents, so that one Project can track its promised results.
71. As an editor, I want Project Outputs to remain separate from Salary Plan counting, so that several files do not create false salary progress.
72. As an editor, I want a Template's starter outputs to become real empty Project Output slots, so that they can receive Media Versions and reviews.
73. As an editor, I want to add a new Media Version to an existing Project Output, so that revision history stays grouped.
74. As an editor, I want the newest Media Version to become current, so that the Client Portal shows the right work.
75. As an editor, I want older Media Versions and their Comments kept in Team-only history, so that review history can be checked later.
76. As an editor, I want unresolved old Comments highlighted after adding a new Media Version, so that requested changes are not forgotten.
77. As a Workspace user, I want Project Outputs to have editor-controlled review states, so that the Workspace can track what has been shared or revised.
78. As a Workspace user, I want only the current Project Output version shown to Clients, so that the portal stays simple.
79. As a Workspace user, I want to attach validated YouTube and Vimeo links, so that videos stream from those providers instead of Relay storage.
80. As a Workspace user, I want unsupported URLs treated as normal links, so that Relay never runs arbitrary embed code.
81. As a Workspace user, I want a Project-specific Client Portal, so that each shared link exposes only one Project.
82. As a Workspace user, I want to open, close, expire, and protect a Client Portal with an optional PIN, so that I control access.
83. As a Workspace user, I want to regenerate a long random portal link, so that I can replace a link that may have leaked.
84. As a Workspace user, I want to preview the Client Portal before sharing it, so that I can verify the client-safe view.
85. As a Workspace user, I want to choose public dates, notes, and Project Outputs, so that internal information never leaks by default.
86. As a Client, I want to see the Project name, public stage, progress, selected dates, and current Project Outputs, so that I know where my work stands.
87. As a Client, I want the portal to work well on a phone, so that I can review a link without opening a desktop computer.
88. As a Client, I want to enter a display name before commenting, so that the editor knows who wrote each note.
89. As a Client, I want Relay to remember my display name in this browser, so that I do not enter it for every Comment.
90. As a Client, I want to comment on the current Media Version, so that my feedback stays attached to the reviewed work.
91. As a Team Member, I want to resolve a Comment thread, so that completed feedback leaves the active queue.
92. As a Client, I want to reopen a resolved Comment thread, so that I can say when a concern remains.
93. As a Team Member, I want closed or expired portals to preserve internal review history, so that access control does not erase the record.
94. As a Client, I want an expired or closed portal to show a clear access message, so that I know to contact the editor.
95. As a Workspace user, I want Client email notifications deferred, so that the first release does not require an email-delivery system.
96. As a solo editor, I want to create a Salary Plan tied to one Client, so that repeat contract work is tracked separately from project prices.
97. As a solo editor, I want a Salary Plan to store its batch count, full amount, start date, notes, and archive state, so that the contract rule is clear.
98. As a solo editor, I want selecting a Salary Plan to set the Project's Client, so that a Project cannot count toward the wrong contract.
99. As a solo editor, I want partial Salary Plan progress without a partial money amount, so that Relay follows full-batch contracts.
100. As a solo editor, I want the final required delivered Project to create a Salary Batch, so that Relay records the full amount at the correct point.
101. As a solo editor, I want a completed Salary Batch to start unpaid and become received when I mark it, so that expected and collected salary remain distinct.
102. As a solo editor, I want each Salary Batch to store the terms and Project IDs used, so that I can explain the calculation.
103. As a solo editor, I want later Salary Plan changes to affect future work only, so that history does not change.
104. As a solo editor, I want to archive a Salary Plan without deleting its progress and batches, so that old contracts remain reportable.
105. As an Editor, I want the Owner's solo Salary Plans hidden even when I have general finance access, so that personal salary stays private.
106. As a Workspace user, I want a normal client Project to store one agreed value and a Paid or Unpaid state, so that simple payment tracking stays simple.
107. As an authorized Workspace user, I want to mark client work paid, so that Collected and Outstanding totals stay accurate.
108. As a Workspace user, I want Reports to define Earned as delivered value, Collected as delivered and paid value, and Outstanding as delivered and unpaid value, so that money labels stay consistent.
109. As a Workspace user, I want a Dashboard led by work needing attention, so that daily actions appear before broad totals.
110. As a Workspace user, I want the Dashboard to show active Projects by stage, due-soon work, Salary Plan progress, work and money summaries, and recent Activity, so that I can understand the Workspace quickly.
111. As a Workspace user, I want Work Reports for completed Projects, output counts, turnaround, and stage delays, so that I can assess throughput.
112. As an authorized Workspace user, I want Money Reports for earned, collected, outstanding, and Client totals, so that I can understand cash status.
113. As a Workspace Owner, I want Salary Reports for plan progress, completed batches, received batches, and unpaid batches, so that I can track contracts.
114. As a report reader, I want month, quarter, year, and custom periods with prior-period comparison, so that trends have context.
115. As a Workspace user, I want a read-only Calendar for project, output, review, and payment dates, so that I can view commitments without accidental drag changes.
116. As a Workspace user, I want a read-only subscribed calendar feed, so that Relay dates can appear in my normal calendar.
117. As a Workspace user, I want a searchable Files index across the Workspace, so that I can find project material without opening every Project.
118. As a Workspace user, I want files added and managed from their Project pages, so that ownership and visibility stay clear.
119. As a free cloud user, I want up to 200 MB of private-beta document and image storage, so that I can test file sharing.
120. As a free cloud user, I want a 20 MB per-file limit, so that lightweight documents and images work without enabling large media storage.
121. As a Workspace user, I want PDF, plain text, Markdown, JPEG, PNG, and WebP uploads, so that common briefs and visual assets work.
122. As a security-conscious user, I want HTML, SVG, scripts, executables, and archives rejected initially, so that risky preview types do not enter the product.
123. As a Workspace user, I want private files opened through short-lived signed links, so that storage URLs are not permanently public.
124. As a Workspace user, I want Client Portal files shared only by an explicit visibility choice, so that private Project files stay private.
125. As a Workspace user, I want an Allow Download setting per shared image, PDF, or text file that starts disabled, so that downloads are deliberate.
126. As a Client, I want to copy visible text, so that I can use information the editor chose to share.
127. As a Client, I want Markdown rendered without raw HTML, so that text is readable without enabling unsafe markup.
128. As a Workspace user, I want all Media Versions counted toward storage use, so that the quota matches actual storage.
129. As a Workspace user, I want archived Project files to keep counting toward storage, so that archive does not act as hidden deletion.
130. As a Workspace user, I want a warning before permanently deleting a file or Media Version, so that I understand the size and history affected.
131. As a Workspace user, I want existing files preserved if Relay approaches its service storage limit, so that capacity pressure does not delete my work.
132. As a Workspace user, I want new uploads blocked before the whole-service limit is reached, so that the service fails safely.
133. As a free cloud user, I want unlimited Clients, Projects, Project Groups, Salary Plans, and external embeds, so that basic record counts do not block use.
134. As a paid user, I want more storage and Team seats, so that Relay can support larger workspaces.
135. As a paid user, I want to add my logo, business name, and portal accent colour, so that the Client Portal reflects my studio.
136. As a paid user, I want to remove Powered by Relay, so that the Client Portal can be white labelled.
137. As a downgraded user above the free quota, I want existing work readable and a clear grace period, so that I can remove excess storage deliberately.
138. As a user, I want the App Shell to provide a compact left sidebar, top bar, account controls, and one clear content frame, so that navigation stays stable.
139. As a desktop user, I want to collapse the sidebar to icons, so that dense work has more room.
140. As a Workspace user, I want global search across Clients, Projects, Project Groups, Project Outputs, and common actions, so that navigation is fast.
141. As a user, I want light mode designed first and a quiet dark mode, so that both themes remain readable without a glowing dashboard style.
142. As a user, I want strong typography, thin borders, flat sections, and few card containers, so that the interface feels clear and professional.
143. As a user, I want normal text kept at readable sizes, so that density does not depend on tiny type.
144. As a user, I want colour used with text and shape rather than as the only state cue, so that approval, payment, warning, and error states remain clear.
145. As a keyboard user, I want visible focus and full access to navigation, forms, tables, menus, portals, and board actions, so that Relay does not require a pointer.
146. As a user who reduces motion, I want nonessential animation removed, so that the interface respects my preference.
147. As a user at high zoom, I want the interface to reflow without hiding actions, so that Relay remains usable.
148. As a user of current Chrome, Edge, Firefox, or Safari, I want the main flows to work, so that browser choice does not block me.
149. As a privacy-conscious local user, I want to choose whether optional product analytics are sent, so that local use does not imply tracking.
150. As a signed-in user, I want to disable optional product analytics, so that I control product measurement.
151. As a user, I want analytics and error logs to exclude names, comments, links, tokens, file names, and money, so that work data is not copied into telemetry.
152. As the product owner, I want private-beta analytics for activation, weekly return use, delivered Projects, portal opens, Comments, Salary Plan use, and storage, so that plan and retention decisions use evidence.
153. As the product owner, I want the deployed app unchanged during local development, so that the live product remains available until the replacement is ready.
154. As the product owner, I want the finished replacement delivered through one pull request with small commits, so that the full cutover is reviewable.
155. As the product owner, I want old cloud records left untouched, so that the rebuild does not destroy current data even though it starts fresh.
156. As the product owner, I want three visual directions for the Dashboard and Project page before UI coding, so that the final interface has an approved target.
157. As the product owner, I want every launch-blocking journey tested before deployment, so that the clean replacement does not lose required behavior.

## Implementation Decisions

- Rename the product and user-facing copy to Relay. Remove legacy CutLab and Frame Desk product copy as part of the replacement. Update the domain glossary before implementation so that the accepted product name and new domain terms are authoritative. Record that the Relay name has a known close market conflict and still requires formal clearance before public launch.
- Keep one Workspace per account in the first release. A Workspace begins solo and becomes a Team workspace when the Owner invites members. Do not add workspace switching, several owned workspaces, or simultaneous ownership and membership across workspaces.
- Replace free-text Client identity with durable Client records. Project references use a Client identifier rather than a copied Client name.
- Add optional Project Groups. Every Project Group belongs to exactly one Client. A Project may belong to at most one Project Group.
- Keep Project as the unit of tracked work, delivery, earnings, and Salary Plan progress. One Project normally represents one video job.
- Define Project Output as a new domain term for one promised result inside a Project. Update the glossary so that Project Output replaces the old static deliverable-target and task-like template concepts.
- Keep Media Version as the term for one linked or uploaded version of a Project Output. A Project Output has one current Media Version and retained historical versions.
- Tie each Comment to the Media Version it reviews. Keep unresolved old-version Comments visible to internal users after a newer Media Version becomes current.
- Replace generic tasks, subtasks, and template checklists. Do not migrate or expose their old records in the replacement.
- Implement Workflow Templates as reusable copies. A Template can define stages, Project Outputs, relative deadlines, roles, and Client Portal defaults. Editing a Template never mutates existing Projects.
- Give every workflow stage a stable purpose and an editable label. The default purposes and labels are Planned, Editing, Client Review, Revisions, Approved, and Delivered. Cancelled remains outside the normal ordered path.
- Require exactly one Delivered-purpose stage. Block removal of a stage until its Projects are reassigned.
- Require confirmation before a Project enters Delivered. The operation records `completedAt` and shows its earnings or Salary Plan effect.
- Remove a reopened Project from incomplete Salary Plan progress. Never rewrite a completed Salary Batch automatically; use correction notes for later discrepancies.
- Add named Salary Plans for solo users. Each Salary Plan belongs to one Client and stores required Project count, full batch amount, start date, notes, and active or archived state.
- Assigning a Salary Plan fixes the Project's Client and disables an independent Project amount.
- Create a Salary Batch only when the required number of Projects has reached Delivered. Partial progress records a count but no partial batch amount.
- Snapshot Salary Plan terms and contributing Project identifiers into each completed Salary Batch. Later Salary Plan changes affect future work only.
- Keep the client Project money model intentionally small: agreed amount, Paid or Unpaid, and payment timestamp. Authorized Owners and Editors may mark a Project paid.
- Use Earned, Collected, and Outstanding with one definition across Dashboard, Projects, Clients, and Reports. Earned is delivered value, Collected is delivered and paid value, and Outstanding is delivered and unpaid value.
- Use one Workspace currency. Do not aggregate several currencies or add exchange-rate behavior.
- Use Owner, Editor, and Viewer as internal Team Member roles. Clients use Client Portals and are not Team Members.
- Let the Owner configure invited-member permissions. Finance access starts disabled. An Editor with finance access sees Reports and Finance and may mark Project payment state. Solo Salary Plans remain Owner-only.
- Keep one Project lead and any number of assigned Editors. Preserve Projects and Activity when a Team Member is removed.
- Build real routes for each main page and Project detail page. Do not use a large route-switching client component or a large Project dialog as the application frame.
- Use a collapsible desktop App Shell with Dashboard, Projects, Clients, Calendar, Files, Reports, Team, Settings, account controls, and global search.
- Make the Projects index available as a TanStack Table and a dnd-kit board. Provide an equal keyboard-accessible stage menu and remember the user's selected view.
- Put useful Project filters and sorting state in the URL where it benefits return and sharing.
- Build the Project page with Overview, Outputs and Versions, Client Review, Files and Links, and Activity sections. Keep key metadata in the page header.
- Keep Calendar read-only and expose a read-only subscribed calendar feed. Do not allow calendar dragging or event writes.
- Make Files a Workspace-wide index while keeping create, update, version, visibility, and deletion actions inside the owning Project.
- Keep each Client Portal scoped to one Project. Access uses a long random token, optional PIN, manual enable or disable, and optional whole-portal expiry.
- Build a server-side client-safe portal projection. Never depend on hidden UI alone to protect internal notes, assignees, money, salary, private dates, or unshared files.
- Accept validated YouTube and Vimeo URLs and persist normalized provider metadata. Do not accept arbitrary embed code. Treat other HTTP or HTTPS URLs as ordinary external links.
- Keep client-side approval and a formal Request Changes operation outside the first release. The first release includes viewing, version Comments, Comment resolution and reopening, editor-controlled output state, PIN, expiry, closure, and portal preview.
- Ask portal visitors for a self-entered display name before commenting and remember it in browser storage. Do not treat this identity as verified authentication.
- Do not send Client email notifications in the first release. Keep internal notifications for relevant Workspace events.
- Keep Local Mode, Sample Workspace, and Convex-backed cloud mode behind capability-specific ports. Local Mode supports solo records and external links. Team behavior, public Client Portals, and cross-device access require an account.
- Add versioned JSON export and import for Local Mode. Show import counts before a one-time import into an empty cloud account. Do not implement local-to-existing-cloud merging.
- Add new Convex tables and functions for the replacement domain rather than reusing old records with new meanings. Leave old tables and records untouched until a later cleanup receives separate approval.
- Keep Convex authorization server-side. Derive identity from the authenticated session rather than user-provided identifiers. Keep public portal operations limited to the token-scoped client-safe interface.
- Keep cloud queries reactive. Do not add TanStack Query or convert Convex subscriptions into request-response fetching.
- Preserve the accepted architecture: pure domain modules, capability ports, local/sample/Convex/in-memory adapters, route-facing application controllers, and presentation-only screens.
- Make route-facing controllers return display-ready models and semantic actions. Screens must not import Convex, Clerk, persistence functions, generated backend references, or raw transport errors.
- Keep the design-system seam separate from product and data code. Owned primitives and patterns may expose semantic visual variants but must not know Convex documents or feature mutations.
- Keep Next.js App Router, React, TypeScript, Convex, Clerk, Tailwind, owned Radix-based primitives, TanStack Table, Vitest, Playwright, OpenNext, and Cloudflare.
- Trial TanStack Form with Zod on the new-Project form. If the trial succeeds, use one bound form system for Clients, Templates, Project Outputs, Salary Plans, and Client Portal settings. Keep Convex validators authoritative on the server.
- Add dnd-kit only with the Project board. Include pointer and keyboard behavior, announcements, and a normal stage menu.
- Do not add TanStack Router, TanStack Query, Redux, Zustand, TanStack Virtual, or another component framework without a measured gap.
- Use the visual direction recorded in the confirmed product brief: light mode first, quiet dark mode, strong type, thin borders, flat sections, few cards, readable 14–16 px body text, restrained shadows, limited motion, and indigo actions.
- Use `#4F46E5` for the main light-theme action colour, `#4338CA` for hover or pressed state, and `#A5B4FC` for dark-theme links and selected text. Validate all semantic pairs against WCAG 2.2 AA and never use colour as the only state cue.
- Create exactly three visual directions for the Dashboard and Project page before UI implementation. The product owner must choose a direction and reattach current screenshots and references before the build follows that target.
- Keep the main Workspace desktop-first, then support tablet. Make the Client Portal responsive on mobile from its first release.
- Allow cloud uploads of PDF, plain text, Markdown, JPEG, PNG, and WebP. Reject HTML, SVG, scripts, executables, and archives initially. Direct video and audio upload remains deferred.
- Enforce 20 MB per file and 200 MB total per free Workspace during private beta. Count all retained Media Versions toward quota. Review the public allowance after measuring use.
- Keep files private and issue short-lived signed links. Give each shared image, PDF, or text file an Allow Download setting that defaults off. Render Markdown without raw HTML.
- Keep archived files and Media Versions in storage and count them toward quota. Permanent deletion must explain size and affected history.
- Add a whole-service storage guard below the available Cloudflare capacity. When the guard trips, block new uploads and keep existing files available. Never delete files automatically to recover capacity.
- Give free cloud users sync, Relay-branded Client Portals, Reports, one Owner plus two invited members, and the beta file allowance. Do not limit Clients, Projects, Project Groups, Salary Plans, or external YouTube and Vimeo links for pricing.
- Plan paid benefits around more storage, more Team seats, custom portal logo, business name, accent colour, and optional removal of Powered by Relay. Defer custom domains and public pricing until beta evidence exists.
- Keep the private beta free. Add Relay subscription billing after the rebuilt product and storage controls work and before a public paid launch.
- If a future downgrade exceeds a free limit, keep existing work readable, block new limited actions, explain what exceeds the plan, and provide a grace period. Do not delete data without warning.
- Put optional product analytics behind consent in Local Mode and an opt-out for signed-in users. Keep essential security and error logs separate. A shared telemetry boundary must strip Client names, Project names, Comments, file names, links, portal tokens, and money amounts.
- Track private-beta activation, weekly return use, delivered Projects, Client Portal opens, Comments, Salary Plan and Salary Batch use, and storage consumption.
- Build in this order: design system and App Shell; Clients; Projects, Project Groups, workflows, and Templates; Project Outputs, Media Versions, and Client Portals; Salary Plans and payment tracking; Dashboard and Reports; Calendar, Files, and Team; then removal of old UI.
- Keep the deployed app unchanged during local development. Do not create a private legacy route and do not deploy partial replacement screens.
- Deliver the finished replacement in one pull request with small, reviewable commits. Remove old presentation code only after the new routes cover every release-blocking flow.
- Keep old cloud records and tables after cutover. Any data deletion or migration is a later, separately approved operation.

## Testing Decisions

- Test external product behavior, not component structure, hook choice, database row shape, CSS classes, or private helper calls.
- Use the route-facing feature controller as the primary test seam. Exercise each controller through its display-ready model and semantic actions while using an in-memory adapter that implements the same capability port as local, sample, and Convex adapters.
- Keep the number of controller seams aligned with product capabilities rather than pages. The main capability families are Workspace entry and import, Clients, Projects and workflows, Project Outputs and Reviews, Salary and Finance, Files and storage, Reports, and Team access.
- Test pure domain rules directly where the controller would otherwise hide important edge cases. These include workflow-stage invariants, Delivered transitions, money terminology, Salary Batch formation and immutability, storage quotas, Client Portal access state, URL normalization, permissions, and analytics redaction.
- Test local, sample, Convex, and in-memory adapters against shared behavioral contracts where the modes must agree. Do not duplicate every controller test for every adapter.
- Use Convex tests for server-side authentication, authorization, transactional Project delivery, Salary Batch creation, Client Portal projection, Comment writes, quota enforcement, signed-file access, and destructive operations.
- Keep public Client Portal tests focused on the returned client-safe contract. Assert that internal notes, assignees, money, Salary Plans, private dates, unshared files, and old Media Versions never appear.
- Test storage behavior using metadata and provider boundaries rather than uploading large media fixtures. Cover allowed types, rejected types, per-file size, Workspace quota, version accounting, archive behavior, signed access, download flags, and service-capacity refusal.
- Use component or page-system render tests only for shared interface contracts such as labelled fields, empty states, loading states, error states, focus behavior, and semantic table or page structure. Do not snapshot entire pages.
- Use a small Playwright suite as the secondary seam for stories that cross routes, browser persistence, authentication, public tokens, or separate editor and Client contexts.
- Extend the existing local-project browser prior art with one Local Mode journey: choose Local Mode, create a Client and Project, change stage, reload, verify persistence, export a backup, clear or isolate data, import the backup, and verify restored behavior.
- Extend the existing authenticated cloud-workflow browser prior art with one cloud journey: create or sign in to an empty Workspace, create a Client and Project, attach a current YouTube or Vimeo Media Version, publish a PIN-protected Client Portal, open it in a separate Client context, comment, resolve and reopen the Comment, close or expire the portal, and confirm public access stops while internal history remains.
- Add one Salary and Finance browser journey only if controller and Convex tests cannot prove the full user story. Prefer controller coverage for Delivered confirmation, partial progress, completed Salary Batch creation, immutable history, and Paid or Unpaid reporting.
- Add one Team permission browser journey only for navigation and action visibility. Use controller and Convex tests for the permission matrix itself.
- Verify the Project board with both drag-and-drop and the normal stage menu. Keyboard behavior and announcements are acceptance requirements, not optional visual checks.
- Verify Local Mode with analytics declined and cloud mode with optional analytics disabled. Assert that core behavior still works.
- Verify telemetry through a single redaction seam. Use representative sensitive values and assert that no forbidden work data reaches the analytics or error-report boundary.
- Run existing Convex, provider/access, page-system, local Playwright, and cloud Playwright suites as regression coverage. Existing team payout tests, project-file tests, local project persistence tests, authenticated editor-to-client tests, and Workspace Page render tests are the main prior art.
- Test current Chrome and Edge through Chromium, and smoke-test the release-blocking journeys in Firefox and WebKit/Safari-compatible automation.
- Run keyboard-only checks for welcome choices, App Shell navigation, global search, forms, Project table, Project board stage menu, Project tabs, file actions, Client Portal controls, Comments, Reports, and Team permissions.
- Run accessibility checks for landmarks, heading order, accessible names, field errors, status announcements, focus restoration, reduced motion, 200% text resizing, and WCAG 2.2 AA contrast.
- Require production typecheck and build, relevant Vitest suites, Convex tests, Playwright journeys, and targeted light, dark, desktop, tablet, and mobile portal visual checks before cutover.
- Release is blocked if any of these external journeys fail: entry-mode selection, Local Mode backup, local-to-empty-cloud import, Client CRUD, Project CRUD, Project Group and Template use, stage changes, Delivered confirmation, Salary Plan progress and Salary Batch completion, client payment updates, Client Portal access controls, YouTube or Vimeo viewing, Media Version Comments, Reports, Team permissions, file quota and download behavior, or keyboard operation.

## Out of Scope

- Client-side approval of a Project Output.
- A formal Request Changes action.
- Time-coded Comments.
- Client email notifications.
- Direct video or audio upload, transcoding, playback, retention, or streaming.
- Team Member Salary Plans and Team salary contracts.
- Client payment collection.
- Persisted invoices, partial payments, tax, payroll, accounting, or exchange-rate behavior.
- Relay subscription billing during the private beta.
- Public prices and final public-plan quotas before beta evidence.
- Custom Client Portal domains.
- Google Drive, Dropbox, Frame.io, Slack, or other connected-account integrations.
- Calendar editing, meeting management, or calendar drag-and-drop.
- Several Workspaces, Workspace switching, or joining another Workspace while owning one.
- Sharing a personal Workspace separately from converting it into a Team Workspace.
- Full mobile support for the internal Workspace; the Client Portal remains mobile-ready.
- Generic tasks, subtasks, or template checklists.
- A sales pipeline or broad customer relationship management system.
- Migrating, converting, displaying, or deleting existing cloud records.
- A private legacy route or partial production rollout.
- TanStack Query, TanStack Router, Redux, Zustand, TanStack Virtual, or another component framework without later evidence.
- Automatic file deletion when a portal expires, a Project archives, a plan downgrades, or service capacity is low.
- Legal clearance of the Relay name.

## Further Notes

- The repository glossary currently names the product Frame Desk and defines Work Item as a unit inside a Project. The first implementation step must update the glossary to Relay and define Project Group, Project Output, Workflow Template, Salary Plan, and Salary Batch before those terms appear in code or UI.
- The existing architecture decision already requires a design-system seam, route-facing application controllers, capability ports, and local, sample, Convex, and in-memory adapters. This spec extends that accepted direction rather than replacing it.
- The current codebase already has TanStack Table, owned Radix-based primitives, Local Mode, Sample Workspace, Convex subscriptions, Clerk identity, project files and versions, Client Portals, Salary Batches, Vitest, and Playwright. Reuse proven behavior through the accepted seams while replacing current presentation and weak domain boundaries.
- The current Project and Salary implementation confirms that one delivered Project is the salary-counted unit. The replacement keeps that concept and makes it explicit.
- The product owner accepted the close naming conflict with another creative-workflow product that visibly uses Relay. Preserve that decision in project records and complete legal, trademark, domain, and app-store checks before public launch.
- The 200 MB free Workspace allowance is a private-beta choice against an initial 10 GB service allocation. At full use it supports only about 50 free Workspaces, so the public allowance must be reviewed from measured storage use.
- Visual implementation is gated by a Product Design step: obtain the current screenshots and references, produce exactly three Dashboard and Project-page directions, and get the product owner's selection before coding the new interface.
- The confirmed source brief remains the human-readable product record. This tracker spec translates it into implementation and testing decisions without authorizing deletion or production deployment.

## Comments

The product owner confirmed the primary controller seam and the small secondary Playwright seam on 2026-08-14.
