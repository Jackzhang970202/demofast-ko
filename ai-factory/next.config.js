/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 instrumentation hook（Next.js 15+ 默认启用）
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;