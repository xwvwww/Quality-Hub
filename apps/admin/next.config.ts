import type { NextConfig } from 'next';

const config: NextConfig = {
  ...(process.env.CI ? { output: 'standalone' as const } : {}),
  async rewrites() {
    return [
      { source: '/api/auth/login', destination: 'http://127.0.0.1:4000/api/auth/admin/login' },
      { source: '/api/auth/logout', destination: 'http://127.0.0.1:4000/api/auth/admin/logout' },
      { source: '/api/:path*', destination: 'http://127.0.0.1:4000/api/:path*' },
    ];
  },
};

export default config;
