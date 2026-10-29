const { version } = require("./package.json");

const isDev = process.env.NODE_ENV !== "production";

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
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            // Next and the theme bootstrap use inline scripts, so script-src
            // allows 'unsafe-inline' (the policy's job is images, frames and
            // objects). connect-src admits HTTPS and HTTP because local Ollama
            // can run on a user-selected LAN address as well as loopback.
            // Workers are bundled (same origin); print frames are blob:.
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data:",
              "font-src 'self' data:",
              "connect-src 'self' https: http: blob: data:",
              "worker-src 'self' blob:",
              "frame-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
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
