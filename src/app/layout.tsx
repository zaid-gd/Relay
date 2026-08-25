import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { siteUrl } from "@/lib/site";
import { Providers } from "./providers";
import "./globals.css";

const siteTitle = "Relay | Video Production Workspace for Editors";
const siteDescription = "Plan edits, track deadlines, manage client feedback, organize media, and monitor production work in one focused workspace built for video editors.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Relay",
  title: siteTitle,
  description: siteDescription,
  keywords: ["video editing", "project tracker", "local-first", "editing workflow", "salary batch"],
  authors: [{ name: "Relay" }],
  creator: "Relay",
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    url: "/",
    siteName: "Relay",
    images: [
      {
        url: "/og-image.png",
        width: 1600,
        height: 900,
        alt: "Relay dashboard overview"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og-image.png"]
  },
  icons: {
    icon: [
      { url: "/brand/icons/app-icon-dark-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icons/app-icon-dark-64.png", sizes: "64x64", type: "image/png" }
    ],
    shortcut: "/brand/icons/app-icon-dark-32.png",
    apple: "/brand/icons/app-icon-dark-256.png"
  }
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Relay",
  url: siteUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: siteDescription,
  image: `${siteUrl}/og-image.png`,
  publisher: {
    "@type": "Organization",
    name: "Relay",
    url: siteUrl,
    email: "Cutlab.Studios@gmail.com"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1F4F2" },
    { media: "(prefers-color-scheme: dark)", color: "#090C0D" }
  ]
};

const themeBootScript = `
(function () {
  try {
    var raw = window.localStorage.getItem("video-editing-work-tracker:settings:v1");
    var settings = raw ? JSON.parse(raw) : {};
    var theme = ["Light", "Dark", "System"].indexOf(settings.theme) >= 0 ? settings.theme : "Dark";
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = theme === "Dark" || (theme === "System" && prefersDark);
    var root = document.documentElement;
    root.style.colorScheme = isDark ? "dark" : "light";
    root.dataset.theme = isDark ? "dark" : "light";
    root.classList.toggle("dark", isDark);
    root.classList.toggle("relay-density-compact", settings.density === "Compact");
    root.classList.toggle("relay-density-balanced", settings.density !== "Compact");
  } catch {}
})();
`;

const clerkModalCenteringCss = `
[class*="cl-modalBackdrop"] {
  align-items: center !important;
  display: flex !important;
  justify-content: center !important;
  min-height: 100dvh !important;
  padding: 24px !important;
}

[class*="cl-modalContent"] {
  margin: auto !important;
  max-height: calc(100dvh - 48px) !important;
}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <Script id="cutlab-theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
        <style data-clerk-modal-centering dangerouslySetInnerHTML={{ __html: clerkModalCenteringCss }} />
      </head>
      <body
        className="antialiased"
        style={{
          margin: 0,
          background: "var(--app-canvas)",
          color: "var(--app-ink)",
          fontFamily: "var(--font-geist-sans), Geist, sans-serif"
        }}
      >
        <a className="skip-link" href="#main-content">
          Skip to workspace content
        </a>
        <Providers
          clerkPublishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          convexUrl={process.env.NEXT_PUBLIC_CONVEX_URL}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
