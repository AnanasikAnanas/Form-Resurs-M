import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  agentRules: false,
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  trailingSlash: true,
  images: { unoptimized: true },

};

export default config;
