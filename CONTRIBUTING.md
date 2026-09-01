# Contributing To Relay

Thank you for helping improve Relay. Keep changes focused, preserve the distinction between shipped and planned features, and include validation appropriate to the affected area.

## Requirements

- Node.js 22+
- pnpm 10.11.1
- A Convex account and development project
- A Clerk application

## Setup

```bash
git clone https://github.com/zaid-gd/Relay.git
cd Relay
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Use your own development credentials in `.env.local`. Configure the Clerk issuer variable in the Convex development deployment as described in `.env.example`.

## Branches

Use a short, descriptive branch name. Suggested prefixes include:

- `feature/` for product work
- `fix/` for bug fixes
- `docs/` for documentation
- `test/` for test coverage

Examples: `feature/portal-expiry`, `fix/file-version-order`, or `docs/setup-guide`.

## Development

Run the Next.js app and Convex development deployment together:

```bash
pnpm dev
```

Keep the change scoped, update tests and documentation when behavior changes, and avoid mixing unrelated formatting or refactors into the same pull request.

## Checks Before A Pull Request

Run the standard project check for every change:

```bash
pnpm check
```

Run the full suite when changing Convex functions or schema, authentication, project files, team permissions, client portals, or application routes:

```bash
pnpm check:full
```

Describe the checks you ran in the pull request. Include clear reproduction and verification steps for user-facing fixes.

## Code Style

- Follow the existing Next.js, React, TypeScript, Material UI, and Convex patterns.
- Keep TypeScript strict and avoid `any` where a precise type is available.
- Read `convex/_generated/ai/guidelines.md` before changing Convex code.
- Derive authorization from the authenticated Convex identity; do not trust client-provided user IDs.
- Keep public portal responses limited to explicit client-safe projections.
- Prefer small, focused changes and add comments only where the behavior is not self-explanatory.

## Secrets And Sensitive Data

- Never commit `.env.local`, API keys, tokens, credentials, production project IDs, client files, or personal data.
- Keep `.env.example` limited to empty or clearly fake placeholders.
- Use development Clerk and Convex projects for local testing.
- Report suspected vulnerabilities privately according to [SECURITY.md](docs/security/SECURITY.md).

## End-to-end tests

The Playwright suite uses Chromium and starts Next.js on `http://localhost:3000`,
or reuses an existing local server on that address.

Install the browser once:

```bash
pnpm exec playwright install chromium
```

Run the suite:

```bash
pnpm test:e2e
```

Open a headed browser:

```bash
pnpm test:e2e:headed
```

The app needs its normal public Clerk and Convex development variables to boot.
The local-mode project test does not create an authenticated session. The
authenticated project files, approvals, and client portal journey additionally
requires the Clerk secret:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CONVEX_URL`

The setup reuses `cutlab-e2e+clerk_test@example.com` in the Clerk development
instance. Override it with `E2E_CLERK_USER_EMAIL` when needed. The cloud test
uses unique project names and removes its project afterward.

Playwright writes failure traces, screenshots, and videos to `test-results/`.
Open the HTML report with:

```bash
pnpm exec playwright show-report
```
