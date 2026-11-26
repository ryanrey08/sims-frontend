import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second dev server (e.g. for automated screenshots) build into its own
  // folder so it never clobbers the `.next` cache of the one you run yourself.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The Docker image builds a self-contained server (see Dockerfile).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
