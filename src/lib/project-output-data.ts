"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { WorkItem } from "./types";
import { useData } from "./data-context";
import {
  addMediaVersionFromUrl,
  createProjectOutput,
  normalizeMediaUrl,
  selectCurrentMediaVersion,
  setProjectOutputReviewState,
  unresolvedOldVersionComments,
  updateProjectOutput,
  type MediaVersion,
  type ProjectOutput,
  type ProjectOutputReviewState,
  type ProjectOutputSnapshot,
} from "@/features/project-outputs/project-output-domain";
import {
  createProjectOutputsController,
  type ProjectOutputsPort,
} from "@/features/project-outputs/project-output-port";
import type { FileCategory } from "./domain-values";

const STORAGE_KEY = "relay:project-outputs:v1";

type OutputWire = {
  id: string;
  projectId: string;
  title: string;
  category: FileCategory;
  reviewState: ProjectOutputReviewState;
  archived: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  unresolvedOldVersionCommentCount: number;
  currentVersion: VersionWire | null;
  versions: VersionWire[];
};

type VersionWire = {
  id: string;
  versionNumber: number;
  source:
    | { kind: "youtube"; url: string; videoId: string }
    | { kind: "vimeo"; url: string; videoId: string }
    | { kind: "link"; url: string };
  title: string;
  notes: string;
  createdAt: string;
};

const outputApi = {
  listForProject: makeFunctionReference<
    "query",
    { projectId: string; includeArchived?: boolean },
    OutputWire[]
  >("projectOutputs:listForProject"),
  initializeFromTemplate: makeFunctionReference<
    "mutation",
    {
      projectId: string;
      outputs: Array<{
        id: string;
        title: string;
        category: FileCategory;
        reviewState: ProjectOutputReviewState;
        dueDate?: string;
      }>;
    },
    unknown
  >("projectOutputs:initializeFromTemplate"),
  create: makeFunctionReference<
    "mutation",
    {
      projectId: string;
      output: {
        id: string;
        title: string;
        category: FileCategory;
        reviewState: ProjectOutputReviewState;
        dueDate?: string;
      };
    },
    unknown
  >("projectOutputs:create"),
  update: makeFunctionReference<
    "mutation",
    {
      outputId: string;
      changes: {
        title?: string;
        category?: FileCategory;
        reviewState?: ProjectOutputReviewState;
        dueDate?: string | null;
      };
    },
    null
  >("projectOutputs:update"),
  setArchived: makeFunctionReference<
    "mutation",
    { outputId: string; archived: boolean },
    null
  >("projectOutputs:setArchived"),
  addLinkedMediaVersion: makeFunctionReference<
    "mutation",
    {
      outputId: string;
      version: { id: string; url: string; title: string; notes?: string };
    },
    unknown
  >("projectOutputs:addLinkedMediaVersion"),
};

function wireVersion(outputId: string, wire: VersionWire): MediaVersion {
  const parsed = normalizeMediaUrl(wire.source.url);
  if (!parsed.ok) throw new Error(parsed.error);
  return {
    id: wire.id,
    projectOutputId: outputId,
    versionNumber: wire.versionNumber,
    source: parsed.value,
    label: wire.title,
    notes: wire.notes,
    createdAt: wire.createdAt,
  };
}

function wireSnapshot(wires: OutputWire[]): ProjectOutputSnapshot {
  const versions = wires.flatMap((wire) =>
    wire.versions.map((version) => wireVersion(wire.id, version))
  );
  return {
    outputs: wires.map((wire) => ({
      id: wire.id,
      projectId: wire.projectId,
      title: wire.title,
      category: wire.category,
      reviewState: wire.reviewState,
      archived: wire.archived,
      dueDate: wire.dueDate,
      currentVersionId: wire.currentVersion?.id,
      createdAt: wire.createdAt,
      updatedAt: wire.updatedAt,
      unresolvedOldVersionCommentCount: wire.unresolvedOldVersionCommentCount,
    })),
    versions,
    comments: [],
  };
}

function emptySnapshot(): ProjectOutputSnapshot {
  return { outputs: [], versions: [], comments: [] };
}

function readLocalSnapshot(): ProjectOutputSnapshot {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "null"
    );
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("outputs" in parsed) ||
      !("versions" in parsed) ||
      !("comments" in parsed)
    )
      return emptySnapshot();
    const value = parsed as Partial<ProjectOutputSnapshot>;
    return {
      outputs: Array.isArray(value.outputs) ? value.outputs : [],
      versions: Array.isArray(value.versions) ? value.versions : [],
      comments: Array.isArray(value.comments) ? value.comments : [],
    };
  } catch {
    return emptySnapshot();
  }
}

function writeLocalSnapshot(snapshot: ProjectOutputSnapshot) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function outputId(projectId: string, index: number) {
  return `${projectId}:output:${index + 1}`.slice(0, 80);
}

export function useProjectOutputs(project: WorkItem, editable: boolean) {
  const { isSignedIn } = useData();
  const { isAuthenticated } = useConvexAuth();
  const cloud = isSignedIn && isAuthenticated;
  const cloudWires = useQuery(
    outputApi.listForProject,
    cloud ? { projectId: project.id, includeArchived: true } : "skip"
  );
  const initializeCloud = useMutation(outputApi.initializeFromTemplate);
  const createCloud = useMutation(outputApi.create);
  const updateCloud = useMutation(outputApi.update);
  const archiveCloud = useMutation(outputApi.setArchived);
  const addVersionCloud = useMutation(outputApi.addLinkedMediaVersion);
  const [local, setLocal] = useState<ProjectOutputSnapshot>(emptySnapshot);
  const [localReady, setLocalReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLocal(readLocalSnapshot());
    setLocalReady(true);
  }, []);

  const snapshot = useMemo(() => {
    if (cloud) return cloudWires ? wireSnapshot(cloudWires) : emptySnapshot();
    const outputIds = new Set(
      local.outputs
        .filter((output) => output.projectId === project.id)
        .map((output) => output.id)
    );
    return {
      outputs: local.outputs.filter(
        (output) => output.projectId === project.id
      ),
      versions: local.versions.filter((version) =>
        outputIds.has(version.projectOutputId)
      ),
      comments: local.comments.filter((comment) =>
        local.versions.some(
          (version) =>
            outputIds.has(version.projectOutputId) &&
            version.id === comment.mediaVersionId
        )
      ),
    };
  }, [cloud, cloudWires, local, project.id]);

  const updateLocal = useCallback(
    (updater: (current: ProjectOutputSnapshot) => ProjectOutputSnapshot) => {
      setLocal((current) => {
        const next = updater(current);
        writeLocalSnapshot(next);
        return next;
      });
    },
    []
  );

  const port = useMemo<ProjectOutputsPort>(
    () => ({
      list: async () => snapshot,
      createOutput: async (command) => {
        const created = createProjectOutput(command);
        if (cloud)
          await createCloud({
            projectId: command.projectId,
            output: {
              id: command.id,
              title: command.title,
              category: command.category ?? "Deliverable",
              reviewState: "draft",
              dueDate: command.dueDate,
            },
          });
        else
          updateLocal((current) => ({
            ...current,
            outputs: [...current.outputs, created],
          }));
        return created;
      },
      updateOutput: async (command) => {
        const current = snapshot.outputs.find(
          (output) => output.id === command.outputId
        );
        if (!current) throw new Error("Project Output was not found.");
        const updated = updateProjectOutput(
          current,
          command,
          command.updatedAt
        );
        if (cloud)
          await updateCloud({
            outputId: command.outputId,
            changes: {
              title: command.title,
              category: command.category,
              dueDate: command.dueDate,
            },
          });
        else
          updateLocal((value) => ({
            ...value,
            outputs: value.outputs.map((output) =>
              output.id === updated.id ? updated : output
            ),
          }));
        return updated;
      },
      archiveOutput: async (command) => {
        const current = snapshot.outputs.find(
          (output) => output.id === command.outputId
        );
        if (!current) throw new Error("Project Output was not found.");
        const updated = {
          ...current,
          archived: command.archived,
          updatedAt: command.updatedAt,
        };
        if (cloud)
          await archiveCloud({
            outputId: command.outputId,
            archived: command.archived,
          });
        else
          updateLocal((value) => ({
            ...value,
            outputs: value.outputs.map((output) =>
              output.id === updated.id ? updated : output
            ),
          }));
        return updated;
      },
      setReviewState: async (command) => {
        const current = snapshot.outputs.find(
          (output) => output.id === command.outputId
        );
        if (!current) throw new Error("Project Output was not found.");
        const updated = setProjectOutputReviewState(
          current,
          command.reviewState,
          command.updatedAt
        );
        if (cloud)
          await updateCloud({
            outputId: command.outputId,
            changes: { reviewState: command.reviewState },
          });
        else
          updateLocal((value) => ({
            ...value,
            outputs: value.outputs.map((output) =>
              output.id === updated.id ? updated : output
            ),
          }));
        return updated;
      },
      addMediaVersion: async (command) => {
        const current = snapshot.outputs.find(
          (output) => output.id === command.outputId
        );
        if (!current) throw new Error("Project Output was not found.");
        const result = addMediaVersionFromUrl(current, snapshot.versions, {
          ...command,
          url: command.source.url,
        });
        if ("error" in result) throw new Error(result.error);
        if (cloud)
          await addVersionCloud({
            outputId: command.outputId,
            version: {
              id: command.id,
              url: command.source.url,
              title: command.label,
              notes: command.notes,
            },
          });
        else
          updateLocal((value) => ({
            ...value,
            outputs: value.outputs.map((output) =>
              output.id === result.output.id ? result.output : output
            ),
            versions: [...value.versions, result.version],
          }));
        return result;
      },
    }),
    [
      addVersionCloud,
      archiveCloud,
      cloud,
      createCloud,
      snapshot,
      updateCloud,
      updateLocal,
    ]
  );
  const controller = useMemo(
    () => createProjectOutputsController(port),
    [port]
  );

  useEffect(() => {
    if (!editable || (cloud ? cloudWires === undefined : !localReady)) return;
    const starters = project.templateDeliverables ?? [];
    const existingIds = new Set(snapshot.outputs.map(({ id }) => id));
    const outputs = starters
      .map((starter, index) => ({
        id: outputId(project.id, index),
        title: starter.title,
        category: starter.category,
        reviewState: starter.initialStatus,
        dueDate: project.dueDate,
      }))
      .filter(({ id }) => !existingIds.has(id));
    if (!outputs.length) return;
    if (cloud) {
      void initializeCloud({ projectId: project.id, outputs }).catch(
        (caught: unknown) =>
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not create template outputs."
          )
      );
    } else {
      const now = new Date().toISOString();
      updateLocal((current) => {
        const currentIds = new Set(current.outputs.map(({ id }) => id));
        const missing = outputs.filter(({ id }) => !currentIds.has(id));
        return {
          ...current,
          outputs: [
            ...current.outputs,
            ...missing.map((output) =>
              createProjectOutput({
                ...output,
                projectId: project.id,
                createdAt: now,
              })
            ),
          ],
        };
      });
    }
  }, [
    cloud,
    cloudWires,
    editable,
    initializeCloud,
    localReady,
    project.dueDate,
    project.id,
    project.templateDeliverables,
    snapshot.outputs,
    updateLocal,
  ]);

  const outputs = snapshot.outputs.filter((output) => !output.archived);
  return {
    outputs,
    versions: snapshot.versions,
    loading: cloud && cloudWires === undefined,
    error,
    clearError: () => setError(""),
    currentVersion: (output: ProjectOutput) =>
      selectCurrentMediaVersion(
        output,
        snapshot.versions.filter(
          (version) => version.projectOutputId === output.id
        )
      ),
    unresolvedOldComments: (output: ProjectOutput) =>
      output.unresolvedOldVersionCommentCount ??
      unresolvedOldVersionComments(output, snapshot.versions, snapshot.comments)
        .length,
    createOutput: controller.createOutput,
    updateOutput: controller.updateOutput,
    archiveOutput: (id: string) => controller.archiveOutput(id, true),
    setReviewState: controller.setReviewState,
    addMediaVersion: controller.addMediaVersion,
  };
}
