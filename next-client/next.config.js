const { version } = require("./package.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Versions the service worker's cache (see public/sw.js).
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },

  // The service worker must always be revalidated so updates reach users.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },

  // 1. Skip the crashing TypeScript worker during build
  typescript: {
    ignoreBuildErrors: false,
  },

  // 3. Image configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "producthunt.com",
        pathname: "/widgets/embed-image/**",
      },
    ],
  },
};

module.exports = nextConfig;
