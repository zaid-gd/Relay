# 18 — Protect privacy and measure the private beta

**What to build:** Give users control over optional product analytics and measure the agreed private-beta outcomes through one privacy-safe boundary. Core work must remain usable with analytics off, while essential security and error logs stay separate and omit sensitive work data. Commit this slice to the shared rebuild branch; do not open a separate pull request or deploy it.

**Blocked by:** 17 — Manage Workspace settings and Team access.

**Status:** resolved

- [x] Local Mode asks for consent before optional analytics, signed-in users can opt out, and core behavior works when analytics are declined or disabled.
- [x] The shared telemetry boundary strips Client names, Project names, Comments, file names, links, portal tokens, and money amounts from analytics and error reports.
- [x] Privacy-safe events cover activation, weekly return use, delivered Projects, Client Portal opens, Comments, Salary Plan and Salary Batch use, and storage consumption.
- [x] Relevant internal Workspace notifications remain available without adding Client email delivery, and redaction tests use representative sensitive values.

## Answer

Added one consent-gated analytics boundary and a separate essential-error channel. Events use allowlisted enums and storage buckets only. Relay sends nothing unless the matching endpoint environment variable is configured, and optional analytics stay off until consent.
