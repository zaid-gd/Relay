# Project File Architecture

CutLab stores project file identity separately from file versions.

## Canonical Model

- `projectFiles` represents a logical Deliverable, Reference, or Asset.
- `projectFileVersions` represents every uploaded or linked revision of that file.
- The newest version is derived from `versionNumber`; previous versions remain immutable history.
- Upload date, size, uploader, provider, provider ID, file name, MIME type, and notes are stored per version.
- Category, current approval status, client visibility, download permission, title, and description are stored on the logical file.
- Every new version snapshots its approval status. Changing a logical file's status updates only its latest version, preserving the approval history of older versions.

## Approval States

New writes use these canonical values:

- `draft`
- `sent_to_client`
- `changes_requested`
- `approved`
- `final_delivered`

The UI presents them as Draft, Sent to Client, Changes Requested, Approved, and Final Delivered. Legacy file and portal status values remain accepted by the schema and are normalized on reads so existing records stay usable during the migration window.

## Providers

Every version uses the same provider contract:

- `convex`: Blob stored in Convex file storage through a signed upload URL.
- `external`: Generic HTTP or HTTPS file link.
- `google_drive`: Google Drive URL plus optional provider file ID.
- `dropbox`: Dropbox URL plus optional provider file ID.
- `frame_io`: Frame.io URL plus optional provider asset ID.

Google Drive, Dropbox, or Frame.io OAuth integrations can later resolve provider IDs, refresh metadata, and create new versions without changing the UI-facing file model.

## Access

- Personal project owners can view and edit their files.
- Team Owner and Editor roles can upload, link, update, and remove files.
- Reviewer can view and download files but cannot mutate them.
- Client Portal queries return only Deliverables explicitly marked `clientVisible` and whose normalized approval status is client-safe.
- Draft Deliverables remain private. A Draft marked for sharing appears automatically after it advances to Sent to Client or a later approval state.
- Reference files, Assets, uploader IDs, internal notes, and version metadata are never included in the public portal projection.

## Client Portal Link Security

- Portal access can be enabled or disabled independently of the client-facing project snapshot.
- Portals can have an optional ISO expiry timestamp. Expired links return only an expired state and no project data.
- Invalid, unpublished, and disabled links share the same generic unavailable response so the public API does not reveal whether a private project exists.
- Regenerating a token immediately invalidates the old URL without replacing the portal, deliverables, revisions, or event history.
- Existing portal records remain compatible: when the optional `enabled` field is absent, access falls back to the legacy `published` value.
- Public revision submission uses the same enabled and expiry checks as the public portal query.
- Password protection is optional and migration-safe. Existing records without hash fields remain unprotected.
- Passwords use PBKDF2-SHA-256 with a random per-portal salt and stored iteration count. Plaintext is never stored.
- Public queries return only a `locked` state before credential verification and do not load deliverables, revisions, events, or client-facing project fields.
- Editor queries expose only `passwordProtected`; password hashes and salts remain server-side.

## Compatibility

`projectFiles` is the only runtime source for portal deliverables. Production had no
`portalDeliverables` rows when this path was retired, so no backfill was needed.
The legacy table remains in the schema until the final model cleanup.
