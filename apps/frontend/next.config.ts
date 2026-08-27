import type { NextConfig } from 'next';
const config:NextConfig={distDir:process.env.NODE_ENV==='production'?'.next-build':'.next',...(process.env.CI?{output:'standalone' as const}:{}),async rewrites(){return[{source:'/api/:path*',destination:'http://127.0.0.1:4000/api/:path*'}]}};
export default config;
