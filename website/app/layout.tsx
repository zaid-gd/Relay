import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import {
  siteUrl,
  siteTitle,
  siteDescription,
  siteOpenGraph,
} from "../lib/site-metadata";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Relay",
  title: siteTitle,
  description: siteDescription,
  keywords: [
    "video editing project management",
    "production workflow",
    "revision management",
    "Relay",
  ],
  openGraph: siteOpenGraph,
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/brand/relay/social-preview.png"],
  },
  icons: {
    icon: [
      {
        url: "/brand/relay/favicon-16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/brand/relay/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/brand/relay/favicon-64.png",
        sizes: "64x64",
        type: "image/png",
      },
    ],
    apple: "/brand/relay/app-icon-dark-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${geistMono.variable} ${display.variable}`}
      >
        <div className="site-content">{children}</div>
      </body>
    </html>
  );
}
