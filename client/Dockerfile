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

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with best practices for memory-constrained environments
# Using 'npm install' instead of 'npm ci' to handle potential lockfile mismatches and install devDependencies
RUN npm cache clean --force && \
    npm install --legacy-peer-deps --no-audit --no-fund --prefer-offline && \
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