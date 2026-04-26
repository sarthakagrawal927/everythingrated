import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Wires the local Next.js dev server to Cloudflare bindings (D1, etc.)
// from wrangler.toml so `pnpm dev` hits the local D1.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  devIndicators: false,
  typedRoutes: false,
  images: { unoptimized: true },
};

export default nextConfig;
