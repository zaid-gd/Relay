# Relay

**A video-workflow workspace for freelance video editors and small post-production teams.**

[![CI](https://github.com/zaid-gd/Relay/actions/workflows/ci.yml/badge.svg)](https://github.com/zaid-gd/Relay/actions/workflows/ci.yml)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React 19](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)
![Convex](https://img.shields.io/badge/Convex-realtime%20backend-ee342f)
![Clerk](https://img.shields.io/badge/Clerk-authentication-6c47ff)

---

## What Relay Does

Freelance editors juggle clients, deadlines, revisions, deliverables, and pay across tools that treat video work like generic task tracking. Relay gives that work one home.

In Relay you manage one Workspace containing your Clients, Projects, workflow stages, deliverables, review feedback, files, earnings, and salary contracts. Every screen answers the questions an editor actually asks: what is due soon, what is waiting on a client, what has been delivered, and what has been paid.

## How Work Is Organized

Relay uses a small set of clear ideas:

| Concept               | Meaning                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Workspace**         | Your studio. Starts solo and becomes a Team workspace when you invite people. Uses one currency.                |
| **Client**            | A durable record with contact details, project history, and archive state. Not free text on a project.          |
| **Project Group**     | An optional group of projects tied to one client, such as a retainer or campaign.                               |
| **Project**           | One tracked video job. The unit for delivery, earnings, and salary progress.                                    |
| **Project Output**    | One promised result inside a project: main video, short cut, thumbnail, captions, document.                     |
| **Media Version**     | One revision of an output. New versions become current; older versions and their comments stay in team history. |
| **Workflow Template** | Reusable stages copied into each new project. Labels are editable; each stage keeps a fixed reporting purpose.  |
| **Client Portal**     | A public, token-scoped link to one project where clients view current outputs and leave comments.               |
| **Salary Plan**       | A contract that counts delivered projects toward a full batch payment.                                          |
| **Salary Batch**      | The recorded full payment created when a plan's required projects reach Delivered.                              |

The default workflow is **Planned → Editing → Client Review → Revisions → Approved → Delivered**. You can rename and reorder stages to match your process. Moving a project to Delivered asks for confirmation, records the real completion time, and updates earnings and salary progress.

## Ways To Start

- **Local Mode** — work without an account. Records stay in your browser. Export and import JSON backups at any time.
- **Sample Workspace** — explore a read-only example before saving anything.
- **Cloud Account** — sign in to sync across devices, share with a small team, publish client portals, and store files.

Local work can be imported once into a new empty cloud account. Existing cloud workspaces never accept an automatic merge.

## Key Features

### Projects And Delivery

- A focused projects index plus a board grouped by stage. Switch between them; Relay remembers your choice.
- Filters and sorting reflected in the URL so views can be shared.
- Each project gets its own page with Overview, Outputs and Versions, Client Review, Files and Links, and Activity.
- Templates prefill stages, starter outputs, relative deadlines, and portal defaults without rewriting live work later.

### Client Review

- Publish a portal link scoped to exactly one project. Protect it with a PIN, set an expiry, close it, or regenerate the link if it leaks.
- Clients see only the current version of each output, chosen public dates, and shared files. Internal notes, assignees, money, and salary data stay private by design.
- Clients add their display name and comment on the version they reviewed. Editors resolve threads; clients can reopen them.
- YouTube and Vimeo links stream from those providers. Other URLs stay ordinary links.

### Money And Salary

- Client projects carry one agreed amount with a Paid or Unpaid state.
- Salary Plans track repeat contract work: deliver N projects, receive one batch payment. Completed batches snapshot their terms and contributing projects so history stays stable.
- Reports use three words consistently: **Earned** is delivered value, **Collected** is delivered and paid value, **Outstanding** is delivered and unpaid value.

### Team

- Invite up to two members on the free plan as Owners, Editors, or Viewers.
- Finance access for editors starts disabled. Solo salary plans remain owner-only.
- Removed members keep their project history; open assignments become unassigned for deliberate reassignment.

### Files

- Upload PDF, plain text, Markdown, JPEG, PNG, and WebP documents up to 20 MB each, 200 MB per workspace in private beta.
- Files stay private behind short-lived signed links. Sharing to a portal and allowing downloads are explicit choices.
- A workspace-wide index helps you find files; all management happens on the owning project's page.

### Dashboard And Reports

- A dashboard led by work needing attention, then active projects by stage, due-soon work, salary progress, and recent activity.
- Work reports for completions, turnaround, and stage delays. Money reports for earned, collected, and outstanding totals. Salary reports for plan progress and batches.
- Period filters with prior-period comparison, plus a read-only calendar with a subscribeable feed.

## Tech Stack

| Layer         | Choice                                               |
| ------------- | ---------------------------------------------------- |
| App framework | Next.js App Router                                   |
| Interface     | React 19, owned Radix-based primitives, Tailwind CSS |
| Language      | TypeScript                                           |
| Auth          | Clerk                                                |
| Backend       | Convex reactive subscriptions                        |
| Tables        | TanStack Table                                       |
| Board         | dnd-kit with a keyboard-accessible stage menu        |
| Tests         | Vitest, convex-test, Playwright                      |
| Hosting       | OpenNext on Cloudflare Workers                       |

## Development

Requires Node.js 22+ and pnpm 10.11.1.

```bash
pnpm install
pnpm dev
```

Useful commands:

```bash
pnpm lint          # TypeScript check
pnpm check         # Lint, build, audit, UI allowlist
pnpm test:e2e      # Playwright journeys
pnpm verify        # Route and source-invariant checks
```

## Cloudflare Deployment

The app deploys to Cloudflare Workers through OpenNext; it is not a static upload.

For a local Worker preview:

```bash
pnpm preview
```

To deploy from a machine authenticated with Wrangler:

```bash
pnpm deploy
```

Cloudflare Workers Builds must run `pnpm exec opennextjs-cloudflare build` as the build command and `pnpm exec wrangler deploy` as the deploy command. Do not run `next build` alone; that skips the Worker bundle.

Create two Workers Builds projects from this repository:

| Worker            | Root directory | Build command                           | Deploy command              |
| ----------------- | -------------- | --------------------------------------- | --------------------------- |
| `relay`     | `/`        | `pnpm exec opennextjs-cloudflare build` | `pnpm exec wrangler deploy` |
| `relay-web` | `/website` | `pnpm exec opennextjs-cloudflare build` | `pnpm exec wrangler deploy` |

Set these in the Worker environment:

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `ACCESS_WALL_PASSWORD` (secret)

Clerk issuer variables belong in the Convex deployment environment, not the Worker. Set `NEXT_PUBLIC_SITE_URL` to the production domain so metadata, canonical links, robots.txt, and sitemap.xml use the deployed address.

## Quality Gates

Changes should pass TypeScript checks, Convex tests, production build verification, and relevant Vitest suites. Playwright journeys cover local persistence and the editor-to-client cloud workflow, including portal access controls and comment resolution. Keyboard-only operation and WCAG 2.2 AA contrast are acceptance requirements, not extras.

Release-blocking journeys include entry-mode selection, local backup and restore, client and project CRUD, stage changes, Delivered confirmation, salary batch formation, portal access controls, media version comments, reports, file quotas, and keyboard operation.

## Current State

Relay is a clean rebuild of the previous CutLab Studio product. The rebuild replaces the old navigation, data model, and screens with the domain described above. See [issue #16](https://github.com/zaid-gd/Relay/issues/16) for the full specification. Legacy cloud records remain untouched during the rebuild.

## Security

Relay uses Clerk authentication, identity-based Convex authorization, server-side permission checks, explicit client-safe portal projections, and short-lived signed file links. Optional analytics are consent-based and strip names, comments, links, tokens, and money amounts. See the [Security Policy](docs/security/SECURITY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch conventions, code expectations, and required checks before opening a pull request.

## License

License: Not specified yet.
