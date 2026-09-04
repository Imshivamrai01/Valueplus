/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production builds default to `.next`, so deploys are unchanged.
  //
  // Set BUILD_DIST_DIR to give a second Next process its own output directory.
  // This applies to `next dev` just as much as `next build`: ANY two Next
  // processes sharing one `.next` will overwrite each other's chunk manifests,
  // and the browser then fails with ChunkLoadError. Use `npm run dev:isolated`
  // (or set BUILD_DIST_DIR yourself) whenever a second server runs alongside
  // your main `npm run dev`.
  distDir: process.env.BUILD_DIST_DIR || ".next",
  images: {
    remotePatterns: [],
  },
  // pdf-parse's CJS/ESM interop breaks when webpack bundles it into a server
  // route (`Object.defineProperty called on non-object` at import time) —
  // this tells Next to `require()` it directly at runtime instead of bundling
  // it, which is the documented fix for packages that don't survive bundling.
  serverExternalPackages: ["pdf-parse"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
