import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const config: NextConfig = {
  images: {
    // Cloudflare Workers has no built-in image optimizer: serve images as they are.
    unoptimized: process.env.BUILD_TARGET === "cloudflare",
    // Vercel Blob (admin uploads in production).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  // Lets the Cloudflare build pick Prisma's Workers (WASM) client instead of the Node one.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
