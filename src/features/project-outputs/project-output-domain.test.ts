import { describe, expect, it } from "vitest";
import {
  addMediaVersion,
  createProjectOutput,
  normalizeMediaUrl,
  unresolvedOldVersionComments,
} from "./project-output-domain";

const output = createProjectOutput({
  id: "output-1",
  projectId: "project-1",
  title: "Main video",
  createdAt: "2026-08-24T10:00:00.000Z",
});
describe("Project Output domain", () => {
  it("normalizes supported providers and preserves ordinary links", () => {
    expect(normalizeMediaUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      ok: true,
      value: {
        provider: "youtube",
        videoId: "dQw4w9WgXcQ",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      },
    });
    expect(normalizeMediaUrl("https://player.vimeo.com/video/123456789")).toEqual({
      ok: true,
      value: {
        provider: "vimeo",
        videoId: "123456789",
        url: "https://vimeo.com/123456789",
        embedUrl: "https://player.vimeo.com/video/123456789",
      },
    });
    expect(normalizeMediaUrl("http://example.com/review?id=4")).toEqual({
      ok: true,
      value: { provider: "external", url: "http://example.com/review?id=4" },
    });
    expect(normalizeMediaUrl('<iframe src="https://youtube.com/embed/dQw4w9WgXcQ"></iframe>').ok).toBe(false);
    expect(normalizeMediaUrl("https://www.youtube.com/watch?v=bad").ok).toBe(false);
  });

  it("makes each added version current while retaining earlier history", () => {
    const first = addMediaVersion(output, [], {
      id: "version-1",
      source: { provider: "external", url: "https://example.com/one" },
      createdAt: "2026-08-24T10:01:00.000Z",
    });
    expect("error" in first).toBe(false);
    if ("error" in first) return;

    const second = addMediaVersion(first.output, [first.version], {
      id: "version-2",
      source: { provider: "youtube", videoId: "dQw4w9WgXcQ", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" },
      createdAt: "2026-08-24T10:02:00.000Z",
    });
    expect("error" in second).toBe(false);
    if ("error" in second) return;
    expect(second.output.currentVersionId).toBe("version-2");
    expect(second.version.versionNumber).toBe(2);
  });

  it("keeps unresolved comments on old versions visible to internal users", () => {
    const current = { ...output, currentVersionId: "version-2" };
    const comments = [
      { id: "comment-old", mediaVersionId: "version-1", body: "Fix the title card.", resolved: false, createdAt: "2026-08-24T10:01:00.000Z" },
      { id: "comment-old-resolved", mediaVersionId: "version-1", body: "Looks good.", resolved: true, createdAt: "2026-08-24T10:01:00.000Z" },
      { id: "comment-current", mediaVersionId: "version-2", body: "Check the mix.", resolved: false, createdAt: "2026-08-24T10:02:00.000Z" },
    ];
    expect(unresolvedOldVersionComments(current, [], comments).map((comment) => comment.id)).toEqual(["comment-old"]);
  });
});
