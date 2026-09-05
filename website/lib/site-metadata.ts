import type { Metadata } from "next";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://web.relay-app.cc.cd";

export const siteTitle = "Relay | Production workspace for video editors";
export const siteDescription =
  "Relay helps freelance video editors and small teams plan work, manage review, and deliver.";

export const siteOpenGraph = {
  title: siteTitle,
  description: siteDescription,
  type: "website",
  siteName: "Relay",
  images: [
    {
      url: "/brand/relay/social-preview.png",
      width: 1600,
      height: 900,
      alt: "Relay. From first cut to final handoff.",
    },
  ],
} satisfies Metadata["openGraph"];
