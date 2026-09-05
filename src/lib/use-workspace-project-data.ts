"use client";

import { usePaginatedQuery } from "convex/react";
import { useEffect, useMemo } from "react";
import { api } from "../../convex/_generated/api";

// Summaries consume complete pages, never a silently truncated list.
export function useWorkspaceProjectData(authenticated: boolean) {
  const personal = usePaginatedQuery(
    api.projects.listPage,
    authenticated ? { scope: "personal" } : "skip",
    { initialNumItems: 100 }
  );
  const team = usePaginatedQuery(
    api.projects.listPage,
    authenticated ? { scope: "team" } : "skip",
    { initialNumItems: 100 }
  );
  const batches = usePaginatedQuery(
    api.projects.salaryBatchesPage,
    authenticated ? {} : "skip",
    { initialNumItems: 100 }
  );
  const { loadMore: loadPersonal, status: personalStatus } = personal;
  const { loadMore: loadTeam, status: teamStatus } = team;
  const { loadMore: loadBatches, status: batchStatus } = batches;
  useEffect(() => {
    if (personalStatus === "CanLoadMore") loadPersonal(100);
  }, [personalStatus, loadPersonal]);
  useEffect(() => {
    if (teamStatus === "CanLoadMore") loadTeam(100);
  }, [teamStatus, loadTeam]);
  useEffect(() => {
    if (batchStatus === "CanLoadMore") loadBatches(100);
  }, [batchStatus, loadBatches]);
  const projects = useMemo(
    () =>
      !authenticated
        ? []
        : personalStatus === "Exhausted" && teamStatus === "Exhausted"
          ? [...personal.results, ...team.results]
          : undefined,
    [authenticated, personalStatus, teamStatus, personal.results, team.results]
  );
  return {
    projects,
    batches: !authenticated
      ? []
      : batchStatus === "Exhausted"
        ? batches.results
        : undefined,
  };
}
