/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Skip the crashing TypeScript worker during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 2. Disable heavy file tracing (prevents hangs in Termux)
  experimental: {
    outputFileTracing: false,
  },

  // 3. Image configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'producthunt.com',
        pathname: '/widgets/embed-image/**',
      },
    ],
  },
};

module.exports = nextConfig;
