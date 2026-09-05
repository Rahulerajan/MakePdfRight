# Multi-stage build for MakePDFRight on Google Cloud Run

# Stage 1: Build application assets and server bundle
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (sharp, better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests and install all dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy application source code
COPY . .

# Run production build (Vite client build, prerendering, and esbuild server bundle)
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Production runner image
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Install runtime dependencies for canvas/sharp if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests and install production-only dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled distribution output from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=builder /app/package.json ./package.json

# Environment variables for Cloud Run
ENV NODE_ENV=production
ENV PORT=3000

# Cloud Run defaults to port 8080 or 3000 via PORT environment variable
EXPOSE 3000

# Run as non-root user for security
USER node

# Start the unified production server
CMD ["node", "dist/server.cjs"]
