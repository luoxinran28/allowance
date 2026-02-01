# Use the official Node.js slim image as the base image for better memory management
FROM node:24-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Clean npm cache and install dependencies with memory optimization
RUN npm cache clean --force && npm ci --legacy-peer-deps --no-audit --no-fund --prefer-offline

# Copy the source code
COPY . .

# Build the application with increased memory limit and build optimizations
ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV NEXT_TELEMETRY_DISABLED=1
# Disable Turbopack explicitly for production builds
ENV TURBO_FORCE=false
# Additional Next.js v16 optimizations
ENV NEXT_WEBPACK_USEPOLLING=0
ENV NEXT_WEBPACK_BUILD_WORKER=1
# Reduce memory usage by disabling some features
ENV NODE_ENV=production
# Use less aggressive garbage collection
ENV NODE_GC_INTERVAL=100
RUN npx next build --webpack

# Use a smaller base image for the final stage
FROM node:24-slim AS runner

# Set the working directory
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy the built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ensure public directory exists
RUN mkdir -p public

# Switch to the non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3030

# Set environment variables
ENV PORT=3030
ENV NODE_ENV=production

# Command to run the application
CMD ["node", "server.js"]