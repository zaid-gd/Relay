import { describe, expect, it } from "vitest";
import { readPublicPortalAccess } from "./client-portal-view";

describe("public Client Portal boundary", () => {
  it("renders only the allowlisted current-version contract and clear access states", () => {
    expect(readPublicPortalAccess({ access: "invalid_token" })).toEqual({ kind: "invalid" });
    expect(readPublicPortalAccess({ access: "closed" })).toEqual({ kind: "closed" });
    expect(readPublicPortalAccess({ access: "expired" })).toEqual({ kind: "expired" });
    expect(readPublicPortalAccess({ access: "invalid_pin" })).toEqual({ kind: "pin-required", wrongPin: true });

    expect(readPublicPortalAccess({
      access: "active",
      project: { title: "Launch film", stage: "Review", progress: 75, publicNotes: "Ready for review", notes: "private", earnings: 9000 },
      outputs: [{
        id: "main",
        title: "Main film",
        reviewState: "sent_to_client",
        currentVersion: { id: "v2", title: "Review cut", source: { kind: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, notes: "private" },
        versions: [{ id: "v1" }],
      }],
    })).toEqual({
      kind: "active",
      portal: {
        title: "Launch film",
        notes: "Ready for review",
        stage: "Review",
        progress: 75,
        outputs: [{
          id: "main",
          title: "Main film",
          reviewState: "sent_to_client",
          currentVersion: { id: "v2", label: "Review cut", source: { provider: "YouTube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } },
        }],
      },
    });
  });
});
