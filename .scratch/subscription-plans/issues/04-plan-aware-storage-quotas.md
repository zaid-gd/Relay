# 04: Enforce accurate Workspace storage quotas

**What to build:** Replace the fixed 200 MB Project scan with exact Workspace storage accounting. Use decimal gigabytes: `FREE_STORAGE_QUOTA_BYTES = 0`, `CREATOR_STORAGE_QUOTA_BYTES = 5_000_000_000`, and `TEAM_BASE_STORAGE_QUOTA_BYTES = 15_000_000_000`. Free cannot start hosted uploads, Creator receives 5 GB, and Team receives 15 GB before Editor Seat and Storage Add-on increases. Use these constants in the entitlement contract, quota checks, tests, and UI copy.

**Blocked by:** 01: Establish Workspace subscription authority.

**Status:** ready-for-agent

- [ ] Convex keeps an exact retained-byte total per Workspace instead of scanning all Projects during upload.
- [ ] The quota is zero hosted bytes for Free, 5 GB for Creator, and 15 GB for base Team.
- [ ] Upload capacity is reserved before data transfer and committed with stored file metadata.
- [ ] Failed, abandoned, and expired uploads release reservations safely.
- [ ] Archived files count until permanent deletion.
- [ ] Existing files remain readable above quota while new uploads stay blocked.
- [ ] Storage usage and quota appear together with an upgrade action.
- [ ] Concurrent uploads cannot exceed the confirmed quota.
- [ ] Tests cover upload, completion, failure, expiry, deletion, downgrade, and concurrent reservations.
- [ ] Type checking and Project file tests pass.
