import type { WorkItem } from "@/lib/types";

type TeamProjectPermissions = {
  createProjects?: boolean;
  editProjects?: boolean;
  updateStatus?: boolean;
  commentProjects?: boolean;
  managePortal?: boolean;
  manageFinance?: boolean;
  manageTeam?: boolean;
};

export function resolveProjectPermissions({
  sample,
  teamConnected,
  loading,
  unavailable,
  role,
  permissions,
}: {
  sample: boolean;
  teamConnected: boolean;
  loading: boolean;
  unavailable: boolean;
  role?: string;
  permissions?: TeamProjectPermissions;
}) {
  const blocked = loading || unavailable;
  const owner = role === "Owner";
  return {
    canCreateProjects: !sample,
    canCreateTeamProjects:
      !blocked && teamConnected && Boolean(permissions?.createProjects),
    canEditProjects:
      !blocked && (!teamConnected || Boolean(permissions?.editProjects)),
    canUpdateProjectStatus:
      !blocked && (!teamConnected || Boolean(permissions?.updateStatus)),
    canCommentProjects:
      !blocked && (!teamConnected || Boolean(permissions?.commentProjects)),
    canManagePortals:
      !blocked && (!teamConnected || (permissions?.managePortal ?? owner)),
    canManageFinance:
      !blocked && (!teamConnected || (permissions?.manageFinance ?? owner)),
    canManageTeamProjects: Boolean(permissions?.manageTeam),
  };
}

export function canDeleteProject({
  project,
  currentUserId,
  canEdit,
  canManageTeam,
}: {
  project: WorkItem | null;
  currentUserId?: string;
  canEdit: boolean;
  canManageTeam: boolean;
}) {
  if (!project) return false;
  if (!project.teamId) return true;
  return (
    (canEdit || canManageTeam) &&
    (project.ownerUserId === currentUserId || canManageTeam)
  );
}
