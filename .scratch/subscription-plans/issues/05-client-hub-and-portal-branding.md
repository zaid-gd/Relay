# 05: Deliver the Creator client experience

**What to build:** Give Creator Workspaces signed-in Client Contacts, a Client Hub containing only explicitly published Projects for their Client, and safe custom branding on project-specific Client Portals.

**Blocked by:** 01: Establish Workspace subscription authority. 02: Launch Creator checkout and trial. 03: Enforce Creator feature access.

**Status:** in-progress

- [x] An Owner can associate multiple authenticated Client Contacts with one Client.
- [x] Client Contacts authenticate through Clerk but are not Team Members.
- [x] An Owner can explicitly publish and unpublish a Project to its Client Hub.
- [x] A Client Contact sees only Projects published to the Client records they can access.
- [x] Client Hub access cannot expose another Client, unpublished Project, internal note, hidden output, or Team membership data.
- [x] The existing token-based Client Portal remains Project-specific and works independently of Client Hub access.
- [x] Creator and Team Owners can configure the approved portal brand fields; Free uses standard Relay presentation.
- [x] Branding cannot alter portal authorization, selected content, expiry, or download rules.
- [x] Tests use at least two Clients, multiple contacts, published and unpublished Projects, and unrelated users.
- [ ] Type checking, portal tests, and focused browser checks pass.

Convex coverage passes. A focused signed-in browser check remains.
