# Build stage with memory optimization
FROM node:24-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Build-time environment variables (baked into Next.js bundle)
# These are passed via docker-compose build args from host environment
# Example: NEXT_PUBLIC_API_URL=http://47.79.78.229/api docker compose build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FRONTEND_URL
ARG NEXT_PUBLIC_API_SECRET
ARG NEXT_PUBLIC_PRODUCT_SLUG

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL
ENV NEXT_PUBLIC_API_SECRET=$NEXT_PUBLIC_API_SECRET
ENV NEXT_PUBLIC_PRODUCT_SLUG=$NEXT_PUBLIC_PRODUCT_SLUG

# =================================================================
# Memory Optimizations based on Next.js official guide
# =================================================================
# 1. Skip TypeScript checking (assume it's done in CI)
ENV SKIP_TYPECHECK=true

# 2. Node.js memory limit for 2GB servers with Swap
ENV NODE_OPTIONS="--max_old_space_size=3072"

# 3. Disable npm progress bar to save output buffer
ENV npm_config_loglevel=error

# 4. Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1
# ENV NODE_ENV=production (Removed to ensure devDependencies like tailwindcss are installed)

# 5. Configure npm registry (support custom registry via build ARG)
# Default: official npm registry (works globally)
# For China/HK, override at build time:
#   docker build --build-arg NPM_REGISTRY=https://registry.npmmirror.com/ .
ARG NPM_REGISTRY=https://registry.npmjs.org/

# Configure npm for better network stability and flexibility
RUN npm config set fetch-timeout 120000 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    npm config set registry "${NPM_REGISTRY}"

# Copy package files
COPY package.json package-lock.json ./

# Deep clean cache and install with retry logic
RUN rm -rf /root/.npm ~/.npm && \
    npm cache clean --force && \
    npm install --legacy-peer-deps --no-audit --no-fund --prefer-offline --timeout=120000 || \
    (echo "⚠️  First install failed, cleaning and retrying..." && \
     rm -rf /root/.npm node_modules && \
     npm cache clean --force && \
     npm install --legacy-peer-deps --no-audit --no-fund --timeout=120000) && \
    echo "✓ Dependencies installed successfully" && \
    npm ls tailwindcss postcss autoprefixer 2>&1 | head -20

# Copy the source code
COPY . .

# Build the application with optimizations configured in next.config.js
# Memory optimizations:
# - Source maps disabled
# - TypeScript checking disabled
# - Webpack cache optimized
RUN npm run build

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