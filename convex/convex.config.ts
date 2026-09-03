import { defineApp } from "convex/server";
import { v } from "convex/values";
import migrations from "@convex-dev/migrations/convex.config.js";

const app = defineApp({
  env: {
    CLERK_SECRET_KEY: v.optional(v.string()),
  },
});

app.use(migrations);

export default app;
