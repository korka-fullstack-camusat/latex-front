import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // In development, proxy /api/* → backend to avoid CORS issues.
  // In production, set NEXT_PUBLIC_API_URL to the real backend URL instead.
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
