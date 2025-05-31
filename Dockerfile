# ---- Build Stage ----
FROM node:20-slim AS builder

LABEL stage="builder"
LABEL maintainer="Jules <devnull@google.com>"
LABEL description="Build stage for Digital Signage application"

# Install Bun and move executable to /usr/local/bin for easy access
# Also clean up apt cache to reduce layer size
RUN apt-get update && \
    apt-get install -y curl unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun/bin/bun /usr/local/bin/bun && \
    rm -rf /root/.bun

WORKDIR /app

# Copy files required for installing dependencies and building the application
# These are typically package manager files, configs for build tools, and TypeScript configs.
COPY package.json bun.lockb ./
COPY next.config.js ./
COPY tsconfig.json ./
COPY tsconfig.server.json ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY components.json ./

# Copy .env.example to .env for the build if the build process requires it (e.g., placeholder values).
# Actual sensitive env vars should be passed during build time if needed by next.config.js,
# or at runtime for the application itself. Avoid committing actual .env files with secrets.
COPY .env.example .env

# Install all dependencies (including devDependencies needed for the build)
# Using --frozen-lockfile ensures that the exact versions from bun.lockb are used.
# Using --prefer-offline will use the cache if available, speeding up repeated builds.
RUN bun install --frozen-lockfile --prefer-offline

# Copy the rest of the application source code
# This ensures that all source files are available for the build process.
COPY . .

# Run the production build command as defined in package.json
RUN bun run build

# ---- Runtime Stage ----
# Use an official Bun image based on Alpine Linux for a smaller final image size.
# Using a specific version tag like 1.1-alpine is recommended over 'latest-alpine' for reproducibility.
FROM oven/bun:1.1-alpine AS runner

LABEL stage="runner"
LABEL maintainer="Jules <devnull@google.com>"
LABEL description="Runtime stage for Digital Signage application using Bun on Alpine"

WORKDIR /app

# Set environment variables for production mode
ENV NODE_ENV=production
ENV ENVIRON=PROD

# Create a non-root user and group for security purposes.
# Alpine's addgroup/adduser syntax: -S creates a system user/group.
# Using fixed GID/UIDs (e.g., 1001) can be helpful for managing permissions with volumes.
RUN addgroup -S --gid 1001 appgroup && \
    adduser -S -u 1001 -G appgroup appuser

# Copy built application artifacts and necessary configuration files from the builder stage.
# --chown ensures that the files are owned by the appuser, which is good practice.
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/.next ./.next
COPY --from=builder --chown=appuser:appgroup /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/next.config.js ./
COPY --from=builder --chown=appuser:appgroup /app/keys.ts ./keys.ts # Assumed to be needed by the server at runtime

# Copy package.json and bun.lockb to install only production dependencies
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/bun.lockb ./bun.lockb

# Copy static assets like uploads. If these are frequently changing, large,
# or need to persist across container restarts, consider using a Docker volume
# in your docker-compose.yml or deployment strategy instead of copying them into the image.
COPY --from=builder --chown=appuser:appgroup /app/uploads ./uploads

# Switch to the non-root user before running any further commands (like bun install)
USER appuser

# Install only production dependencies. Bun is already available in this base image.
# --frozen-lockfile and --prefer-offline are used for consistency and speed.
RUN bun install --production --frozen-lockfile --prefer-offline

# Expose the port the backend server runs on (defined in server.ts, typically 3001)
EXPOSE 3001

# Command to start the production server. This comes from package.json's "start" or "prod" script logic.
CMD ["bun", "dist/server.js"]
