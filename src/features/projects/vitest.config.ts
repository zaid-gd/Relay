import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/features/projects/**/*.test.ts", "src/features/project-outputs/**/*.test.ts", "src/app/client-portal/**/*.test.ts", "src/components/precision-projects.test.tsx", "src/lib/workflow-templates.test.ts"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("../../", import.meta.url)) },
  },
});
