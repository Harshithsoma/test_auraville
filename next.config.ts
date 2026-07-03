import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**"
      }
    ]
  },
  experimental: {
    optimizePackageImports: ["zustand"]
  },
  async headers() {
    const publicAssetHeaders = [
      {
        key: "Cache-Control",
        value: "public, max-age=86400, stale-while-revalidate=604800"
      }
    ];

    return [
      {
        source: "/hero/:path*",
        headers: publicAssetHeaders
      },
      {
        source: "/sections/:path*",
        headers: publicAssetHeaders
      }
    ];
  }
};

export default nextConfig;
