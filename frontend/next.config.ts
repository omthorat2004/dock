import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This repo has its own lockfile; without this Turbopack walks up and picks
  // the wrong workspace root.
  turbopack: { root: __dirname },
};

export default nextConfig;
