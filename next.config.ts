import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
    ],
  },
  // Required for Mastra integration and Pesepay
  serverExternalPackages: ["@mastra/*", "pesepay"],
};

export default nextConfig;
