"use client";

import { ExternalLink, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { WorkspaceFile } from "@/features/workspace-discovery/workspace-discovery";
import { filterWorkspaceFiles } from "@/features/workspace-discovery/workspace-discovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContent, PageHeader } from "@/components/workspace-page";

export type PrecisionFilesProps = {
  files: readonly WorkspaceFile[];
  projectTitles?: Readonly<Record<string, string>>;
  loading?: boolean;
  onOpenProject?: (projectId: string) => void;
};

function fileSizeLabel(file: WorkspaceFile) {
  return [file.category, file.status].filter(Boolean).join(" · ");
}

/** Workspace-wide read-only file index. File writes stay in Project Workspace. */
export function PrecisionFiles({ files, projectTitles = {}, loading = false, onOpenProject }: PrecisionFilesProps) {
  const [query, setQuery] = useState("");
  const visibleFiles = useMemo(() => filterWorkspaceFiles(files, query), [files, query]);

  return (
    <PageContent className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Files"
        description="Find project material across the Workspace. Add, update, version, share, archive, and delete files from their owning Project."
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files, names, or categories" aria-label="Search workspace files" className="pl-9" />
        </label>
        <p className="shrink-0 text-xs text-muted-foreground" aria-live="polite">{visibleFiles.length} active {visibleFiles.length === 1 ? "file" : "files"}</p>
      </div>
      {loading ? <p className="py-12 text-center text-sm text-muted-foreground">Loading workspace files…</p> : visibleFiles.length ? (
        <div className="divide-y rounded-md border" role="list" aria-label="Workspace files">
          {visibleFiles.map((file) => (
            <div key={file.id} role="listitem" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{file.fileName || "No filename"} · {fileSizeLabel(file)}</p>
                  <p className="truncate text-xs text-muted-foreground">{projectTitles[file.projectId] || "Project"}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {onOpenProject ? <Button type="button" variant="outline" size="sm" onClick={() => onOpenProject(file.projectId)}>Open Project</Button> : null}
                {file.url ? <Button type="button" variant="ghost" size="icon" aria-label={`Open ${file.title}`} onClick={() => window.open(file.url, "_blank", "noopener,noreferrer")}><ExternalLink className="size-4" /></Button> : null}
              </div>
            </div>
          ))}
        </div>
      ) : <div className="border-y py-12 text-center"><p className="text-sm font-medium">No matching files</p><p className="mt-1 text-xs text-muted-foreground">Files will appear here after they are added to a Project.</p></div>}
    </PageContent>
  );
}
