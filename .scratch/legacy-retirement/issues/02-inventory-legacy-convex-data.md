# Inventory legacy Convex data

Status: resolved
Blocked by: none

## Work

With explicit approval for the target deployment, run read-only counts and integrity checks for:

- `workItems` without matching `projects` records;
- `portalDeliverables` without matching Project Output and Media Version records;
- Client Portals missing `enabled`;
- Salary Batches missing `projectIds`;
- Projects with string workflow stages or positional legacy stage IDs;
- settings that still depend on `integrationAccounts`, `integrations`, or `editorPermissions`.

Record counts and orphan cases without copying private record contents into the ticket.

## Done when

- The ticket names the checked deployment.
- Every migration has a count, an integrity query, and a go or no-go result.
- No data changes have run.

## Comments

This ticket must finish before any backfill ticket starts.

## Inventory result

Screen approved Relay's default production deployment in this implementation session. Checked it on 2026-08-28, selected as `prod` by the Convex CLI, with `npx convex run --prod --inline-query`. The production project ID stays out of source control. No mutation, backfill, deployment, or other data change ran.

| Migration                           |                                                                                                         Count | Integrity query                                                                                                                                                                                                                                                                                      | Result                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Work Items into Projects            |                                                                              0 legacy Work Items, 0 unmatched | Match `workItems` to `projects` by resolved owner, team, and stable Project ID. Record unmatched Convex IDs only.                                                                                                                                                                                    | Go. No rows need backfill. |
| Portal Deliverables                 |                0 legacy deliverables, 0 without a matching Project Output, 0 without a matching Media Version | Resolve each deliverable's Client Portal Project, match the output by Project and title, then match its media version by output and source URL. Record unmatched Convex IDs only.                                                                                                                    | Go. No rows need backfill. |
| Client Portal access                |                                                                         0 Client Portals, 0 missing `enabled` | Count portals where `enabled` is absent. Record Convex IDs only.                                                                                                                                                                                                                                     | Go. No rows need backfill. |
| Salary Batches                      |                          0 legacy Salary Batches and 0 current Project Salary Batches, 0 missing `projectIds` | Check both batch tables for a missing or non-array `projectIds` value. Record Convex IDs only.                                                                                                                                                                                                       | Go. No rows need backfill. |
| Workflow Stages                     |                                  16 Projects, 0 with string stages, 0 with `legacy-stage-N` current stage IDs | Check every Project for string members in `workflowStages` and positional `workflowStageId` values matching `legacy-stage-N`. Record Convex IDs only.                                                                                                                                                | Go. No rows need backfill. |
| Integration and permission settings | 1 settings record, 0 dependent on `integrations` or `integrationAccounts`, 0 dependent on `editorPermissions` | Match the runtime fallback predicates: count a legacy integration dependency only when every current config has no connection or account and a legacy field has one; count a permission dependency only when `rolePermissions` is absent and `editorPermissions` is present. Record Convex IDs only. | Go. No rows need backfill. |

## Integrity queries

Each command ran with `--typecheck disable --codegen disable`. They return counts and opaque IDs only.

```powershell
# Work Items into Projects
$q='const old=await ctx.db.query("workItems").collect();const current=await ctx.db.query("projects").collect();const keys=new Set(current.map(p=>`${p.ownerUserId}|${p.teamId??""}|${p.id}`));const rows=old.filter(w=>!keys.has(`${w.ownerUserId??w.userId}|${w.teamId??""}|${w.id}`));return {total:old.length,count:rows.length,ids:rows.map(r=>r._id)};'; npx convex run --prod --inline-query $q --typecheck disable --codegen disable

# Portal Deliverables
$q='const rows=await ctx.db.query("portalDeliverables").collect();const portals=await ctx.db.query("clientPortals").collect();const outputs=await ctx.db.query("projectOutputs").collect();const versions=await ctx.db.query("projectMediaVersions").collect();const byId=new Map(portals.map(p=>[p._id,p]));const outputFor=d=>{const p=byId.get(d.portalId);return p?outputs.filter(o=>o.projectId===p.projectId&&o.title===d.title):[]};const noOutput=rows.filter(d=>outputFor(d).length===0);const noVersion=rows.filter(d=>!outputFor(d).some(o=>versions.some(v=>v.outputId===o._id&&v.source?.url===d.url)));return {total:rows.length,withoutOutputCount:noOutput.length,withoutOutputIds:noOutput.map(r=>r._id),withoutVersionCount:noVersion.length,withoutVersionIds:noVersion.map(r=>r._id)};'; npx convex run --prod --inline-query $q --typecheck disable --codegen disable

# Client Portal access
$q='const all=await ctx.db.query("clientPortals").collect();const rows=all.filter(p=>p.enabled===undefined);return {total:all.length,count:rows.length,ids:rows.map(r=>r._id)};'; npx convex run --prod --inline-query $q --typecheck disable --codegen disable

# Salary Batches
$q='const old=await ctx.db.query("salaryBatches").collect();const current=await ctx.db.query("projectSalaryBatches").collect();const oldMissing=old.filter(b=>!Array.isArray(b.projectIds));const currentMissing=current.filter(b=>!Array.isArray(b.projectIds));return {legacyTotal:old.length,legacyCount:oldMissing.length,legacyIds:oldMissing.map(r=>r._id),currentTotal:current.length,currentCount:currentMissing.length,currentIds:currentMissing.map(r=>r._id)};'; npx convex run --prod --inline-query $q --typecheck disable --codegen disable

# Workflow Stages
$q='const all=await ctx.db.query("projects").collect();const strings=all.filter(p=>Array.isArray(p.workflowStages)&&p.workflowStages.some(s=>typeof s==="string"));const positional=all.filter(p=>typeof p.workflowStageId==="string"&&/^legacy-stage-[0-9]+$/.test(p.workflowStageId));return {total:all.length,stringCount:strings.length,stringIds:strings.map(r=>r._id),positionalCount:positional.length,positionalIds:positional.map(r=>r._id)};'; npx convex run --prod --inline-query $q --typecheck disable --codegen disable

# Integration and permission settings
$q='const all=await ctx.db.query("settings").collect();const integrations=all.filter(s=>Object.values(s.integrationConfigs??{}).every(c=>!c?.connected&&!c?.account)&&(Object.values(s.integrations??{}).some(v=>v===true)||Object.values(s.integrationAccounts??{}).some(v=>typeof v==="string"&&v.trim()!=="")));const permissions=all.filter(s=>(!s.rolePermissions||typeof s.rolePermissions!=="object"||Array.isArray(s.rolePermissions))&&s.editorPermissions&&typeof s.editorPermissions==="object"&&!Array.isArray(s.editorPermissions));return {total:all.length,integrationFallbackCount:integrations.length,integrationFallbackIds:integrations.map(r=>r._id),permissionFallbackCount:permissions.length,permissionFallbackIds:permissions.map(r=>r._id)};'; npx convex run --prod --inline-query $q --typecheck disable --codegen disable
```

These inventory results do not authorize schema narrowing. Each later ticket must still run its own dry run and verification before removal work starts.
