import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  images: {
    // Allow remote avatars and logos used in demo data and UI
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
  // YouTube thumbnail hosts
  { protocol: "https", hostname: "i.ytimg.com" },
  { protocol: "https", hostname: "yt3.ggpht.com" },
      // Add other common demo/image CDNs here if needed later
      // { protocol: "https", hostname: "images.unsplash.com" },
      // { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
