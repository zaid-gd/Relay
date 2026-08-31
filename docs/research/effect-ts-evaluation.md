# Effect evaluation for Frame Desk

Date: 2026-07-25

## Recommendation

**Effect is a plausible fit for a few failure-heavy orchestration modules, but not a good fit for app-wide adoption today.** Run one narrow, reversible pilot around the browser-side project-file upload workflow after the MUI-to-Tailwind/Radix migration has stabilized that area. Keep React rendering, Convex subscriptions, authentication providers, and Convex query/mutation transaction logic in their existing idioms.

Do **not** make Effect part of the MUI redesign itself. The redesign already crosses the root provider stack and a large client component; combining a UI-system migration with a new async runtime and error model would make regressions, bundle changes, and review ownership harder to isolate. A pilot may be prepared on a separate branch while redesign work continues, but it should not be a prerequisite or shared refactor.

This is a conditional “yes to a pilot,” not a recommendation to standardize on Effect.

## Scope and evidence

This evaluation used only the local repository plus first-party Effect, Next.js, and Convex documentation/source.

Relevant local facts:

- The app is Next.js 16.0.4, React 19.2, Convex 1.39.1, Clerk 7.4.2, and TypeScript 5.9.3 ([`package.json`](../../package.json)).
- The root client provider owns Clerk, Convex, the MUI cache/theme, `DataProvider`, Radix tooltip context, and toast rendering ([`Providers`](../../src/app/providers.tsx#L42-L85)). An Effect runtime or service layer added there would sit on an app-wide client boundary.
- The application already has a mixed UI stack. MUI remains in the provider and major legacy surfaces, while Tailwind/Radix primitives exist under [`src/components/ui`](../../src/components/ui) and newer workspace components. The main legacy surface, [`TrackerApp`](../../src/app/tracker-app.tsx#L1), is a large `"use client"` component importing React state, Clerk, Convex hooks, MUI, and application workflows together.
- Convex client access is concentrated in four client modules: [`data-context.tsx`](../../src/lib/data-context.tsx#L1), [`tracker-app.tsx`](../../src/app/tracker-app.tsx#L1), [`client-portal-view.tsx`](../../src/app/client-portal/client-portal-view.tsx#L1), and [`public-profile-page.tsx`](../../src/app/u/[slug]/public-profile-page.tsx#L1).
- `DataProvider` selects local, sample, or cloud ownership ([`DataProvider`](../../src/lib/data-context.tsx#L721-L729)). `CloudDataProvider` uses Convex subscription hooks and Promise-returning mutation handles directly ([hook setup](../../src/lib/data-context.tsx#L864-L888)), then performs a cancellation-aware local-to-cloud initialization state transition with fallback to local data ([cloud initialization](../../src/lib/data-context.tsx#L914-L1005)).
- The clearest orchestration seam is `saveFileVersion`: request an upload URL from Convex, upload the browser `File` with `fetch`, then finalize metadata through another Convex call ([`saveFileVersion`](../../src/app/tracker-app.tsx#L6028-L6105)). The R2 path is backed by Node-runtime Convex actions that create a session, inspect the uploaded object, and finalize through internal queries/mutations ([`convex/r2.ts`](../../convex/r2.ts#L1-L145)).

## What Effect adds

The central type is `Effect<Success, Error, Requirements>`: success, expected failure, and required contextual dependencies are represented in the type, while the value describes work that is run later by the Effect runtime ([Effect type](https://www.effect.website/docs/v3/getting-started/the-effect-type)). Compared with the repository’s current Promise plus `try/catch` style, Effect can add:

- typed, composable expected errors instead of repeatedly narrowing `unknown`;
- explicit service requirements and swappable implementations through `Context`/services/layers ([services](https://www.effect.website/docs/v3/requirements-management/services));
- timeout, interruption, cleanup, bounded concurrency, retry schedules, structured logging, metrics, and tracing ([overview](https://www.effect.website/docs/v3/getting-started/introduction), [timeouts](https://www.effect.website/docs/v3/error-management/timing-out), [concurrency](https://www.effect.website/docs/v3/concurrency/basic-concurrency), [retry](https://www.effect.website/docs/v3/error-management/retrying));
- incremental interop: Promise APIs can enter Effect through `Effect.tryPromise`, and an Effect can leave through `Effect.runPromise` ([creating effects](https://www.effect.website/docs/v3/getting-started/creating-effects), [running effects](https://www.effect.website/docs/v3/getting-started/running-effects)).

For Frame Desk, the highest-value items are typed workflow errors, cancellation/timeout, and testable orchestration. Dependency injection and layers would add little at first because Convex already supplies function contexts on the backend and generated hook callables at the client boundary.

Effect does not remove the need to model product states. Loading, guest/local fallback, authenticated cloud initialization, optimistic updates, and UI error messages remain React/Convex state transitions. It can make an individual async workflow more explicit; it should not become a parallel application state manager.

## Browser and server bundle implications

Next.js treats every import below a `"use client"` entry point as part of the client module graph and recommends keeping those boundaries narrow to reduce browser JavaScript ([Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)). Therefore:

- importing Effect from `providers.tsx`, `data-context.tsx`, or the top of `tracker-app.tsx` would make its runtime reachable from broad client bundles;
- importing it only from an extracted file-transfer module still adds Effect to the browser chunk(s) that use that workflow, but contains the exposure;
- server-only use would not add Effect to browser JavaScript, provided server and client modules remain separated.

Effect’s official import guide says its function-based API is designed for tree shaking, warns that named barrel imports depend on deep-scope analysis, and lists Webpack 5+ as supporting that analysis ([importing Effect](https://www.effect.website/docs/v3/getting-started/importing-effect)). The stable v3 package source is ESM, exposes both the root and per-module entry points, and runs a build step that annotates pure calls ([v3 `effect` package source](https://raw.githubusercontent.com/Effect-TS/effect/v3/packages/effect/package.json)). These are favorable signals, not a substitute for measuring Next.js 16/Turbopack output.

Important uncertainties:

- Effect’s official docs do not provide a reproducible Next.js 16/Turbopack bundle measurement.
- The v3 package manifest does not declare a `sideEffects` field. The actual retained code depends on Next’s bundling and the imports used.
- `effect/Micro` advertises a starting footprint of 5 KB gzipped, but it is explicitly experimental and omits facilities such as `Layer`, `Ref`, `Queue`, and `Deferred` ([Micro docs](https://www.effect.website/docs/v3/micro/new-users)). It should not be the production pilot’s foundation merely to win a bundle benchmark.
- Adding `@effect/platform-node` or `@effect/platform-browser` would introduce additional packages and dependencies. The proposed pilot needs only the stable `effect` core.

The pilot must record route-level client chunk sizes before and after. Use per-module imports such as `effect/Effect` and only the operators the pilot needs. Do not add Effect to the root provider.

## Next.js support

Effect’s first-party site explicitly lists Next.js among supported integrations ([Effect home](https://www.effect.website/)). Core Effect is framework-agnostic and its Promise interop fits Route Handlers, Server Components, Server Functions, and client event handlers.

There is no Next-specific requirement for the proposed pilot:

- client event handlers can call a Promise facade backed internally by `Effect.runPromise`;
- server entry points can run a fully provided Effect at the outer boundary;
- Node-specific Effect packages must stay in server-only modules;
- values passed across a Server Component/client boundary must remain React-serializable ([`use client`](https://nextjs.org/docs/app/api-reference/directives/use-client)).

Next bundles dependencies used by Server Components and Route Handlers by default; `serverExternalPackages` is available for packages that need native Node loading ([package bundling](https://nextjs.org/docs/app/guides/package-bundling), [`serverExternalPackages`](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)). There is no primary-source evidence that stable Effect core needs that exception. Do not change `next.config.mjs` unless a measured build failure demonstrates a need.

Version risk matters: Effect’s official repository says v4 is beta on `main`, while stable v3 is maintained on the `v3` branch and installed with `effect@latest` ([official repository](https://github.com/Effect-TS/effect)). A pilot should pin stable v3 and avoid v4-beta APIs.

## Interaction with Convex

### Client hooks

Keep `useQuery`, `useMutation`, and `useAction` at React component/custom-hook boundaries. Convex queries are cached, reactive subscriptions; they are not one-shot Promises that Effect should replace ([Convex functions](https://docs.convex.dev/functions/overview)). In this repository, `useQuery` values directly drive rendering and initialization, so wrapping them in another runtime would obscure Convex’s ownership without adding reliability.

The functions returned by `useMutation` and `useAction` are Promise-based and can be passed as dependencies to a leaf Effect program. This permits a clean boundary:

1. React/Convex hooks obtain authenticated callables and subscribed data.
2. A plain orchestration module wraps those callables and `fetch` with typed Effect errors.
3. The event handler runs that program as a Promise and maps the terminal result to existing React state.

This preserves Rules of Hooks and Convex reactivity while testing whether Effect improves the genuinely difficult part.

### Convex backend functions

Convex queries and mutations have stronger platform semantics than ordinary async functions: queries are cached/subscribable, mutations are transactions, and actions own external side effects ([function overview](https://docs.convex.dev/functions/overview)). Convex automatically retries internal failures and transaction conflicts for queries/mutations, while actions are not automatically retried because an external side effect may already have happened ([error handling](https://docs.convex.dev/functions/error-handling/), [actions](https://docs.convex.dev/functions/actions)).

Consequences:

- Do not wrap Convex queries or mutations in generic Effect retry schedules. It duplicates platform behavior and may amplify contention.
- Do not blindly retry `createUploadUrl`, `completeUpload`, download signing, or delete actions. The current R2 workflow creates and changes durable session state around external object-storage calls; retries require an explicit idempotency analysis.
- Effect typed errors do not automatically survive the Convex transport. Expected backend failures should still use typed return unions or `ConvexError` data so production clients receive structured information ([application errors](https://docs.convex.dev/functions/error-handling/application-errors)).
- Keep database invariants inside a single Convex mutation rather than splitting them into Effect services. Convex warns that multiple `runQuery`/`runMutation` calls are separate transactions and recommends batching database access ([actions best practices](https://docs.convex.dev/functions/actions)).
- The default Convex runtime supports most browser/worker-compatible npm packages, while Node-only packages must be isolated in `"use node"` action files; every Convex file is bundled for its selected runtime ([runtimes](https://docs.convex.dev/functions/runtimes)). Stable Effect core may be technically bundleable, but that compatibility should be proven with `convex dev/deploy` before backend use.

The initial pilot should therefore stay on the client side and treat Convex callables as injected Promise dependencies. Do not add Effect imports under `convex/` during the pilot.

## Recommended narrow pilot

Pilot only the project-file upload orchestration currently embedded in `saveFileVersion`.

Proposed future change surface (not implemented by this research):

- add an exact, reviewed stable v3 `effect` version rather than a floating tag;
- add one small client-side module, for example `src/lib/file-transfer.ts`;
- modify only the project-file section in `src/app/tracker-app.tsx` to call its Promise facade;
- add focused unit tests for the orchestration module; keep existing Convex tests and browser verification unchanged.

The module should accept ordinary functions rather than importing React hooks:

- `prepareUpload(args): Promise<UploadTarget>`;
- `upload(target, file, signal): Promise<Response>`;
- `finalizeUpload(args): Promise<Id<"projectFiles">>`.

Internally, model distinct expected failures such as preparation, transport/HTTP, timeout/interruption, and finalization. Use interruption to pass an `AbortSignal` to `fetch`—Effect documents cleanup and signal-aware async integration ([async interruption](https://www.effect.website/docs/v3/getting-started/creating-effects)). Return a normal Promise to the component so the pilot does not introduce an Effect runtime/provider into React.

Do not enable retries in the first iteration. If a later retry is proposed, limit it to a demonstrably idempotent transport step and document the idempotency key or invariant.

Pilot acceptance criteria:

- all existing success paths and user-facing messages remain equivalent;
- tests distinguish preparation, upload HTTP, timeout/cancel, and finalization failures;
- cancellation aborts the browser request and always clears busy UI state;
- `pnpm lint`, relevant Convex tests, browser verification, and a production build pass;
- before/after client bundle output is recorded for routes that include `TrackerApp`;
- reviewers judge the extracted workflow easier to read and modify than an equivalent typed Promise implementation.

If the pilot does not clearly improve failure modeling and tests, remove it. The existing upload flow is the strongest local case; failure there is evidence against wider adoption.

## Risks

1. **Learning and review cost.** `Effect.gen`, typed channels, services, layers, and runtime boundaries are a second programming model. The official site itself acknowledges unfamiliar syntax and recommends starting small ([Effect FAQ](https://www.effect.website/)).
2. **Client bundle cost.** Any use below broad client boundaries adds runtime code to browser chunks. Tree shaking is supported by design but must be measured in this exact Next/Turbopack build.
3. **Two error systems.** Convex has transport errors, `ConvexError`, transaction rollback, and production redaction; Effect has typed failures and defects. Without an explicit adapter, errors can become less—not more—clear.
4. **Unsafe retries.** Effect makes retry easy; Convex actions intentionally do not retry side effects automatically. This is the most consequential semantic risk.
5. **Duplicate dependency injection.** Convex contexts, generated APIs, Clerk providers, and React providers already establish ownership boundaries. Adding Effect layers globally would duplicate them.
6. **Migration collision.** The MUI redesign touches the same large client files and root provider stack where broad Effect adoption would land.
7. **Version churn.** Stable v3 is usable, but v4 is currently beta. Avoid designing around beta documentation or assuming an effortless major-version migration.
8. **Overreach into backend transactions.** Replacing direct Convex mutation logic with fine-grained Effect services could split atomic work across calls and weaken consistency.

## Decision

| Question                                      | Decision                                                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Is Effect compatible in principle?            | Yes. Stable v3 interoperates with Promise APIs and supports browser and Node environments.                                    |
| Should it replace Convex hooks?               | No. Preserve Convex’s reactive query and mutation/action hook model.                                                          |
| Should it be used inside Convex now?          | No. First prove value and bundling in an isolated client workflow.                                                            |
| Should it be app-wide infrastructure?         | No. Do not add an Effect provider/runtime to the root.                                                                        |
| Should it be adopted during the MUI redesign? | No. Keep the UI migration and async-model experiment independently measurable.                                                |
| Best pilot                                    | Extract the three-step project-file upload workflow behind a Promise facade with typed failures and cancellation, no retries. |
| Expansion gate                                | Expand only if tests/readability improve materially and measured browser bundle cost is acceptable.                           |

## Remaining uncertainties

- Exact client gzip/chunk delta under Next.js 16/Turbopack; primary sources do not supply a Frame Desk-equivalent measurement.
- Whether a stable v3 Effect import deploys cleanly in Convex’s default runtime; not tested because this task forbids dependency and application changes.
- Whether the upload workflow’s product requirements need resumability or durable retries. If they do, the correct owner may be a Convex mutation-plus-scheduled-action workflow rather than client-side Effect.
- Team willingness to learn and consistently review Effect. The pilot should evaluate maintainability with the actual contributors, not only technical capability.
