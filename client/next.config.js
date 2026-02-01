/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  poweredByHeader: false,
  // Force webpack instead of Turbopack for compatibility
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
      // Reduce memory usage
      config.cache = false;
      // Limit parallel processing
      config.parallelism = 2;
    }
    return config;
  },
  // Additional memory optimizations
  images: {
    unoptimized: true, // Reduce memory usage during build
  },
};

module.exports = nextConfig;
