import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/features/projects/**/*.test.ts", "src/components/precision-projects.test.tsx"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("../../", import.meta.url)) },
  },
});
