/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  poweredByHeader: false,
  
  // ==== Memory Optimizations (for low-memory Docker builds) ====
  // Disable source maps to reduce build memory
  productionBrowserSourceMaps: false,
  experimental: {
    serverSourceMaps: false,
  },
  
  // Disable TypeScript type checking during build (done in CI separately)
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPECHECK === 'true',
  },
  
  // Webpack memory optimization
  webpack: (config, { dev }) => {
    if (!dev) {
      // Memory optimizations for production build
      config.cache = {
        type: 'memory',
        maxAge: 3600000, // 1 hour
      }
      
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
