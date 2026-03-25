/** @type {import('next').NextConfig} */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8010";

const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8010",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE}/api/:path*`,
      },
      {
        source: "/metrics",
        destination: `${API_BASE}/metrics`,
      },
    ];
  },
};

module.exports = nextConfig;
