import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Separate dir for the E2E build avoids Windows file-lock clashes with a running dev server.
  distDir: process.env.E2E_DIST_DIR ?? ".next",
};

export default nextConfig;
