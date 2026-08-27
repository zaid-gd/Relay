"use client";

import { useState, type FormEvent } from "react";
import { Check, MessageCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { commentsForVersion, type MediaVersionComment, type MediaVersionSummary } from "@/features/media-version-comments/media-version-comments";

function commentDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date) : "Recently";
}

function CommentRow({ comment, action, busy }: { comment: MediaVersionComment; action?: () => Promise<void>; busy?: boolean }) {
  return (
    <article className="border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium"><MessageCircle className="size-4 text-muted-foreground" aria-hidden="true" />{comment.authorName}</div>
        <div className="flex items-center gap-2"><Badge variant="outline">{comment.resolved ? "Resolved" : "Open"}</Badge><time className="text-xs text-muted-foreground" dateTime={comment.createdAt}>{commentDate(comment.createdAt)}</time></div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{comment.body}</p>
      {action ? <Button type="button" size="sm" variant="ghost" className="mt-3" disabled={busy} onClick={() => void action()}>{comment.resolved ? <RotateCcw aria-hidden="true" /> : <Check aria-hidden="true" />}{busy ? "Saving..." : comment.resolved ? "Reopen" : "Resolve"}</Button> : null}
    </article>
  );
}

export function PublicMediaVersionComments({
  versionId,
  comments,
  displayName,
  onDisplayNameChange,
  onClearDisplayName,
  onSubmit,
  onReopen,
  busyCommentId,
  busy = false,
  loading = false,
  disabled = false,
}: {
  versionId: string;
  comments: readonly MediaVersionComment[];
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onClearDisplayName: () => void;
  onSubmit: (body: string) => Promise<void>;
  onReopen: (commentId: string) => Promise<void>;
  busyCommentId?: string;
  busy?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const currentComments = commentsForVersion(comments, versionId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayName.trim()) { setError("Enter your display name before commenting."); return; }
    if (!body.trim()) { setError("Write a comment before sending it."); return; }
    setError("");
    try { await onSubmit(body.trim()); setBody(""); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not add the comment."); }
  }

  async function reopen(commentId: string) {
    setError("");
    try { await onReopen(commentId); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not reopen the comment."); }
  }

  return (
    <section aria-labelledby={`comments-${versionId}`} className="mt-5 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h4 id={`comments-${versionId}`} className="text-sm font-semibold">Comments</h4><span className="text-xs text-muted-foreground">{currentComments.length} {currentComments.length === 1 ? "thread" : "threads"}</span></div>
      <p className="mt-1 text-xs text-muted-foreground">Comments attach to this Media Version. Your display name is unverified and visible to the editor.</p>
      {loading ? <p role="status" className="mt-3 text-sm text-muted-foreground">Loading comments...</p> : null}
      <div className="mt-3 grid gap-2">{currentComments.length ? currentComments.map((comment) => <CommentRow key={comment.id} comment={comment} busy={busyCommentId === comment.id} action={comment.resolved && !disabled ? () => reopen(comment.id) : undefined} />) : <p className="border border-dashed border-border p-4 text-sm text-muted-foreground">No comments on this version yet.</p>}</div>
      {!disabled && !loading ? <form onSubmit={(event) => void submit(event)} className="mt-4 grid gap-3 border border-border bg-muted/20 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor={`comment-name-${versionId}`} className="text-sm font-medium">Display name</label>{displayName ? <Button type="button" size="sm" variant="ghost" onClick={onClearDisplayName}>Clear saved name</Button> : null}</div><input id={`comment-name-${versionId}`} value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} maxLength={120} autoComplete="name" className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /><label htmlFor={`comment-body-${versionId}`} className="text-sm font-medium">Comment</label><Textarea id={`comment-body-${versionId}`} value={body} onChange={(event) => { setBody(event.target.value); setError(""); }} maxLength={2000} placeholder="Describe what needs attention" /><p className="text-xs text-muted-foreground">This name is not verified as your identity.</p>{error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}<Button type="submit" disabled={!displayName.trim() || !body.trim() || busy}>{busy ? "Sending..." : "Add comment"}</Button></form> : null}
    </section>
  );
}

export function MediaVersionComments({ versions, comments, onResolve, loading = false, readOnly = false }: { versions: readonly MediaVersionSummary[]; comments: readonly MediaVersionComment[]; onResolve?: (commentId: string, resolved: boolean) => Promise<void>; loading?: boolean; readOnly?: boolean }) {
  const [busyCommentId, setBusyCommentId] = useState("");
  const [error, setError] = useState("");
  if (loading) return <section aria-label="Media Version comments" className="border-t border-border pt-4"><p role="status" className="text-sm text-muted-foreground">Loading review history...</p></section>;
  if (!versions.length) return null;
  async function update(comment: MediaVersionComment) {
    if (!onResolve) return;
    setBusyCommentId(comment.id); setError("");
    try { await onResolve(comment.id, !comment.resolved); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update the comment."); } finally { setBusyCommentId(""); }
  }
  return <section data-testid="media-version-review-history" aria-labelledby="internal-media-comments" className="border-t border-border pt-4"><div className="flex items-center justify-between gap-3"><h3 id="internal-media-comments" className="text-sm font-semibold">Review history</h3><span className="text-xs text-muted-foreground">{comments.length} comments</span></div><p className="mt-1 text-xs text-muted-foreground">Older Media Versions remain internal so unresolved requests are not lost.</p>{error ? <p role="alert" className="mt-3 text-xs text-destructive">{error}</p> : null}<div className="mt-4 grid gap-4">{versions.map((version) => { const versionComments = commentsForVersion(comments, version.id); return <details key={version.id} open={version.current || versionComments.some((comment) => !comment.resolved)} className="border border-border"><summary className="cursor-pointer list-none p-3 text-sm"><span className="font-medium">v{version.versionNumber} · {version.label}</span><span className="ml-2 text-xs text-muted-foreground">{version.current ? "Current" : "Internal history"} · {versionComments.length} {versionComments.length === 1 ? "comment" : "comments"}</span></summary><div className="grid gap-2 border-t border-border p-3">{versionComments.length ? versionComments.map((comment) => <CommentRow key={comment.id} comment={comment} busy={busyCommentId === comment.id} action={!readOnly && onResolve ? () => update(comment) : undefined} />) : <p className="text-sm text-muted-foreground">No comments on this version.</p>}</div></details>; })}</div></section>;
}
