import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/components/workspace-page/**/*.test.tsx",
      "src/components/subscription-plans.test.tsx",
      "src/lib/*.test.ts",
    ],
  },
});
