import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/media-topfinanzas-com/**",
      },
    ],
  },
};

export default nextConfig;
