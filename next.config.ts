import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only set for the Playwright E2E build (see playwright.config.ts) — a
  // real dev server may already be watching the default .next/ directory,
  // and this repo has already hit real Windows file-lock conflicts from
  // two Next processes touching the same build directory (see AGENTS.md's
  // failure log). A separate dist dir sidesteps that entirely instead of
  // requiring the dev server to be stopped first.
  distDir: process.env.E2E_DIST_DIR ?? ".next",
};

export default nextConfig;
