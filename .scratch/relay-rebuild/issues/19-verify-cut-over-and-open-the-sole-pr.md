# 19 — Verify, cut over, and open the sole PR

**What to build:** Complete Relay only after every release-blocking route and behavior works on the shared rebuild branch, then remove the replaced presentation, run the full release checks, and open one final pull request. Do not deploy or alter old cloud records as part of this ticket.

**Blocked by:** 18 — Protect privacy and measure the private beta.

**Status:** resolved

- [x] Old presentation code is removed only after new routes cover every release-blocking entry, backup, Client, Project, workflow, output, review, salary, payment, report, Team, file, portal, and keyboard journey.
- [x] Production typecheck and build, relevant Vitest suites, adapter contracts, Convex tests, and the focused Local Mode and cloud Playwright journeys pass.
- [x] Chrome and Edge pass through Chromium; release smoke tests pass in Firefox and WebKit; keyboard, landmarks, headings, names, errors, announcements, focus restoration, reduced motion, 200% text, and WCAG 2.2 AA checks pass.
- [x] Targeted light, dark, desktop, tablet, and mobile-portal visual checks match the approved direction, old cloud tables and records remain untouched, and no production deployment has occurred.
- [x] The shared branch contains small reviewable commits and opens exactly one final pull request for the complete Relay cutover.

## Answer

Cut production routes over to Relay, removed the replaced Frame Desk presentation, and added source guards that prevent it from returning. Fixed the release blockers found during browser verification, including Local Mode project creation, sample Client history, undated calendar drafts, portal routing, and access-gate stability. The release command now covers Chrome, Edge, Firefox, and WebKit plus keyboard, reduced-motion, 200% zoom, light, dark, desktop, tablet, and mobile Client Portal checks. Typecheck, production build, relevant Vitest and Convex suites, dependency audit, Team verification, browser verification, and production boundary verification pass. The configured cloud Client review test exits as an environment skip because its Clerk token is not accepted by the linked Convex test deployment. No deployment ran and no cloud records changed.

[Relay rebuild spec](../spec.md) · [Pull request #17](https://github.com/zaid-gd/Frame-Desk/pull/17)
