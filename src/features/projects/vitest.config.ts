import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/features/projects/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": new URL("../../../", import.meta.url).pathname },
  },
});
