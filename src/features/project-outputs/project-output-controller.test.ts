import { describe, expect, it } from "vitest";
import { InMemoryProjectOutputsAdapter } from "./project-output-in-memory";
import { createProjectOutputsController } from "./project-output-port";

describe("Project Outputs controller and adapter", () => {
  it("manages slots and versions without creating another Project or salary count", async () => {
    const adapter = new InMemoryProjectOutputsAdapter();
    const controller = createProjectOutputsController(adapter, () => "2026-08-24T10:00:00.000Z");
    const projects = [{ id: "project-1", salaryCount: 1 }];

    await controller.createOutput({ id: "output-1", projectId: "project-1", title: "Main video" });
    await controller.createOutput({ id: "output-2", projectId: "project-1", title: "Short cut" });
    await controller.setReviewState("output-1", "sent_to_client");
    await controller.addMediaVersion({ id: "version-1", outputId: "output-1", url: "https://vimeo.com/123456789" });
    await controller.addMediaVersion({ id: "version-2", outputId: "output-1", url: "https://vimeo.com/987654321" });

    const snapshot = await controller.list("project-1");
    expect(snapshot.outputs).toHaveLength(2);
    expect(snapshot.outputs[0]?.currentVersionId).toBe("version-2");
    expect(snapshot.versions).toHaveLength(2);
    expect(projects).toHaveLength(1);
    expect(projects[0]?.salaryCount).toBe(1);
  });
});
