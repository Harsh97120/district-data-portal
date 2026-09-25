import type { NextConfig } from "next";
import tls from "tls";

// Ensure Node.js / OpenSSL sets TLS 1.2 as maximum protocol version for compatibility
// with MongoDB Atlas clusters and cloud providers that reject TLS 1.3 ClientHello with alert 80.
if (tls.DEFAULT_MAX_VERSION === "TLSv1.3") {
  tls.DEFAULT_MAX_VERSION = "TLSv1.2";
}

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
