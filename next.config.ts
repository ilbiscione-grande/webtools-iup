import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
    workerThreads: false,
  },
  typescript: {
    tsconfigPath: process.env.NEXT_TSCONFIG_PATH || "tsconfig.json",
  },
};

export default nextConfig;
