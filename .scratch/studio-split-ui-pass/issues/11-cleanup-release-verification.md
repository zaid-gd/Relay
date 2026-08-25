# 11 - Cleanup and release verification

**What to build:** Complete the Studio Split pass by removing replaced presentation code, closing visual drift, and proving that every Ticket 19 workflow still works before PR merge or publishing.

**Blocked by:** 05 - Clients; 06 - Calendar and Quick Search; 08 - Reports and Salary Batches; 09 - Team, Team Chat, Settings, and onboarding; 10 - Public profiles and Client Portal.

**Status:** ready-for-agent

- [ ] Every production route uses the approved Studio Split system or the approved minimal public system.
- [ ] Replaced tokens, components, styles, route-specific visual constants, and the discarded UI draft are removed only after no production consumer remains.
- [ ] The prototype does not ship as production code; the approved design decision and review evidence remain traceable.
- [ ] All existing routes, aliases, Local Workspace, sample mode, cloud mode, permissions, backups, imports, creation, Projects, Clients, workflow, Outputs, Media, Reviews, money, reports, Team, files, portals, and keyboard journeys pass.
- [ ] Studio Split visual checks cover 320px, 390px, 768px, 1024px, 1280px, and 1440px in light, dark, and reduced-motion modes where applicable.
- [ ] Keyboard, focus restoration, landmarks, headings, accessible names, status, errors, announcements, contrast, 200 percent text, and public no-blur rules have no release-blocking failures.
- [ ] The selected-navigation pass, Thinking Orbs, Liquid Gooey, Review edge sweep, Team Chat composer, and their reduced-motion replacements match the allowlist without continuous repainting.
- [ ] Typecheck, focused component suites, Relay tests, route verification, UI interaction verification, cross-browser journeys, production verification, production build, and dependency audit pass.
- [ ] PR merge, publishing, deployment, and cloud data changes remain blocked until the owner reviews the final evidence.
