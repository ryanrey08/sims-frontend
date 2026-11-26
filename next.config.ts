import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second dev server (e.g. for automated screenshots) build into its own
  // folder so it never clobbers the `.next` cache of the one you run yourself.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
