import { v } from "convex/values";
import { waitlistAudienceValidator } from "./domainValidators";
import { internalMutation } from "./_generated/server";

const waitlistResultValidator = v.union(
  v.object({ kind: v.literal("joined") }),
  v.object({ kind: v.literal("already_joined") })
);

type WaitlistResult = { kind: "joined" } | { kind: "already_joined" };

export const join = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    audience: waitlistAudienceValidator,
  },
  returns: waitlistResultValidator,
  handler: async (ctx, args): Promise<WaitlistResult> => {
    const existing = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (query) => query.eq("email", args.email))
      .unique();

    if (existing) return { kind: "already_joined" };

    await ctx.db.insert("waitlistSignups", {
      ...args,
      source: "marketing_site",
      status: "pending",
      submittedAt: Date.now(),
    });
    return { kind: "joined" };
  },
});
