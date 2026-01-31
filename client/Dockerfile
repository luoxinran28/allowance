# Use the official Node.js slim image as the base image for better memory management
FROM node:24-slim AS builder

# Set the working directory
WORKDIR /app

# Copy only package.json (ignore package-lock.json to get fresh dependencies)
COPY package.json ./

# Clean npm cache and install dependencies with fresh resolution
RUN npm cache clean --force && npm install --legacy-peer-deps

# Copy the source code (but delete node_modules if it was copied)
COPY . .
RUN rm -rf node_modules && npm install --legacy-peer-deps

# Build the application with increased memory limit and parallel processing disabled
ENV NODE_OPTIONS="--max-old-space-size=4096 --max-old-space-size-semispace=512"
ENV NEXT_TELEMETRY_DISABLED=1
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