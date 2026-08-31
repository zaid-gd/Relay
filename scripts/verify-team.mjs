import { existsSync, readFileSync } from "node:fs";

const checks = [
  ["convex/schema.ts", "teamWorkspaces: defineTable", "team workspace table"],
  ["convex/schema.ts", "teamMembers: defineTable", "team members table"],
  ["convex/schema.ts", "teamActivity: defineTable", "team activity table"],
  ["convex/schema.ts", "teamChatMessages: defineTable", "team chat table"],
  [
    "convex/schema.ts",
    "projectComments: defineTable",
    "project comments table",
  ],
  [
    "convex/schema.ts",
    "teamNotifications: defineTable",
    "team notifications table",
  ],
  [
    "convex/schema.ts",
    "assigneeUserIds: v.array(v.string())",
    "project assignment schema",
  ],
  [
    "convex/schema.ts",
    '.index("by_teamId_and_id", ["teamId", "id"])',
    "exact team project lookup index",
  ],
  [
    "convex/schema.ts",
    '.index("by_ownerUserId_and_teamId", ["ownerUserId", "teamId"])',
    "personal project scope index",
  ],
  [
    "convex/schema.ts",
    '.index("by_userId_and_status", ["userId", "status"])',
    "active membership index",
  ],
  [
    "convex/schema.ts",
    '.index("by_teamId_and_userId_and_createdAt", ["teamId", "userId", "createdAt"])',
    "newest-first team notification index",
  ],
  [
    "convex/schema.ts",
    '.index("by_teamId_and_userId_and_read_and_createdAt", ["teamId", "userId", "read", "createdAt"])',
    "unread team notification index",
  ],
  ["convex/team.ts", "const MAX_TEAM_MEMBERS = 5", "small team member limit"],
  [
    "convex/domainValidators.ts",
    'v.literal("Reviewer")',
    "reviewer role validator",
  ],
  [
    "convex/team.ts",
    "const TEAM_WORKSPACE_NAME_LIMIT = 80",
    "workspace name backend limit constant",
  ],
  [
    "convex/team.ts",
    "export const createWorkspace = mutation",
    "workspace creation mutation",
  ],
  [
    "convex/team.ts",
    'const workspaceName = (args.name.trim() || "CutLab Studio Team").slice(0, TEAM_WORKSPACE_NAME_LIMIT)',
    "workspace name trim/default/limit normalization",
  ],
  [
    "convex/team.ts",
    `const activeMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("status", "active")
      )`,
    "workspace creation indexed active membership lookup",
  ],
  [
    "convex/team.ts",
    "if (activeMembership) return activeMembership.teamId",
    "workspace creation single active workspace guard",
  ],
  [
    "convex/team.ts",
    "name: workspaceName",
    "workspace creation stores normalized name",
  ],
  [
    "convex/team.ts",
    "export const inviteMember = mutation",
    "member invite mutation",
  ],
  [
    "convex/team.ts",
    "Your email address is not invited to this team",
    "invite-only join guard",
  ],
  [
    "convex/team.ts",
    "You are already active in another team workspace",
    "single active workspace guard",
  ],
  [
    "convex/team.ts",
    'kind: "member_joined"',
    "member joined activity and notification kind",
  ],
  [
    "convex/team.ts",
    "joined your workspace",
    "owner member-joined notification message",
  ],
  [
    "convex/team.ts",
    "Small teams are limited to 5 members",
    "member count enforcement",
  ],
  [
    "convex/team.ts",
    "export const updateMemberRole = mutation",
    "owner role management mutation",
  ],
  [
    "convex/team.ts",
    "export const normalizeLegacyRoles = mutation",
    "legacy client role migration mutation",
  ],
  [
    "convex/team.ts",
    'role: "Reviewer"',
    "legacy client role normalization target",
  ],
  [
    "convex/team.ts",
    "export const removeMember = mutation",
    "owner member removal mutation",
  ],
  ["convex/team.ts", "Owner cannot be removed", "owner removal guard"],
  [
    "convex/team.ts",
    "export const leaveWorkspace = mutation",
    "member self-leave mutation",
  ],
  [
    "convex/team.ts",
    "Team owners must transfer ownership before leaving",
    "owner leave guard",
  ],
  [
    "convex/team.ts",
    'kind: "member_left"',
    "member leave activity and notification kind",
  ],
  ["convex/team.ts", "left the workspace", "member leave activity message"],
  [
    "convex/team.ts",
    "reassignedProjectCount",
    "removed member owned project count",
  ],
  [
    "convex/team.ts",
    "async function cleanupRemovedMemberProjects",
    "shared removed member project cleanup",
  ],
  [
    "convex/team.ts",
    "patch.ownerUserId = args.transferOwnerUserId",
    "removed member project ownership transfer",
  ],
  [
    "convex/team.ts",
    'owned project${reassignedProjectCount === 1 ? "" : "s"} transferred',
    "ownership transfer activity message",
  ],
  [
    "convex/team.ts",
    "export const sendChatMessage = mutation",
    "team chat mutation",
  ],
  [
    "convex/team.ts",
    "currentMember.permissions.useChat",
    "chat read permission gate",
  ],
  [
    "convex/team.ts",
    "const storedBody = body.slice(0, 800)",
    "chat stored body length limit",
  ],
  [
    "convex/team.ts",
    "const mentions = mentionsFrom(storedBody)",
    "chat mentions match stored body",
  ],
  ["convex/team.ts", 'kind: "chat_message"', "chat activity feed logging"],
  ["convex/team.ts", "posted in team chat", "chat activity feed message"],
  [
    "convex/team.ts",
    "export const addProjectComment = mutation",
    "project comment mutation",
  ],
  [
    "convex/team.ts",
    'const { identity, member } = await requirePermission(ctx, args.teamId, "commentProjects")',
    "project comment write permission membership",
  ],
  [
    "convex/team.ts",
    'if (!member.permissions.viewProjects) throw new Error("Permission denied")',
    "project comment read permission gate",
  ],
  [
    "convex/team.ts",
    "const storedBody = body.slice(0, 1000)",
    "project comment stored body length limit",
  ],
  [
    "convex/team.ts",
    "async function notifyProjectParticipants",
    "project participant notification helper",
  ],
  [
    "convex/team.ts",
    'kind: "project_comment"',
    "project comment participant notification kind",
  ],
  [
    "convex/team.ts",
    "commented on ${project.title}",
    "project comment participant notification message",
  ],
  [
    "convex/team.ts",
    "async function requireTeamProject",
    "team project comment scope helper",
  ],
  [
    "convex/team.ts",
    'withIndex("by_teamId_and_id"',
    "indexed team project comment scope lookup",
  ],
  [
    "convex/team.ts",
    'q.eq("teamId", teamId).eq("id", projectId)',
    "exact team project comment scope lookup",
  ],
  [
    "convex/team.ts",
    "Team project not found",
    "non-team project comment guard",
  ],
  [
    "convex/team.ts",
    "const comments = await ctx.db",
    "bounded project comment query variable",
  ],
  [
    "convex/team.ts",
    "return comments.reverse()",
    "project comments returned chronologically",
  ],
  ["convex/team.ts", "notifyMentionedMembers", "mention notification helper"],
  [
    "convex/team.ts",
    "async function membersMatchingMentions",
    "shared mention recipient matcher",
  ],
  [
    "convex/team.ts",
    "requiredPermission?: string",
    "optional mention recipient permission filter",
  ],
  [
    "convex/team.ts",
    "if (args.requiredPermission && !member.permissions[args.requiredPermission]) return false",
    "mention recipient permission enforcement",
  ],
  [
    "convex/team.ts",
    'requiredPermission: "useChat"',
    "chat mentions only notify chat-visible members",
  ],
  [
    "convex/team.ts",
    "const firstNameToken = normalizedName.split",
    "first-name mention matching",
  ],
  [
    "convex/team.ts",
    "const compactNameToken = normalizedName.replace",
    "compact full-name mention matching",
  ],
  [
    "convex/team.ts",
    "[nameToken, firstNameToken, compactNameToken, emailToken].some",
    "expanded mention token matching",
  ],
  [
    "convex/team.ts",
    "excludeUserIds: mentionedMembers.map",
    "comment participant/mention notification de-duplication",
  ],
  [
    "convex/team.ts",
    "export const markNotificationRead = mutation",
    "notification read mutation",
  ],
  [
    "convex/team.ts",
    "export const markAllNotificationsRead = mutation",
    "bulk notification read mutation",
  ],
  [
    "convex/team.ts",
    "await findActiveMembership(ctx, args.teamId, identity.tokenIdentifier)",
    "bulk notification read membership guard",
  ],
  [
    "convex/team.ts",
    `const notifications = await ctx.db
      .query("teamNotifications")
      .withIndex("by_teamId_and_userId_and_read_and_createdAt", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("userId", identity.tokenIdentifier)
          .eq("read", false)
      )`,
    "unread team notification indexed lookup",
  ],
  [
    "convex/team.ts",
    '.order("desc")',
    "newest-first team notification query order",
  ],
  ["convex/team.ts", ".take(50)", "bulk notification read bounded batch"],
  ["convex/projects.ts", '.query("projects")', "current project query"],
  [
    "convex/projects.ts",
    'withIndex("by_ownerUserId_and_teamId"',
    "personal project scope index",
  ],
  ["convex/projects.ts", 'withIndex("by_teamId"', "team project scope index"],
  [
    "convex/projects.ts",
    "requireTeamPermission",
    "team project permission helper",
  ],
  [
    "convex/projects.ts",
    "validatedAssignees",
    "assignment membership validation",
  ],
  [
    "convex/projects.ts",
    "export const create = mutation",
    "project creation mutation",
  ],
  [
    "convex/projects.ts",
    "export const update = mutation",
    "project update mutation",
  ],
  [
    "convex/projects.ts",
    "export const remove = mutation",
    "project removal mutation",
  ],
  [
    "convex/projects.ts",
    "export const transitionStage = mutation",
    "status transition mutation",
  ],
  [
    "src/lib/data-context.tsx",
    "teamId: typeof value.teamId",
    "team metadata normalization",
  ],
  [
    "src/lib/data-context.tsx",
    "assigneeUserIds: Array.isArray(value.assigneeUserIds)",
    "assignment normalization",
  ],
  [
    "src/lib/data-context.tsx",
    "Team project",
    "signed-in Team realtime reconciliation comment",
  ],
  [
    "src/lib/data-context.tsx",
    "setItemsState(normalizeWorkItems(convexItems))",
    "signed-in Convex project subscription reconciliation",
  ],
  [
    "src/lib/data-context.tsx",
    "convexItems === undefined",
    "signed-in Convex project reconciliation loading guard",
  ],
  [
    "src/lib/data-context.tsx",
    "function isProjectAuthorizationError",
    "project authorization failure classifier",
  ],
  [
    "src/lib/data-context.tsx",
    "setItemsState(prev)",
    "permission-denied optimistic project rollback",
  ],
  [
    "src/lib/data-context.tsx",
    "Project change was not allowed by your team permissions.",
    "permission-denied rollback toast",
  ],
  [
    "src/app/tracker-app.tsx",
    "useConvexAuth",
    "Team page Convex auth readiness hook",
  ],
  [
    "src/app/tracker-app.tsx",
    "const shouldLoadTeamPermissions = Boolean(isSignedIn && isConvexAuthenticated)",
    "top-level Team permission query waits for signed-in Convex auth",
  ],
  [
    "src/app/tracker-app.tsx",
    'shouldLoadTeamPermissions ? {} : "skip"',
    "top-level Team permission query skip guard",
  ],
  [
    "src/app/tracker-app.tsx",
    "const teamSyncUnavailable = Boolean(isSignedIn && !isConvexAuthLoading && !isConvexAuthenticated)",
    "signed-in Team sync unavailable state",
  ],
  [
    "src/app/tracker-app.tsx",
    "teamSyncUnavailable || teamDataLoading ? false",
    "Team project permissions fail closed when Convex auth is unavailable",
  ],
  [
    "src/app/tracker-app.tsx",
    "const teamData = useQuery(api.team.getMyWorkspace",
    "realtime team workspace query",
  ],
  [
    "src/app/tracker-app.tsx",
    'isConvexAuthenticated ? {} : "skip"',
    "Team workspace query waits for Convex auth",
  ],
  [
    "src/app/tracker-app.tsx",
    "Connecting your account to Team sync",
    "Team Convex auth loading diagnostic",
  ],
  [
    "src/app/tracker-app.tsx",
    "Team sync is not connected",
    "Team Convex auth failure diagnostic",
  ],
  [
    "src/app/tracker-app.tsx",
    "Convex did not receive an authenticated token",
    "Team Convex auth failure explanation",
  ],
  [
    "src/app/tracker-app.tsx",
    "Connecting Team comments",
    "project detail Team comments Convex auth loading diagnostic",
  ],
  [
    "src/app/tracker-app.tsx",
    "Team comments require Convex auth",
    "project detail Team comments Convex auth failure diagnostic",
  ],
  [
    "src/app/tracker-app.tsx",
    "disabled={!isConvexAuthenticated || !commentBody.trim()}",
    "project detail Team comment submit waits for Convex auth",
  ],
  [
    "src/app/tracker-app.tsx",
    "const TEAM_WORKSPACE_NAME_LIMIT = 80",
    "Team workspace name UI limit constant",
  ],
  [
    "src/app/tracker-app.tsx",
    "const TEAM_CHAT_MESSAGE_LIMIT = 800",
    "Team chat UI matches backend message limit",
  ],
  [
    "src/app/tracker-app.tsx",
    "const TEAM_PROJECT_COMMENT_LIMIT = 1000",
    "Team comment UI matches backend comment limit",
  ],
  [
    "src/app/tracker-app.tsx",
    "maxLength: TEAM_CHAT_MESSAGE_LIMIT",
    "Team chat input max length",
  ],
  [
    "src/app/tracker-app.tsx",
    "maxLength: TEAM_PROJECT_COMMENT_LIMIT",
    "Team comment input max length",
  ],
  [
    "src/app/tracker-app.tsx",
    "characters · Use @name",
    "project detail comment character-count helper",
  ],
  [
    "src/app/tracker-app.tsx",
    "const teamDataLoading = Boolean(isSignedIn && (isConvexAuthLoading || (isConvexAuthenticated && teamData === undefined)))",
    "team permission loading state",
  ],
  [
    "src/app/tracker-app.tsx",
    "const canCreateTeamProjects = teamSyncUnavailable || teamDataLoading ? false",
    "team project create UI gate waits for team query",
  ],
  [
    "src/app/tracker-app.tsx",
    "teamDataLoading ? false : !teamData || Boolean(projectPermissions?.editProjects)",
    "edit UI gate waits for team query",
  ],
  [
    "src/app/tracker-app.tsx",
    "teamDataLoading ? false : !teamData || Boolean(projectPermissions?.updateStatus)",
    "status UI gate waits for team query",
  ],
  [
    "src/app/tracker-app.tsx",
    "teamDataLoading ? false : !teamData || Boolean(projectPermissions?.commentProjects)",
    "comment UI gate waits for team query",
  ],
  [
    "src/app/tracker-app.tsx",
    "const canCreateProjects",
    "create permission UI gate",
  ],
  [
    "src/app/tracker-app.tsx",
    "const canEditProjects",
    "edit permission UI gate",
  ],
  [
    "src/app/tracker-app.tsx",
    "function canDeleteProject",
    "delete permission UI gate",
  ],
  [
    "src/app/tracker-app.tsx",
    "(canEditProjects || canManageTeamProjects) &&",
    "team manager delete UI permission alignment",
  ],
  [
    "src/app/tracker-app.tsx",
    "Only the project owner or a team owner can delete this team project.",
    "delete denial copy",
  ],
  [
    "src/app/tracker-app.tsx",
    "const canUpdateProjectStatus",
    "status permission UI gate",
  ],
  [
    "src/app/tracker-app.tsx",
    "const canCommentProjects",
    "comment permission UI gate",
  ],
  [
    "src/app/tracker-app.tsx",
    "teamId: normalizedForm.teamId",
    "personal project edit stays personal",
  ],
  [
    "src/app/tracker-app.tsx",
    "ownerUserId: normalizedForm.ownerUserId ?? (!editingId && normalizedForm.teamId ? teamData?.currentMember.userId : undefined)",
    "explicit team project optimistic owner wiring",
  ],
  ["src/app/tracker-app.tsx", "Assigned team members", "project assignment UI"],
  [
    "src/app/tracker-app.tsx",
    "form.teamId && teamMembers.length",
    "assignment UI limited to team projects",
  ],
  [
    "src/app/tracker-app.tsx",
    "ProjectDetailCollaborationPanel",
    "project detail collaboration panel",
  ],
  [
    "src/app/tracker-app.tsx",
    "const teamProjects = useMemo",
    "Team page team-project-only selector",
  ],
  [
    "src/app/tracker-app.tsx",
    "Create a team project to start leaving shared comments.",
    "team-only comments empty state",
  ],
  ["src/app/tracker-app.tsx", "Team Chat", "team chat UI"],
  [
    "src/app/team-chat/page.tsx",
    '<TrackerApp page="team-chat" />',
    "dedicated Team Chat route",
  ],
  [
    "src/components/workspace-shell.tsx",
    '{ page: "team", label: "Team", href: "/team"',
    "grouped Team sidebar destination",
  ],
  [
    "src/components/workspace-shell.tsx",
    '{ page: "team-chat", label: "Team chat", href: "/team-chat"',
    "Team Chat contextual navigation item",
  ],
  [
    "src/app/tracker-app.tsx",
    "function TeamChatPage",
    "dedicated Team Chat page implementation",
  ],
  [
    "src/app/tracker-app.tsx",
    "personalProjects = useMemo(() => projects.filter((item) => !item.teamId)",
    "personal project separation",
  ],
  [
    "src/app/tracker-app.tsx",
    "projects.filter((project) => project.teamId === currentTeamId)",
    "team project separation",
  ],
  [
    "src/components/precision-projects.tsx",
    "My Projects",
    "personal projects workspace tab",
  ],
  [
    "src/components/precision-projects.tsx",
    "Team Projects",
    "team projects workspace tab",
  ],
  [
    "src/components/precision-projects.tsx",
    "New Team Project",
    "explicit team project creation",
  ],
  [
    "src/app/tracker-app.tsx",
    'scope: "personal" | "team" = "personal"',
    "personal-first project creation",
  ],
  [
    "src/components/workspace-shell.tsx",
    "const collapsed = true;",
    "permanently collapsed desktop sidebar",
  ],
  [
    "src/components/workspace-shell.tsx",
    'aria-label="Go to dashboard"',
    "clickable sidebar and mobile logo",
  ],
  [
    "src/app/tracker-app.tsx",
    "Chat unavailable for your role",
    "no-chat role UI state",
  ],
  [
    "src/app/tracker-app.tsx",
    "does not have permission to view or send chat messages",
    "no-chat role explanatory copy",
  ],
  ["src/app/tracker-app.tsx", "Activity Feed", "team activity feed UI"],
  [
    "src/app/tracker-app.tsx",
    "const teamProjectTitles",
    "Team project title lookup for notifications and activity",
  ],
  [
    "src/app/tracker-app.tsx",
    "function teamProjectLabel",
    "Team project metadata label helper",
  ],
  [
    "src/app/tracker-app.tsx",
    "function showTeamProject",
    "Team project activity navigation helper",
  ],
  [
    "src/app/tracker-app.tsx",
    "Project: {teamProjectLabel(notification.projectId)}",
    "notification project context label",
  ],
  [
    "src/app/tracker-app.tsx",
    "if (!notification.read)",
    "notification view read-state guard",
  ],
  [
    "src/app/tracker-app.tsx",
    "void markNotificationRead({ notificationId: notification._id })",
    "notification view marks unread notification read",
  ],
  [
    "src/app/tracker-app.tsx",
    "Project: {teamProjectLabel(activity.projectId)}",
    "activity project context label",
  ],
  [
    "src/app/tracker-app.tsx",
    "teamNotifications",
    "global team notification bell",
  ],
  [
    "src/app/tracker-app.tsx",
    'const teamData = useQuery(api.team.getMyWorkspace, isConvexAuthenticated ? {} : "skip")',
    "global team notification bell waits for Convex auth",
  ],
  [
    "src/app/tracker-app.tsx",
    "Connecting team notifications",
    "global team notification Convex auth loading state",
  ],
  [
    "src/app/tracker-app.tsx",
    "Waiting for Convex auth before loading Team notifications.",
    "global team notification Convex auth loading explanation",
  ],
  [
    "src/app/tracker-app.tsx",
    "teamNotificationSyncUnavailable",
    "global team notification Convex auth failure state",
  ],
  [
    "src/app/tracker-app.tsx",
    "Team notifications are not connected",
    "global team notification Convex auth failure label",
  ],
  [
    "src/app/tracker-app.tsx",
    "Clerk is signed in, but Convex auth is not connected.",
    "global team notification Convex auth failure explanation",
  ],
  [
    "src/app/tracker-app.tsx",
    "Open Team",
    "global team notification workspace navigation",
  ],
  [
    "src/app/tracker-app.tsx",
    'href="/team"',
    "global team notification links to Team page",
  ],
  [
    "src/app/tracker-app.tsx",
    "setNotificationOpen(false)",
    "global team notification closes bell menu",
  ],
  [
    "src/app/tracker-app.tsx",
    "void markNotificationRead({ notificationId: notification._id })",
    "global team notification navigation marks unread notification read",
  ],
  [
    "src/app/tracker-app.tsx",
    "api.team.markAllNotificationsRead",
    "bulk notification read UI wiring",
  ],
  ["src/app/tracker-app.tsx", "Mark all read", "bulk notification read button"],
  [
    "src/components/workspace-shell.tsx",
    "function MobileNavigation({",
    "mobile navigation component",
  ],
  [
    "src/app/tracker-app.tsx",
    "<NotificationBell settings={settings} />",
    "mobile team notification bell reuse",
  ],
  [
    "src/app/tracker-app.tsx",
    "copyInviteCode",
    "owner invite-code copy workflow",
  ],
  [
    "src/app/tracker-app.tsx",
    "maxLength: TEAM_WORKSPACE_NAME_LIMIT",
    "Team workspace name input max length",
  ],
  [
    "src/app/tracker-app.tsx",
    "${workspaceName.length}/${TEAM_WORKSPACE_NAME_LIMIT} characters",
    "Team workspace name character count helper",
  ],
  [
    "src/app/tracker-app.tsx",
    "Invite code is visible to team owners only.",
    "non-owner invite-code hiding",
  ],
  [
    "src/app/tracker-app.tsx",
    "const inviteEmailIsValid = isValidEmail(inviteForm.email)",
    "invite email validity guard",
  ],
  [
    "src/app/tracker-app.tsx",
    "disabled={Boolean(busyAction) || !inviteEmailIsValid}",
    "invalid invite email button guard",
  ],
  [
    "src/app/tracker-app.tsx",
    "Cancel Invite",
    "pending invite cancellation UI",
  ],
  ["src/app/tracker-app.tsx", "Leave Workspace", "member self-leave UI action"],
  [
    "src/app/tracker-app.tsx",
    "api.team.leaveWorkspace",
    "member self-leave mutation wiring",
  ],
  [
    "src/app/tracker-app.tsx",
    "removeMember({ teamId",
    "member removal UI action",
  ],
  [
    "src/app/tracker-app.tsx",
    "updateMemberRole({ teamId",
    "role update UI action",
  ],
  [
    "src/app/tracker-app.tsx",
    "api.team.normalizeLegacyRoles",
    "legacy role normalization UI wiring",
  ],
  [
    "src/app/tracker-app.tsx",
    "Team workspaces require an account",
    "signed-out Team account requirement",
  ],
  [
    "src/app/tracker-app.tsx",
    "Checking account status",
    "Team auth loading state",
  ],
  ["src/app/tracker-app.tsx", "openSignUp()", "Team account creation action"],
  ["src/app/tracker-app.tsx", "openSignIn()", "Team sign-in action"],
  [
    "src/app/tracker-app.tsx",
    "const TEAM_INVITE_CODE_PATTERN = /^[A-Z0-9]{6}$/",
    "Team invite-code UI format guard",
  ],
  [
    "src/app/tracker-app.tsx",
    "const inviteCodeIsValid = TEAM_INVITE_CODE_PATTERN.test(inviteCode.trim())",
    "Team join invite-code validity state",
  ],
  [
    "src/app/tracker-app.tsx",
    'replace(/[^A-Z0-9]/g, "")',
    "Team join invite-code input filtering",
  ],
  [
    "src/app/tracker-app.tsx",
    "disabled={Boolean(busyAction) || !inviteCodeIsValid}",
    "Team join invalid invite-code button guard",
  ],
  [
    "package.json",
    '"verify:team:live": "node scripts/verify-team-live.mjs"',
    "Team live smoke pnpm script",
  ],
  [
    "scripts/verify-team-live.mjs",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "Team live smoke Clerk publishable key prerequisite",
  ],
  [
    "scripts/verify-team-live.mjs",
    "CLERK_SECRET_KEY",
    "Team live smoke Clerk secret key prerequisite",
  ],
  [
    "scripts/verify-team-live.mjs",
    "NEXT_PUBLIC_CONVEX_URL",
    "Team live smoke Convex URL prerequisite",
  ],
  [
    "scripts/verify-team-live.mjs",
    "CLERK_FRONTEND_API_URL",
    "Team live smoke Clerk frontend issuer prerequisite",
  ],
  [
    "scripts/verify-team-live.mjs",
    "CLERK_JWT_ISSUER_DOMAIN",
    "Team live smoke Clerk JWT issuer prerequisite",
  ],
  [
    "scripts/verify-team-live.mjs",
    "convex/auth.config.ts",
    "Team live smoke Convex auth config prerequisite",
  ],
  [
    "scripts/verify-team-live.mjs",
    'applicationID: "convex"',
    "Team live smoke Convex JWT audience check",
  ],
  [
    "convex/auth.config.ts",
    "process.env.CLERK_FRONTEND_API_URL ?? process.env.CLERK_JWT_ISSUER_DOMAIN",
    "Convex auth Clerk issuer fallback",
  ],
  [
    "convex/auth.config.ts",
    'applicationID: "convex"',
    "Convex auth JWT audience",
  ],
  [
    "scripts/verify-team-live.mjs",
    "two-account smoke test",
    "Team live smoke checklist copy",
  ],
  [
    "scripts/verify-team-live.mjs",
    "Confirm session B receives the shared project, assignment notification, status update, activity entry, and project comment without refreshing.",
    "Team live realtime smoke checklist",
  ],
  [
    "README.md",
    "Convex-backed Team workspace",
    "README Team collaboration description",
  ],
  [
    "README.md",
    "live two-account Clerk/Convex smoke test",
    "README live Team smoke-test guidance",
  ],
  ["README.md", "pnpm verify:team:live", "README Team live smoke command"],
  ["README.md", "pnpm verify:team", "README Team verifier command"],
];

const forbidden = [
  [
    "convex/team.ts",
    'role: "Editor",\n        status: "active"',
    "open invite-code join fallback",
  ],
  ["convex/team.ts", 'v.literal("Client")', "obsolete client workspace role"],
  [
    "src/app/tracker-app.tsx",
    '"Owner", "Editor", "Reviewer", "Client"',
    "obsolete client workspace role option",
  ],
  [
    "src/lib/data-context.tsx",
    '"Owner", "Editor", "Reviewer", "Client"',
    "obsolete normalized client workspace role option",
  ],
  [
    "convex/team.ts",
    '.withIndex("by_teamId", (q) => q.eq("teamId", teamId))\n    .take(500)',
    "unbounded-ish team project comment lookup",
  ],
  [
    "src/app/tracker-app.tsx",
    "Editable local team members",
    "local-only Team page copy",
  ],
  [
    "src/app/tracker-app.tsx",
    "No notification types enabled",
    "mobile settings-only notification menu",
  ],
];

let failures = 0;

for (const [file, text, label] of checks) {
  if (!existsSync(file)) {
    failures += 1;
    console.error(`Missing file for ${label}: ${file}`);
    continue;
  }
  const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  if (!source.includes(text)) {
    failures += 1;
    console.error(`${file} missing ${label}: ${text}`);
  }
}

for (const [file, text, label] of forbidden) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  if (source.includes(text)) {
    failures += 1;
    console.error(`${file} still contains forbidden ${label}: ${text}`);
  }
}

if (failures) {
  console.error(
    `Team verification failed with ${failures} issue${failures === 1 ? "" : "s"}.`
  );
  process.exit(1);
}

console.log(
  `Verified ${checks.length} Team collaboration invariants across Convex and the tracker UI.`
);
