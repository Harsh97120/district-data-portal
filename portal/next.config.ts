import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: false, // Leaflet breaks with StrictMode's double-invoke of effects
  reactCompiler: true,
  images: {
    unoptimized: true, // required for static export
  },
  // Ensure trailing slash for static hosting compatibility
  trailingSlash: true,
};

export default nextConfig;
