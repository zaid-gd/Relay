import { v } from "convex/values";
import { internal } from "./_generated/api";
import { env, internalAction } from "./_generated/server";

function clerkOrganization(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  ) {
    return { id: value.id };
  }
  throw new Error("Clerk returned an invalid Organization");
}

function organizationSlug(workspaceId: string) {
  return `relay-${workspaceId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export const provision = internalAction({
  args: {
    workspaceId: v.id("teamWorkspaces"),
    workspaceName: v.string(),
    clerkUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!env.CLERK_SECRET_KEY) {
      await ctx.runMutation(
        internal.workspaceSubscriptions.markRepairRequired,
        { workspaceId: args.workspaceId }
      );
      return null;
    }
    try {
      const headers = {
        Authorization: `Bearer ${env.CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      };
      const slug = organizationSlug(args.workspaceId);
      const existing = await fetch(
        `https://api.clerk.com/v1/organizations/${slug}`,
        { headers }
      );
      const response = existing.ok
        ? existing
        : await fetch("https://api.clerk.com/v1/organizations", {
            method: "POST",
            headers,
            body: JSON.stringify({
              name: args.workspaceName,
              slug,
              created_by: args.clerkUserId,
              private_metadata: { relayWorkspaceId: args.workspaceId },
            }),
          });
      if (!response.ok)
        throw new Error(
          `Clerk Organization creation failed: ${response.status}`
        );
      const organization = clerkOrganization(await response.json());
      await ctx.runMutation(
        internal.workspaceSubscriptions.linkClerkOrganization,
        {
          workspaceId: args.workspaceId,
          clerkOrganizationId: organization.id,
        }
      );
    } catch {
      await ctx.runMutation(
        internal.workspaceSubscriptions.markRepairRequired,
        { workspaceId: args.workspaceId }
      );
    }
    return null;
  },
});
