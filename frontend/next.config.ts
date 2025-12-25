import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", 
  deploymentId: process.env.GIT_COMMIT_HASH || "latest",
};

export default nextConfig;
