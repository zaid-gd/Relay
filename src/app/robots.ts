import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account",
        "/api/early-access",
        "/calendar",
        "/client-portal/",
        "/clients",
        "/early-access",
        "/feedback",
        "/integrations",
        "/media",
        "/organization",
        "/profile",
        "/projects",
        "/reports",
        "/resources",
        "/settings",
        "/team",
        "/team-chat",
        "/templates",
        "/timeline",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
