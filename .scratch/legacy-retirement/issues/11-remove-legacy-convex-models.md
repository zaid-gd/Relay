# Remove migrated Convex models and fields

Status: blocked
Blocked by: 03 Migrate workItems into Projects, 04 Migrate portal deliverables, 05 Normalize Client Portal access, 06 Normalize Salary Batches, 07 Normalize Workflow Stages, 08 Normalize integration and permission settings

## Work

- Remove the `workItems` and `portalDeliverables` tables after verified migration.
- Remove legacy public functions, fallback queries, validators, fields, branches, tests, and migration code.
- Make current fields required where the model requires them.
- Deploy the narrowed schema only after verification queries return zero legacy dependencies.

## Done when

- Schema deployment accepts all stored documents.
- Runtime source has no fallback to retired models.
- Generated Convex types contain no retired tables or fields.
- Full Convex and application verification passes.
