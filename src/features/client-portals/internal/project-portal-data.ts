"use client";

import { useCallback, useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";

export type ProjectPortalOutputOption = {
  id: string;
  title: string;
  reviewState: string;
  hasCurrentVersion: boolean;
};

type EditorPortal = {
  id: string;
  projectId: string;
  status: "draft" | "open" | "closed";
  expiresAt: string | null;
  hasPin: boolean;
  publicNotes: string;
  showStartDate: boolean;
  showDueDate: boolean;
  selectedOutputIds: string[];
};

type EditorPortalWithSessionToken = EditorPortal & { token?: string };

type EditorPortalResult = { portal: EditorPortal; preview: unknown };

export type ProjectPortalDraft = {
  publicNotes: string;
  showStartDate: boolean;
  showDueDate: boolean;
  selectedOutputIds: string[];
  expiresAt: string;
  pin: string;
  pinProtected: boolean;
};

function readSessionToken(projectId: string) {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(`relay:project-portal-token:${projectId}`) ?? "";
}

function writeSessionToken(projectId: string, token: string) {
  if (typeof window !== "undefined") window.sessionStorage.setItem(`relay:project-portal-token:${projectId}`, token);
}

const portalApi = {
  getForProject: makeFunctionReference<"query", { projectId: string }, EditorPortalResult | null>("projectPortals:getForProject"),
  publish: makeFunctionReference<"mutation", { projectId: string; config: { publicNotes: string; showStartDate: boolean; showDueDate: boolean; selectedOutputIds: string[]; expiresAt: string | null } }, { portalId: string; token: string }>("projectPortals:publish"),
  updateSettings: makeFunctionReference<"mutation", { portalId: string; changes: { publicNotes: string; showStartDate: boolean; showDueDate: boolean; selectedOutputIds: string[]; expiresAt: string | null } }, null>("projectPortals:updateSettings"),
  setStatus: makeFunctionReference<"mutation", { portalId: string; status: "open" | "closed" }, null>("projectPortals:setStatus"),
  setPin: makeFunctionReference<"mutation", { portalId: string; pin: string | null }, null>("projectPortals:setPin"),
  regenerateToken: makeFunctionReference<"mutation", { portalId: string }, { token: string }>("projectPortals:regenerateToken"),
};

function localDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function draftFromPortal(portal: EditorPortal | null): ProjectPortalDraft {
  return {
    publicNotes: portal?.publicNotes ?? "",
    showStartDate: portal?.showStartDate ?? false,
    showDueDate: portal?.showDueDate ?? true,
    selectedOutputIds: portal?.selectedOutputIds ?? [],
    expiresAt: localDateTime(portal?.expiresAt),
    pin: "",
    pinProtected: portal?.hasPin ?? false,
  };
}

export function useProjectPortal(projectId: string, enabled: boolean) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const available = enabled && isAuthenticated;
  const result = useQuery(portalApi.getForProject, available ? { projectId } : "skip");
  const publish = useMutation(portalApi.publish);
  const updateSettings = useMutation(portalApi.updateSettings);
  const setStatus = useMutation(portalApi.setStatus);
  const setPin = useMutation(portalApi.setPin);
  const regenerateToken = useMutation(portalApi.regenerateToken);
  const [error, setError] = useState("");
  const [sessionToken, setSessionToken] = useState(() => readSessionToken(projectId));
  const portal = useMemo<EditorPortalWithSessionToken | null>(() => result?.portal
    ? { ...result.portal, ...(sessionToken ? { token: sessionToken } : {}) }
    : null, [result, sessionToken]);

  const save = useCallback(async (draft: ProjectPortalDraft) => {
    setError("");
    try {
      const config = {
        publicNotes: draft.publicNotes.trim(),
        showStartDate: draft.showStartDate,
        showDueDate: draft.showDueDate,
        selectedOutputIds: [...new Set(draft.selectedOutputIds)],
        expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
      };
      const created = portal ? null : await publish({ projectId, config });
      const portalId = portal?.id ?? created?.portalId;
      if (!portalId) throw new Error("Could not create the Client Portal.");
      if (created) {
        setSessionToken(created.token);
        writeSessionToken(projectId, created.token);
      }
      if (portal) await updateSettings({ portalId, changes: config });
      if (!draft.pinProtected && portal?.hasPin) await setPin({ portalId, pin: null });
      if (draft.pinProtected && draft.pin.trim()) await setPin({ portalId, pin: draft.pin.trim() });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not save the Client Portal.";
      setError(message);
      throw new Error(message);
    }
  }, [portal, projectId, publish, setPin, updateSettings]);

  const changeOpen = useCallback(async (portalId: string, open: boolean) => {
    setError("");
    try {
      await setStatus({ portalId, status: open ? "open" : "closed" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not update portal access.";
      setError(message);
      throw new Error(message);
    }
  }, [setStatus]);

  const regenerate = useCallback(async (portalId: string) => {
    setError("");
    try {
      const regenerated = await regenerateToken({ portalId });
      setSessionToken(regenerated.token);
      writeSessionToken(projectId, regenerated.token);
      return regenerated;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not regenerate the portal link.";
      setError(message);
      throw new Error(message);
    }
  }, [regenerateToken]);

  return useMemo(() => ({
    portal: available ? portal : null,
    loading: enabled && (authLoading || (isAuthenticated && result === undefined)),
    available,
    error,
    save,
    changeOpen,
    regenerate,
    initialDraft: draftFromPortal(available ? portal : null),
  }), [authLoading, available, changeOpen, enabled, error, isAuthenticated, portal, regenerate, result, save]);
}
