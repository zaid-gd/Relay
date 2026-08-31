import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { storedProjectStatusValidator } from "./domainValidators";

const PUBLIC_PROFILE_PROJECT_LIMIT = 5;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9._-]{1,39}$/;

const publicProjectValidator = v.object({
  title: v.string(),
  status: storedProjectStatusValidator,
  workType: v.string(),
  dueDate: v.string(),
});

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, "").replace(/\s+/g, "-").replace(/[^a-z0-9._-]/g, "").slice(0, 40);
}

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    if (!slug) return null;
    const profile = await ctx.db
      .query("publicProfiles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!profile) return null;
    return {
      slug: profile.slug,
      studioName: profile.studioName,
      profileName: profile.profileName,
      profileUsername: profile.profileUsername,
      profileTitle: profile.profileTitle,
      profileBio: profile.profileBio,
      profileLocation: profile.profileLocation,
      profileImageUrl: profile.profileImageUrl,
      timeZone: profile.timeZone,
      activeProjects: profile.activeProjects,
      deliveredEdits: profile.deliveredEdits,
      avgTurnaroundDays: profile.avgTurnaroundDays,
      projects: profile.projects,
      updatedAt: profile.updatedAt,
    };
  },
});

export const publish = mutation({
  args: {
    slug: v.string(),
    studioName: v.string(),
    profileName: v.string(),
    profileUsername: v.string(),
    profileTitle: v.string(),
    profileBio: v.string(),
    profileLocation: v.string(),
    profileImageUrl: v.string(),
    timeZone: v.string(),
    activeProjects: v.number(),
    deliveredEdits: v.number(),
    avgTurnaroundDays: v.number(),
    projects: v.array(publicProjectValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to publish a public profile");
    const slug = normalizeSlug(args.slug);
    if (!SLUG_PATTERN.test(slug)) throw new Error("Choose a public username with 2-40 letters, numbers, dots, hyphens, or underscores");

    const existingBySlug = await ctx.db
      .query("publicProfiles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existingBySlug && existingBySlug.ownerUserId !== identity.subject) {
      throw new Error("That public profile username is already taken");
    }

    const existingByOwner = await ctx.db
      .query("publicProfiles")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", identity.subject))
      .unique();
    const now = new Date().toISOString();
    const snapshot = {
      ownerUserId: identity.subject,
      slug,
      studioName: args.studioName.trim(),
      profileName: args.profileName.trim(),
      profileUsername: args.profileUsername.trim(),
      profileTitle: args.profileTitle.trim(),
      profileBio: args.profileBio.trim(),
      profileLocation: args.profileLocation.trim(),
      profileImageUrl: args.profileImageUrl.trim(),
      timeZone: args.timeZone.trim(),
      activeProjects: Math.max(0, Math.floor(args.activeProjects)),
      deliveredEdits: Math.max(0, Math.floor(args.deliveredEdits)),
      avgTurnaroundDays: Math.max(0, Math.floor(args.avgTurnaroundDays)),
      projects: args.projects.slice(0, PUBLIC_PROFILE_PROJECT_LIMIT).map((project) => ({
        title: project.title.trim(),
        status: project.status,
        workType: project.workType.trim(),
        dueDate: project.dueDate.trim(),
      })),
      updatedAt: now,
    };

    if (existingByOwner) {
      await ctx.db.replace(existingByOwner._id, snapshot);
    } else {
      await ctx.db.insert("publicProfiles", snapshot);
    }

    return { slug };
  },
});
