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
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
