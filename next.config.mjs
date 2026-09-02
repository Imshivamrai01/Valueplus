/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production builds default to `.next`, so deploys are unchanged. Setting
  // BUILD_DIST_DIR lets a verification build write somewhere else, so running
  // `next build` never overwrites the chunks a running `next dev` is serving
  // (which shows up in the browser as ChunkLoadError).
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
