import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://accounts.relay-app.cc.cd https://challenges.cloudflare.com https://*.protect.clerk.com https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "img-src 'self' data: blob: https:",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://*.clerk.accounts.dev https://*.clerk.com https://clerk.relay-app.cc.cd https://challenges.cloudflare.com https://*.protect.clerk.com https://static.cloudflareinsights.com https://js.stripe.com https://checkout.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.clerk.accounts.dev https://*.clerk.com https://clerk.relay-app.cc.cd https://*.protect.clerk.com:* https://clerk-telemetry.com https://cloudflareinsights.com https://api.stripe.com https://m.stripe.network https://r.stripe.com https://q.stripe.com https://checkout.stripe.com",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    root,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
