import {
  Accordion as OwnedAccordion,
  AccordionContent as OwnedAccordionContent,
  AccordionItem as OwnedAccordionItem,
  AccordionTrigger as OwnedAccordionTrigger,
} from "@/components/ui/accordion";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import {
  Dialog as OwnedDialog,
  DialogContent as OwnedDialogContent,
  DialogDescription as OwnedDialogDescription,
  DialogFooter as OwnedDialogFooter,
  DialogHeader as OwnedDialogHeader,
  DialogTitle as OwnedDialogTitle,
} from "@/components/ui/dialog";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input as OwnedInput } from "@/components/ui/input";
import {
  Select as OwnedSelect,
  SelectContent as OwnedSelectContent,
  SelectItem as OwnedSelectItem,
  SelectTrigger as OwnedSelectTrigger,
  SelectValue as OwnedSelectValue,
} from "@/components/ui/select";
import { Skeleton as OwnedSkeleton } from "@/components/ui/skeleton";
import { Switch as OwnedSwitch } from "@/components/ui/switch";
import { Textarea as OwnedTextarea } from "@/components/ui/textarea";
import {
  APPROVAL_STATUS_LABELS,
  approvalStatusLabel,
  FILE_CATEGORY_VALUES,
  FILE_STATUS_VALUES,
  type FileCategory,
  type FileStatus,
} from "@/lib/domain-values";
import { trackOptionalEvent } from "@/lib/telemetry";
import {
  normalizeOptionalTimecode,
  TIMECODE_FORMAT_HINT,
} from "@/lib/timecode";
import type { WorkItem } from "@/lib/types";
import { useAuth } from "@clerk/nextjs";
import {
  Clock3,
  Download,
  ExternalLink,
  FileText,
  History,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useProjectActivityAdapter,
  useProjectCommentsAdapter,
  useProjectFilesAdapter,
  type ProjectFileId,
} from "./project-cloud-adapter";
import type {
  ProjectActivityEvent,
  WorkspaceMemberOption,
} from "./project-view";
import { ProjectSelect } from "@/features/projects/project-select";

const R2_STORAGE_ENABLED = false;
const MAX_SAFE_PROJECT_FILE_BYTES = 20 * 1024 * 1024;
const TEAM_PROJECT_COMMENT_LIMIT = 1000;

export function ProjectActivityFeed({
  project,
  localActivity,
}: {
  project: WorkItem;
  localActivity: ProjectActivityEvent[];
}) {
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
    events,
  } = useProjectActivityAdapter(project.id);

  return (
    <aside className="min-h-0 overflow-y-auto border-t bg-muted/20 p-4 lg:border-l lg:border-t-0 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Project Activity</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Automatic history across the project lifecycle.
          </p>
        </div>
        <History className="size-5 text-primary" aria-hidden="true" />
      </div>
      <div className="mt-5">
        {isConvexAuthLoading ? (
          <p className="text-sm text-muted-foreground">
            Connecting activity history...
          </p>
        ) : !isConvexAuthenticated ? (
          localActivity.length ? (
            localActivity.map((event, index) => (
              <ActivityFeedItem
                key={event.id}
                actor={event.actorName}
                message={event.message}
                detail={event.detail}
                createdAt={event.createdAt}
                last={index === localActivity.length - 1}
              />
            ))
          ) : (
            <ActivityFeedItem
              actor="Local workspace"
              message={`${project.title} is ready for its first update.`}
              createdAt={project.createdAt ?? new Date().toISOString()}
              last
            />
          )
        ) : events === undefined ? (
          <div className="grid gap-2">
            <OwnedSkeleton className="h-20" />
            <OwnedSkeleton className="h-20" />
          </div>
        ) : events.length ? (
          events.map((event, index) => (
            <ActivityFeedItem
              key={event._id}
              actor={event.actorName}
              message={event.message}
              detail={event.detail}
              createdAt={event.createdAt}
              last={index === events.length - 1}
            />
          ))
        ) : (
          <ActivityFeedItem
            actor="Relay"
            message={`${project.title} is ready for its first update.`}
            createdAt={project.createdAt ?? new Date().toISOString()}
            last
          />
        )}
      </div>
    </aside>
  );
}

function ActivityFeedItem({
  actor,
  message,
  detail,
  createdAt,
  last,
}: {
  actor: string;
  message: string;
  detail?: string;
  createdAt: string;
  last?: boolean;
}) {
  return (
    <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-x-2">
      <div className="relative flex justify-center">
        <span className="z-10 mt-1 size-2.5 rounded-full border-2 border-background bg-primary ring-1 ring-primary" />
        {!last ? (
          <span className="absolute bottom-[-4px] top-4 w-px bg-border" />
        ) : null}
      </div>
      <div className={last ? "" : "pb-5"}>
        <p className="text-sm leading-relaxed">{message}</p>
        {detail ? (
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {detail}
          </p>
        ) : null}
        <p className="mt-1 text-[11px] text-muted-foreground">
          {actor} · {formatShortDateTime(createdAt)}
        </p>
      </div>
    </div>
  );
}

export function ProjectFileManager({
  project,
  canEdit,
}: {
  project: WorkItem;
  canEdit: boolean;
}) {
  const { has } = useAuth();
  const [showArchived, setShowArchived] = useState(false);
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
    files: fileData,
    generateUploadUrl,
    saveStorageVersion,
    createR2UploadUrl,
    completeR2Upload,
    createR2DownloadUrl,
    updateFile,
    archiveFile,
    restoreFile,
    removeFile,
    parseStorageId,
  } = useProjectFilesAdapter(project.id, showArchived);
  const [view, setView] = useState<"files" | "history">("files");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetFileId, setTargetFileId] = useState<ProjectFileId | undefined>();
  const [browserFile, setBrowserFile] = useState<File | null>(null);
  const [category, setCategory] = useState<FileCategory>("Deliverable");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<FileStatus>("draft");
  const [clientVisible, setClientVisible] = useState(false);
  const [downloadable, setDownloadable] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const useR2Storage =
    R2_STORAGE_ENABLED &&
    process.env.NEXT_PUBLIC_FILE_STORAGE_PROVIDER === "r2";
  const canUploadFiles = has({ plan: "creator" }) || has({ plan: "studio" });

  useEffect(() => {
    if (!fileData) return;
    const bytes = fileData.retainedBytes;
    const usageBucket =
      bytes === 0
        ? "empty"
        : bytes < 1_000_000
          ? "under_1mb"
          : bytes < 10_000_000
            ? "under_10mb"
            : bytes < 50_000_000
              ? "under_50mb"
              : bytes < 200_000_000
                ? "under_200mb"
                : "over_200mb";
    trackOptionalEvent("storage_consumption", {
      provider: useR2Storage ? "r2" : "convex",
      usageBucket,
    });
  }, [fileData, useR2Storage]);

  const files = fileData?.files ?? [];
  const filteredFiles =
    categoryFilter === "All"
      ? files
      : files.filter((file) => file.category === categoryFilter);

  function resetForm() {
    setTargetFileId(undefined);
    setBrowserFile(null);
    setCategory("Deliverable");
    setTitle("");
    setDescription("");
    setStatus("draft");
    setClientVisible(false);
    setDownloadable(false);
    setNotes("");
    setError("");
  }

  function openNewFile() {
    resetForm();
    setDialogOpen(true);
  }

  function openNewVersion(file: NonNullable<typeof fileData>["files"][number]) {
    resetForm();
    setTargetFileId(file._id);
    setCategory(file.category);
    setTitle(file.title);
    setDescription(file.description);
    setStatus(file.status);
    setClientVisible(file.clientVisible);
    setDownloadable(file.downloadable);
    setDialogOpen(true);
  }

  async function saveFileVersion() {
    if (!canEdit || !isConvexAuthenticated) return;
    if (!title.trim()) {
      setError("File title is required.");
      return;
    }
    setBusy("save");
    setError("");
    try {
      const shared = {
        projectId: project.id,
        projectFileId: targetFileId,
        category,
        title,
        description,
        status,
        clientVisible: category === "Deliverable" && clientVisible,
        downloadable,
        notes,
      };
      if (!browserFile) throw new Error("Choose a file to upload.");
      if (browserFile.size > MAX_SAFE_PROJECT_FILE_BYTES)
        throw new Error("Files must be 20 MB or smaller.");
      if (
        fileData?.workspaceLimitBytes &&
        fileData.retainedBytes + browserFile.size > fileData.workspaceLimitBytes
      ) {
        throw new Error(
          "Workspace storage limit reached. Permanently delete archived files before uploading more."
        );
      }
      const mimeType = browserFile.type || "application/octet-stream";
      if (useR2Storage) {
        const upload = await createR2UploadUrl({
          projectId: project.id,
          projectFileId: targetFileId,
          fileName: browserFile.name,
          mimeType,
        });
        const response = await fetch(upload.url, {
          method: "PUT",
          headers: { "Content-Type": mimeType },
          body: browserFile,
        });
        if (!response.ok) throw new Error("R2 file upload failed.");
        await completeR2Upload({
          ...shared,
          sessionId: upload.sessionId,
          fileName: browserFile.name,
          mimeType,
        });
      } else {
        const uploadUrl = await generateUploadUrl({ projectId: project.id });
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": mimeType },
          body: browserFile,
        });
        if (!response.ok) throw new Error("File upload failed.");
        const storageId = parseStorageId(await response.json());
        await saveStorageVersion({
          ...shared,
          storageId,
          fileName: browserFile.name,
          mimeType,
        });
      }
      setDialogOpen(false);
      resetForm();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save this file."
      );
    } finally {
      setBusy("");
    }
  }

  async function changeFileMetadata(
    file: NonNullable<typeof fileData>["files"][number],
    overrides: Partial<{
      status: FileStatus;
      clientVisible: boolean;
      downloadable: boolean;
    }>
  ) {
    setBusy(`status-${file._id}`);
    setError("");
    try {
      await updateFile({
        fileId: file._id,
        category: file.category,
        title: file.title,
        description: file.description,
        status: overrides.status ?? file.status,
        clientVisible: overrides.clientVisible ?? file.clientVisible,
        downloadable: overrides.downloadable ?? file.downloadable,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update file status."
      );
    } finally {
      setBusy("");
    }
  }

  async function deleteProjectFile(fileId: ProjectFileId) {
    if (
      !window.confirm(
        "Permanently delete this file and every retained version? This frees its storage and cannot be undone."
      )
    )
      return;
    setBusy(`remove-${fileId}`);
    setError("");
    try {
      await removeFile({ fileId });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not remove this file."
      );
    } finally {
      setBusy("");
    }
  }

  async function changeArchiveState(fileId: ProjectFileId, archived: boolean) {
    setBusy(`archive-${fileId}`);
    setError("");
    try {
      if (archived) await restoreFile({ fileId });
      else await archiveFile({ fileId });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update this file."
      );
    } finally {
      setBusy("");
    }
  }

  async function openVersion(
    version: NonNullable<typeof fileData>["uploadHistory"][number]
  ) {
    try {
      const url =
        version.url ??
        (version.provider === "r2"
          ? await createR2DownloadUrl({ versionId: version._id })
          : null);
      if (!url) throw new Error("This file is no longer available.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not open this file."
      );
    }
  }

  return (
    <>
      <section className="mt-4 rounded-lg border bg-card p-4 text-card-foreground">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="size-5 text-primary" aria-hidden="true" />
              <h3 className="font-semibold">Project Files</h3>
              <OwnedBadge variant="secondary">{files.length} files</OwnedBadge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Deliverables, references, assets, uploads, and every saved version
              in one project model.
            </p>
            {fileData?.workspaceLimitBytes ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatFileSize(fileData.retainedBytes)} retained of{" "}
                {formatFileSize(fileData.workspaceLimitBytes)}. Archived files
                still count.
              </p>
            ) : null}
          </div>
          {canEdit && isConvexAuthenticated && canUploadFiles ? (
            <div className="flex flex-wrap gap-2">
              <OwnedButton type="button" onClick={openNewFile}>
                <Upload aria-hidden="true" />
                Upload File
              </OwnedButton>
            </div>
          ) : canEdit && isConvexAuthenticated ? (
            <OwnedButton asChild variant="outline">
              <Link href="/subscription">Upgrade to upload files</Link>
            </OwnedButton>
          ) : null}
        </div>

        <div
          className="mt-4 flex border-b"
          role="tablist"
          aria-label="Project file view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "files"}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${view === "files" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setView("files")}
          >
            Files
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "history"}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${view === "history" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setView("history")}
          >
            Upload History
          </button>
        </div>

        {isConvexAuthLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            Connecting project files...
          </div>
        ) : !isConvexAuthenticated ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Sign in to upload and synchronize project files. Existing
            integration links remain available above.
          </p>
        ) : fileData === undefined ? (
          <div className="mt-4 grid gap-2">
            <OwnedSkeleton className="h-20 rounded-md" />
            <OwnedSkeleton className="h-20 rounded-md" />
          </div>
        ) : view === "files" ? (
          <>
            <div
              className="my-4 flex flex-wrap gap-2"
              aria-label="Filter project files by category"
            >
              {["All", ...FILE_CATEGORY_VALUES].map((item) => (
                <OwnedButton
                  key={item}
                  type="button"
                  size="sm"
                  variant={categoryFilter === item ? "secondary" : "outline"}
                  aria-pressed={categoryFilter === item}
                  onClick={() => setCategoryFilter(item)}
                >
                  {item}
                </OwnedButton>
              ))}
              <OwnedButton
                type="button"
                size="sm"
                variant={showArchived ? "secondary" : "outline"}
                aria-pressed={showArchived}
                onClick={() => setShowArchived((current) => !current)}
              >
                {showArchived ? "Hide archived" : "Show archived"}
              </OwnedButton>
            </div>
            {filteredFiles.length ? (
              <OwnedAccordion type="multiple" className="grid gap-2">
                {filteredFiles.map((file) => {
                  const latest = file.versions[0];
                  return (
                    <OwnedAccordionItem
                      key={file._id}
                      value={file._id}
                      data-testid="project-file-card"
                      data-file-title={file.title}
                      className="rounded-md border bg-muted/20 px-3 last:border-b"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <OwnedAccordionTrigger className="min-w-0 flex-1 py-3 hover:no-underline">
                          <div className="min-w-0 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-semibold">
                                {file.title}
                              </span>
                              <OwnedBadge variant="secondary">
                                {file.category}
                              </OwnedBadge>
                              {file.archived ? (
                                <OwnedBadge variant="outline">
                                  Archived
                                </OwnedBadge>
                              ) : null}
                              {file.clientVisible ? (
                                <OwnedBadge
                                  variant={
                                    file.status === "draft"
                                      ? "outline"
                                      : "default"
                                  }
                                >
                                  {file.status === "draft"
                                    ? "Share when sent"
                                    : "Client visible"}
                                </OwnedBadge>
                              ) : null}
                            </div>
                            <p className="mt-1 truncate text-xs font-normal text-muted-foreground">
                              {latest
                                ? `${latest.fileName} · v${latest.versionNumber} · ${formatFileSize(latest.size)} · ${latest.uploadedByName}`
                                : "No versions"}
                            </p>
                          </div>
                        </OwnedAccordionTrigger>
                        <div
                          className="flex items-center gap-2 pb-3 sm:pb-0"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {canEdit ? (
                            <OwnedSelect
                              value={file.status}
                              onValueChange={(nextStatus) => {
                                const status = FILE_STATUS_VALUES.find(
                                  (candidate) => candidate === nextStatus
                                );
                                if (status)
                                  void changeFileMetadata(file, { status });
                              }}
                            >
                              <OwnedSelectTrigger
                                size="sm"
                                aria-label={`Approval state for ${file.title}`}
                                className="w-[164px] max-w-full"
                              >
                                <OwnedSelectValue>
                                  {approvalStatusLabel(file.status)}
                                </OwnedSelectValue>
                              </OwnedSelectTrigger>
                              <OwnedSelectContent position="popper">
                                {FILE_STATUS_VALUES.map((option) => (
                                  <OwnedSelectItem key={option} value={option}>
                                    {APPROVAL_STATUS_LABELS[option] ?? option}
                                  </OwnedSelectItem>
                                ))}
                              </OwnedSelectContent>
                            </OwnedSelect>
                          ) : (
                            <OwnedBadge variant="outline">
                              {approvalStatusLabel(file.status)}
                            </OwnedBadge>
                          )}
                          {latest &&
                          (latest.url || latest.provider === "r2") ? (
                            <OwnedButton
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => void openVersion(latest)}
                              aria-label={`Open ${file.title}`}
                            >
                              <Download aria-hidden="true" />
                            </OwnedButton>
                          ) : null}
                        </div>
                      </div>
                      <OwnedAccordionContent className="pb-3">
                        {file.description ? (
                          <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                            {file.description}
                          </p>
                        ) : null}
                        <div className="grid">
                          {file.versions.map((version) => (
                            <div
                              key={version._id}
                              className="flex flex-col justify-between gap-2 border-t py-3 sm:flex-row"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  Version {version.versionNumber} ·{" "}
                                  {version.fileName}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {providerLabel(version.provider)} ·{" "}
                                  {formatFileSize(version.size)} ·{" "}
                                  {formatShortDateTime(version.uploadedAt)} ·{" "}
                                  {version.uploadedByName}
                                </p>
                                <p
                                  className={`mt-1 text-xs ${version.status ? "text-primary" : "text-muted-foreground"}`}
                                >
                                  {version.status
                                    ? approvalStatusLabel(version.status)
                                    : "Approval state not recorded"}
                                </p>
                                {version.notes ? (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {version.notes}
                                  </p>
                                ) : null}
                              </div>
                              {version.url || version.provider === "r2" ? (
                                <OwnedButton
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="self-start sm:self-center"
                                  onClick={() => void openVersion(version)}
                                >
                                  Open
                                  <ExternalLink aria-hidden="true" />
                                </OwnedButton>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        {canEdit && canUploadFiles ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <OwnedButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openNewVersion(file)}
                            >
                              <Upload aria-hidden="true" />
                              Upload Version
                            </OwnedButton>
                            {file.category === "Deliverable" ? (
                              <>
                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <OwnedSwitch
                                    checked={file.clientVisible}
                                    onCheckedChange={(checked) =>
                                      changeFileMetadata(file, {
                                        clientVisible: checked,
                                      })
                                    }
                                    aria-label={
                                      file.status === "draft"
                                        ? "Share when sent"
                                        : "Client visible"
                                    }
                                  />
                                  {file.status === "draft"
                                    ? "Share when sent"
                                    : "Client visible"}
                                </label>
                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <OwnedSwitch
                                    checked={file.downloadable}
                                    onCheckedChange={(checked) =>
                                      changeFileMetadata(file, {
                                        downloadable: checked,
                                      })
                                    }
                                    aria-label="Downloadable"
                                  />
                                  Downloadable
                                </label>
                              </>
                            ) : null}
                            <OwnedButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="sm:ml-auto"
                              onClick={() =>
                                void changeArchiveState(file._id, file.archived)
                              }
                              disabled={busy === `archive-${file._id}`}
                            >
                              {file.archived ? "Restore" : "Archive"}
                            </OwnedButton>
                            {file.archived ? (
                              <OwnedButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => void deleteProjectFile(file._id)}
                                disabled={busy === `remove-${file._id}`}
                              >
                                Delete permanently
                              </OwnedButton>
                            ) : null}
                          </div>
                        ) : null}
                      </OwnedAccordionContent>
                    </OwnedAccordionItem>
                  );
                })}
              </OwnedAccordion>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">
                No{" "}
                {categoryFilter === "All"
                  ? "project files"
                  : `${categoryFilter.toLowerCase()} files`}{" "}
                yet.
              </p>
            )}
          </>
        ) : (
          <div className="mt-4 grid">
            {fileData.uploadHistory.length ? (
              fileData.uploadHistory.map((version) => {
                const file = files.find(
                  (item) => item._id === version.projectFileId
                );
                return (
                  <div
                    key={version._id}
                    className="flex gap-3 border-b py-3 last:border-b-0"
                  >
                    <History
                      className="mt-0.5 size-5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {file?.title ?? version.fileName} · Version{" "}
                        {version.versionNumber}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {version.fileName} · {formatFileSize(version.size)} ·
                        uploaded by {version.uploadedByName} ·{" "}
                        {formatShortDateTime(version.uploadedAt)}
                      </p>
                      <p
                        className={`mt-1 text-xs ${version.status ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {version.status
                          ? approvalStatusLabel(version.status)
                          : "Approval state not recorded"}
                      </p>
                    </div>
                    {version.url || version.provider === "r2" ? (
                      <OwnedButton
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void openVersion(version)}
                        aria-label={`Open ${file?.title ?? version.fileName} version ${version.versionNumber}`}
                      >
                        <ExternalLink aria-hidden="true" />
                      </OwnedButton>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="py-2 text-sm text-muted-foreground">
                Upload history will appear after the first file or linked
                version is added.
              </p>
            )}
          </div>
        )}
        {error && !dialogOpen ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </section>

      <OwnedDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !busy) setDialogOpen(false);
        }}
      >
        <OwnedDialogContent className="max-h-[min(92dvh,760px)] overflow-y-auto border-border bg-background text-foreground sm:max-w-xl">
          <OwnedDialogHeader>
            <OwnedDialogTitle>
              {targetFileId ? "Add File Version" : "Add Project File"}
            </OwnedDialogTitle>
            <OwnedDialogDescription>
              Add an uploaded file or external file link while preserving its
              version history.
            </OwnedDialogDescription>
          </OwnedDialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {!targetFileId ? (
                <ProjectSelect
                  label="Category"
                  value={category}
                  options={FILE_CATEGORY_VALUES}
                  onChange={(value) => {
                    setCategory(value);
                    if (value !== "Deliverable") setClientVisible(false);
                  }}
                />
              ) : null}
              <ProjectSelect
                label="Approval state"
                value={status}
                options={FILE_STATUS_VALUES}
                labels={APPROVAL_STATUS_LABELS}
                onChange={setStatus}
              />
            </div>
            <FieldLayout label="File title" required>
              <OwnedInput
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={Boolean(targetFileId)}
              />
            </FieldLayout>
            {!targetFileId ? (
              <FieldLayout label="Description">
                <OwnedTextarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  density="compact"
                />
              </FieldLayout>
            ) : null}

            <OwnedButton asChild variant="outline" className="justify-start">
              <label>
                <Upload aria-hidden="true" />
                {browserFile ? browserFile.name : "Choose file"}
                <input
                  className="sr-only"
                  type="file"
                  accept=".pdf,.txt,.md,.markdown,.jpg,.jpeg,.png,.webp"
                  onChange={(event) =>
                    setBrowserFile(event.target.files?.[0] ?? null)
                  }
                />
              </label>
            </OwnedButton>
            <FieldLayout label="Version notes">
              <OwnedTextarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                density="compact"
              />
            </FieldLayout>
            {!targetFileId && category === "Deliverable" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <OwnedSwitch
                    checked={clientVisible}
                    onCheckedChange={setClientVisible}
                    aria-label={
                      status === "draft"
                        ? "Share when sent"
                        : "Show in Client Portal"
                    }
                  />
                  {status === "draft"
                    ? "Share when sent"
                    : "Show in Client Portal"}
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <OwnedSwitch
                    checked={downloadable}
                    onCheckedChange={setDownloadable}
                    aria-label="Allow download"
                  />
                  Allow download
                </label>
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <OwnedDialogFooter>
            <OwnedButton
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={Boolean(busy)}
            >
              Cancel
            </OwnedButton>
            <OwnedButton
              type="button"
              onClick={saveFileVersion}
              disabled={Boolean(busy)}
            >
              {busy ? "Saving..." : targetFileId ? "Add Version" : "Save File"}
            </OwnedButton>
          </OwnedDialogFooter>
        </OwnedDialogContent>
      </OwnedDialog>
    </>
  );
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function providerLabel(provider: string) {
  if (provider === "google_drive") return "Google Drive";
  if (provider === "dropbox") return "Dropbox";
  if (provider === "frame_io") return "Frame.io";
  if (provider === "convex") return "Relay Upload";
  if (provider === "r2") return "Cloudflare R2";
  return "External Link";
}

export function formatShortDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ProjectDetailCollaborationPanel({
  project,
  teamMembers,
  canComment,
}: {
  project: WorkItem;
  teamMembers: WorkspaceMemberOption[];
  canComment: boolean;
}) {
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
    comments: projectComments,
    addComment: addProjectComment,
  } = useProjectCommentsAdapter(project.teamId, project.id);
  const [commentBody, setCommentBody] = useState("");
  const [commentTimecode, setCommentTimecode] = useState("");
  const [commentError, setCommentError] = useState("");
  const assignedMembers = teamMembers.filter((member) =>
    (project.assigneeUserIds ?? []).includes(member.userId)
  );

  async function postComment() {
    if (!isConvexAuthenticated || !project.teamId || !commentBody.trim())
      return;
    setCommentError("");
    try {
      const normalizedTimecode = normalizeOptionalTimecode(commentTimecode);
      await addProjectComment({
        teamId: project.teamId,
        projectId: project.id,
        body: commentBody,
        ...(normalizedTimecode ? { timecode: normalizedTimecode } : {}),
      });
      trackOptionalEvent("comment_added", { surface: "team" });
      setCommentBody("");
      setCommentTimecode("");
    } catch (error) {
      setCommentError(
        error instanceof Error ? error.message : "Could not post comment."
      );
    }
  }

  if (!project.teamId) {
    return null;
  }

  return (
    <section className="mt-4 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row">
        <div>
          <h3 className="font-semibold">Team Collaboration</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Assignments and project comments sync to the team workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {assignedMembers.length ? (
            assignedMembers.map((member) => (
              <OwnedBadge key={member.userId} variant="secondary">
                {member.name || member.email}
              </OwnedBadge>
            ))
          ) : (
            <OwnedBadge variant="outline">Unassigned</OwnedBadge>
          )}
        </div>
      </div>

      <div className="mb-4 grid max-h-72 gap-2 overflow-y-auto pr-1">
        {isConvexAuthLoading ? (
          <p className="text-sm text-muted-foreground">
            Connecting Team comments...
          </p>
        ) : !isConvexAuthenticated ? (
          <p role="alert" className="text-sm text-destructive">
            Team comments require Convex auth. Check Team sync before posting
            comments.
          </p>
        ) : projectComments === undefined ? (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        ) : projectComments.length ? (
          projectComments.map((comment) => (
            <article
              key={comment._id}
              className="rounded-md border bg-background p-3"
            >
              <p className="text-sm font-semibold">
                {comment.authorName}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {formatShortDateTime(comment.createdAt)}
                </span>
              </p>
              <ProjectTimecodeBadge value={comment.timecode} />
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                {comment.body}
              </p>
            </article>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No comments yet. Add a note for the team or mention someone with
            @name.
          </p>
        )}
      </div>

      {canComment ? (
        <div className="grid items-start gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
          <FieldLayout
            label="Timecode (optional)"
            description={TIMECODE_FORMAT_HINT}
          >
            <OwnedInput
              value={commentTimecode}
              placeholder="00:12"
              maxLength={8}
              inputMode="text"
              onChange={(event) => {
                setCommentTimecode(event.target.value);
                if (commentError) setCommentError("");
              }}
            />
          </FieldLayout>
          <FieldLayout
            label="Team comment"
            error={commentError || undefined}
            description={`${commentBody.length}/${TEAM_PROJECT_COMMENT_LIMIT} characters · Use @name or @emailname to notify a teammate.`}
          >
            <OwnedTextarea
              value={commentBody}
              maxLength={TEAM_PROJECT_COMMENT_LIMIT}
              onChange={(event) => setCommentBody(event.target.value)}
            />
          </FieldLayout>
          <OwnedButton
            type="button"
            className="md:mt-6"
            disabled={!isConvexAuthenticated || !commentBody.trim()}
            onClick={postComment}
          >
            Post
          </OwnedButton>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Your team role can view comments but cannot add new ones.
        </p>
      )}
    </section>
  );
}

function ProjectTimecodeBadge({ value }: { value?: string | null }) {
  if (!value) return null;
  return (
    <OwnedBadge variant="secondary" className="mt-2">
      <Clock3 aria-hidden="true" />
      {value}
    </OwnedBadge>
  );
}
