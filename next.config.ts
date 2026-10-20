import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Menghasilkan folder .next/standalone agar mudah di-deploy ke server
  output: 'standalone',
};

export default nextConfig;
