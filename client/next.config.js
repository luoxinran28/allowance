/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Optimize for Next.js v16 build performance
  experimental: {
    // Explicitly disable Turbopack for production builds to reduce memory usage
    turbo: false,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Additional build optimizations for v16
  swcMinify: true,
  poweredByHeader: false,
  // Reduce bundle analysis overhead
  webpack: (config, { dev }) => {
    if (!dev) {
      // Optimize production build
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
