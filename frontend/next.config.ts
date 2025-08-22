import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // Allow remote avatars and logos used in demo data and UI
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      // Add other common demo/image CDNs here if needed later
      // { protocol: "https", hostname: "images.unsplash.com" },
      // { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
