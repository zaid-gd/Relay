# 04: Enforce accurate Workspace storage quotas

**What to build:** Replace the fixed 200 MB Project scan with exact Workspace storage accounting. Use decimal gigabytes: `FREE_STORAGE_QUOTA_BYTES = 0`, `CREATOR_STORAGE_QUOTA_BYTES = 5_000_000_000`, and `TEAM_BASE_STORAGE_QUOTA_BYTES = 15_000_000_000`. Free cannot start hosted uploads, Creator receives 5 GB, and Team receives 15 GB before Editor Seat and Storage Add-on increases. Use these constants in the entitlement contract, quota checks, tests, and UI copy.

**Blocked by:** 01: Establish Workspace subscription authority.

**Status:** done

- [x] Convex keeps an exact retained-byte total per Workspace instead of scanning all Projects during upload.
- [x] The quota is zero hosted bytes for Free, 5 GB for Creator, and 15 GB for base Team.
- [x] Upload capacity is reserved before data transfer and committed with stored file metadata.
- [x] Failed, abandoned, and expired uploads release reservations safely.
- [x] Archived files count until permanent deletion.
- [x] Existing files remain readable above quota while new uploads stay blocked.
- [x] Storage usage and quota appear together with an upgrade action.
- [x] Concurrent uploads cannot exceed the confirmed quota.
- [x] Tests cover upload, completion, failure, expiry, deletion, downgrade, and concurrent reservations.
- [x] Type checking and Project file tests pass.

The Project Files panel shows retained storage beside the Workspace quota and links to the subscription page when the current plan or capacity blocks uploads.
