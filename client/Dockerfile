# =============================================================================
# Allowance Client - Production Dockerfile (Multi-stage)
# =============================================================================
# Build args (passed via docker-compose.prod.yml):
# - NEXT_PUBLIC_API_URL: Allowance API URL
# - NEXT_PUBLIC_FRONTEND_URL: Allowance frontend URL
# =============================================================================

FROM node:18-alpine as builder

WORKDIR /app

# Build arguments for Next.js (embedded at build time)
ARG NEXT_PUBLIC_API_URL=http://localhost:4040
ARG NEXT_PUBLIC_FRONTEND_URL=http://localhost:3030

# Set as environment variables for the build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the source code
COPY . .

# Build the application
RUN npm run build

# Use a smaller base image for the final stage
FROM node:18-alpine as runner

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