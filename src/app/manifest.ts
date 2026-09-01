import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Relay",
    short_name: "Relay",
    description:
      "A focused production workspace for video editors and small teams.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/brand/relay/app-icon-dark-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/relay/app-icon-dark-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/brand/relay/app-icon-dark-1024.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
