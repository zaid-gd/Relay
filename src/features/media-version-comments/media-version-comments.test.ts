import { describe, expect, it } from "vitest";
import { commentsForVersion, unresolvedCommentsForVersion } from "./media-version-comments";
import { parseMediaVersionComments } from "./media-version-comments-data";

const comments = [
  { id: "old", outputId: "output", mediaVersionId: "v1", authorName: "Client", body: "Fix title", resolved: false, createdAt: "2026-08-24T10:00:00.000Z" },
  { id: "new", outputId: "output", mediaVersionId: "v2", authorName: "Editor", body: "Updated", resolved: true, createdAt: "2026-08-24T11:00:00.000Z" },
];

describe("Media Version Comments seam", () => {
  it("keeps comments tied to their Media Version", () => {
    expect(commentsForVersion(comments, "v1").map((comment) => comment.id)).toEqual(["old"]);
    expect(unresolvedCommentsForVersion(comments, "v1").map((comment) => comment.id)).toEqual(["old"]);
  });

  it("parses only comment rows from a transport response", () => {
    expect(parseMediaVersionComments({ comments: [...comments, { body: "missing id" }] })).toEqual(comments);
  });

  it("keeps malformed transport rows out of the internal history", () => {
    expect(parseMediaVersionComments([
      ...comments,
      { id: "missing-version", body: "cannot be attached" },
    ])).toEqual(comments);
  });
});
