import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "a.ppy.sh" },
      { protocol: "https", hostname: "assets.ppy.sh" },
      { protocol: "https", hostname: "osu.ppy.sh" },
    ],
  },
};

export default nextConfig;
