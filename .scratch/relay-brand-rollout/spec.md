# Relay brand rollout

Status: ready-for-agent
Date: 2026-08-29

## Problem Statement

Relay has an approved circular mark and a monochrome brand direction, but the live product does not yet use them as one system. The repository contains three conflicting visual identities: the old CutLab teal system, the marketing site's warm coral system, and the current Relay app's black-and-white system. User-facing copy also mixes Relay, CutLab Studio, and Frame Desk across the marketing site, app surfaces, legal pages, support details, metadata, scripts, and brand assets.

This inconsistency weakens trust and makes routine design work harder. A visitor can move between surfaces that appear to belong to different products. Contributors do not have one production source for the logo, wordmark, app icons, favicons, social images, typography, colours, or imagery. The approved brand-kit board communicates the direction, but it is a raster reference and cannot serve as production logo geometry.

The brand rollout crosses several build sessions. It includes a production asset pack, marketing-site design approval, marketing implementation, app adoption, active legacy-brand cleanup, and end-to-end verification. It must not alter production, live data, product behavior, the Convex schema, authorization, or daily development channels without separate approval.

## Solution

Adopt one Relay identity based on the approved circular mark. Keep the approved SVG as the authoritative mark geometry. Build a small production asset pack from that source, including the horizontal Relay lockup, favicons, app icons, and social image. Use true black, white, and zinc neutrals with Geist Sans and Geist Mono. Treat the brand-kit board as the reference for composition, image direction, and application examples, not as a source from which to trace the logo.

Design three static marketing-site directions that share the same approved identity but test different page structures. Publish them as review artifacts and wait for the product owner's selection. Implement only the selected direction in the marketing package. Then apply the same asset and token contract to the App Shell, authentication, Client Portal, Public Profile, legal, support, metadata, and other public Relay surfaces without redesigning their workflows.

Finish with a repository-wide cleanup of active CutLab and Frame Desk branding. Preserve documented persisted storage keys and historical records when changing them would strand user data or erase useful history. Verify the result through deterministic asset checks, separate marketing and app builds, browser checks at desktop and mobile sizes, and a source scan for active legacy branding.

## User Stories

1. As a first-time visitor, I want every public surface to identify the product as Relay, so that I know I am dealing with one product.
2. As a freelance video editor, I want the marketing site to look like a focused professional tool, so that I can judge whether Relay suits client work.
3. As a visitor, I want to understand that Relay moves an edit from first cut to final handoff, so that the product's purpose is clear.
4. As a visitor, I want the marketing site to use concise product-specific copy, so that I can understand Relay without reading generic software claims.
5. As a visitor, I want the logo, typography, colour, and imagery to remain consistent between marketing and product surfaces, so that navigation into the app feels trustworthy.
6. As a visitor on a phone, I want the marketing site to remain readable and usable, so that I can evaluate Relay without a desktop.
7. As a keyboard user, I want marketing navigation and calls to action to have clear focus and accessible names, so that I can use the site without a pointer.
8. As a user who reduces motion, I want the identity to remain clear without continuous animation, so that the site respects my preference.
9. As a returning user, I want the app icon and favicon to show the same circular mark, so that I can recognize Relay in tabs, bookmarks, and installed-app surfaces.
10. As a user in dark mode, I want the mark to render clearly in white on true black, so that it remains legible without a separate design language.
11. As a user in light mode, I want the mark to render clearly in black on white, so that the identity remains consistent.
12. As a user on a high-density display, I want icons to stay sharp at supported sizes, so that Relay does not look blurred or improvised.
13. As a user with a 16-pixel favicon, I want the negative-space cut to remain distinct, so that the circular mark does not collapse into a solid dot.
14. As a social visitor, I want shared Relay links to use a matching social image and description, so that previews identify the product correctly.
15. As a signed-out visitor, I want authentication pages to use the approved Relay identity, so that sign-in does not appear to belong to another product.
16. As a signed-in user, I want the App Shell to use the approved Relay mark and name, so that the workspace reflects the public identity.
17. As a Client Portal visitor, I want Relay branding to remain clear but restrained, so that the editor's work stays primary.
18. As a Public Profile visitor, I want the profile to use the same Relay identity as the rest of the product, so that the page feels legitimate.
19. As a visitor reading legal or support pages, I want the product name and contact identity to agree, so that I know who operates the service.
20. As a workspace user, I want existing projects, clients, reviews, files, reports, and settings to behave exactly as before, so that a brand change does not disrupt work.
21. As a local user, I want persisted local data to remain available after the rename cleanup, so that branding work does not strand my workspace.
22. As a cloud user, I want branding changes to avoid database migration, so that my stored records are not placed at risk.
23. As a contributor, I want one authoritative SVG mark, so that every export derives from approved geometry.
24. As a contributor, I want a documented horizontal lockup, so that the mark and Relay name use consistent spacing.
25. As a contributor, I want generated raster assets to come from the approved vector source, so that exports do not drift.
26. As a contributor, I want icon dimensions and intended uses documented, so that I do not guess which asset belongs in each context.
27. As a contributor, I want one token contract for brand colours and typography, so that new surfaces match the system.
28. As a contributor, I want the raster brand-kit board identified as visual guidance, so that nobody extracts imprecise logo geometry from it.
29. As a contributor, I want marketing-site alternatives to use the same brand inputs, so that the selection compares layout rather than unrelated identities.
30. As the product owner, I want three distinct static marketing directions before implementation, so that I can choose the page structure without risking the real site.
31. As the product owner, I want the selected direction recorded, so that later implementation sessions have a binding target.
32. As the product owner, I want the marketing site implemented before broad app restyling, so that the public story establishes the identity first.
33. As the product owner, I want the app adoption to begin with shared and public surfaces, so that the rollout stays small and verifiable.
34. As the product owner, I want active CutLab and Frame Desk branding removed after replacement assets are ready, so that cleanup never leaves blank or broken surfaces.
35. As the product owner, I want historical design records kept as history, so that cleanup does not rewrite past decisions.
36. As the product owner, I want legacy storage identifiers kept only where changing them would strand user data, so that compatibility remains deliberate.
37. As a reviewer, I want separate marketing and app verification, so that one package cannot hide a failure in the other.
38. As a reviewer, I want browser evidence at desktop and mobile sizes, so that brand application is judged on real rendered surfaces.
39. As a reviewer, I want a source scan for active legacy names, so that overlooked branding does not ship.
40. As a reviewer, I want every manifest, metadata image, favicon, and icon reference to resolve, so that the brand pack works outside the main page.
41. As an operator, I want production deployment excluded from the rollout work unless separately approved, so that branding cannot alter the live service by accident.
42. As an operator, I want Relay name clearance to remain a launch gate, so that finished branding does not imply legal clearance.

## Implementation Decisions

- Use the approved circular SVG as the sole source of logo geometry. Keep it monochrome and suitable for black-on-white and white-on-black use.
- Create the minimum production asset pack: standalone mark, horizontal Relay lockup, required favicon sizes, required app-icon sizes, and one social image.
- Generate raster sizes deterministically from the vector source. Reuse installed tooling or platform features and do not add an image dependency without a measured need.
- Treat the brand-kit overview as the source for visual direction only. It governs composition, imagery, typography, and system character but cannot replace the production SVG or lockup.
- Use true black `#000000`, white `#FFFFFF`, and zinc `#71717A` as the brand palette. Additional neutral values may support accessible borders and muted text, but no fixed accent colour is introduced.
- Use Geist Sans for product and marketing typography. Use Geist Mono only for small technical labels, metadata, and details that benefit from fixed-width alignment.
- Use the brand line "From first cut to final handoff." as the short public expression of Relay's scope. Longer marketing copy must remain product-specific and concise.
- Preserve the existing monochrome app direction. The brand rollout refines identity and shared surfaces; it does not reopen the approved Workspace layout or product interaction model.
- Create three static marketing-site directions from the same content, logo, palette, typography, viewport assumptions, and product constraints. Each direction must differ in structure rather than colour alone.
- Publish the marketing directions as review artifacts outside production code. Implement only the product owner's recorded selection.
- Treat the marketing package as an independent build target during verification. Do not change repository workspace topology unless implementation proves that the current separation blocks reliable builds.
- Replace CutLab Studio marketing copy, metadata, domains, contact labels, and assets with Relay equivalents where the replacement value is known. Record missing external values as human-owned launch work rather than inventing them.
- Apply the identity to shared app and public surfaces before changing feature screens. Prefer shared seams so one asset or lockup replacement reaches every caller.
- Keep Client Portal branding restrained and preserve all current portal access, review, and delivery behavior.
- Keep Public Profile, legal, contact, accessibility, authentication, error, and not-found behavior unchanged apart from identity and approved copy.
- Preserve documented local-storage keys and other persisted compatibility identifiers when renaming would strand data. Active user-facing labels and component names should use Relay.
- Keep historical documents and screenshots as historical evidence. Active source, current guidance, and user-facing copy must use the approved Relay vocabulary.
- Coordinate with the existing legacy-retirement naming work. This rollout owns active brand application; broad internal compatibility cleanup should not be duplicated across efforts.
- Make no Convex schema, query, mutation, authorization, billing, storage, or data migration changes.
- Do not deploy, upload, publish, or modify production as part of implementation unless the product owner gives separate explicit approval.

## Testing Decisions

- Test external brand behavior and asset contracts. Avoid tests of CSS class names, component structure, private helpers, or raster pixel snapshots that would make harmless refinements expensive.
- Use a deterministic brand-asset verification seam for SVG validity, expected view boxes, required raster dimensions, file loading, manifest references, metadata references, and favicon coverage.
- Extend the existing light-logo browser check rather than creating a parallel logo test system. Cover both dark and light rendering through the same shared brand seam.
- Render the real SVG at large, app-icon, and favicon sizes. Confirm that the negative-space cut remains visible at 16 pixels.
- Use the marketing homepage as the primary marketing test seam. Verify the selected structure, Relay mark and wordmark, brand line, navigation, primary call to action, focus order, reduced-motion behavior, and responsive layout.
- Run marketing browser checks at desktop and mobile viewports. Use visual evidence for layout review and semantic assertions for stable behavior.
- Use the shared App Shell as the primary authenticated-app brand seam. Verify that the correct asset loads and the visible product name is Relay.
- Use a small secondary browser set for authentication, Client Portal, Public Profile, legal, contact, accessibility, error, and not-found surfaces. Verify identity and links without duplicating product behavior tests.
- Use a repository source scan for active `CutLab`, `FrameDesk`, and `Frame Desk` product branding. Allow only documented persisted keys, historical records, and explicit compatibility notes.
- Verify the app and marketing package independently with their native typecheck and production build commands.
- Verify all asset and route references against real files. A metadata object passing typecheck is insufficient if its image does not load.
- Check keyboard focus, accessible names, landmark order, text contrast, reduced motion, and 200 percent text resizing on the selected marketing direction and shared public surfaces.
- Keep existing product, Convex, authorization, file, review, salary, and reporting tests as regression coverage. No new backend behavior test is required because this spec changes no backend behavior.
- The main prior art is the existing light-logo browser verification, Relay source contract verification, browser smoke verification, and current build scripts.
- Release verification fails if any required asset is missing, the logo collapses at favicon size, marketing or app builds fail, active public surfaces display a legacy product name, or the selected marketing layout breaks at its supported viewports.

## Out of Scope

- Redesigning Workspace navigation, Dashboard structure, Project workflows, review behavior, Client Portal permissions, Public Profile content, Reports, Files, Calendar, Team access, or Settings behavior.
- Changing the domain model, Convex schema, stored records, authentication, authorization, storage, billing, or subscription behavior.
- Migrating, deleting, or rewriting cloud data.
- Removing persisted compatibility keys that protect existing local data.
- Rewriting historical research, prior specs, archived screenshots, or completed decision records to use current branding.
- Adding a fixed accent colour, gradients, glow, glass effects, decorative card systems, or continuous logo animation.
- Creating custom fonts or purchasing a commercial typeface.
- Custom domains, email provisioning, social-account setup, app-store submission, trademark work, or formal Relay name clearance.
- Production deployment, DNS changes, live-database access, or changes to daily development and preview channels.
- Final public pricing, launch campaign production, analytics changes, or paid acquisition assets.

## Further Notes

- The approved brand sources already exist: the circular vector mark, the logo brief, and the brand-kit overview board. The vector mark is authoritative when the board and SVG differ.
- The existing full-product rebuild chose the Studio Split monochrome Workspace direction. This brand rollout keeps that app direction and supplies the missing production identity and public-site application.
- The current marketing package still presents CutLab Studio and uses a separate warm coral system. It requires a selected static Relay mock before implementation.
- The current app already uses Geist and a true-black dark canvas in many shared surfaces. Reuse those foundations instead of introducing a second token layer.
- An existing legacy-retirement ticket covers broad CutLab and Frame Desk compatibility cleanup. Reconcile overlap before implementation so active branding is replaced once and persisted identifiers remain safe.
- Formal Relay name clearance remains required before public launch. Local design and implementation may continue, but this spec does not authorize publishing.
