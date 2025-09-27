// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /*
     * Allow remote images from Supabase public storage, e.g.:
     * https://<project-ref>.supabase.co/storage/v1/object/public/avatars/<path>
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
