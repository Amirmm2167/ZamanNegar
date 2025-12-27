import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", 
  // 1. Disable Powered By header (security)
  poweredByHeader: false,
  // 2. optimize images to use fewer resources on the server
  images: {
    unoptimized: true, // SAVES CPU: Lets the browser load images as-is (optional but recommended for low-CPU VPS)
  },
  // 3. Enable React strict mode for better error catching
  reactStrictMode: true,
};

export default nextConfig;
