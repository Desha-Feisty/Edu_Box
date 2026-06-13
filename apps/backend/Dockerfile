# ============================================
# Stage 1: Installer — resolve monorepo deps
# ============================================
FROM node:22-alpine AS installer

WORKDIR /app

# Copy root lockfile + workspace manifests
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --no-audit --no-fund

# ============================================
# Stage 2: Builder — compile TypeScript
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy installed node_modules from installer
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/package.json ./package.json
COPY --from=installer /app/package-lock.json ./package-lock.json

# Copy source code
COPY apps/backend apps/backend
COPY packages/shared packages/shared
COPY apps/frontend/package.json apps/frontend/

# Build backend TypeScript
WORKDIR /app/apps/backend
RUN npm run build

# ============================================
# Stage 3: Production deps — install only production dependencies
# ============================================
FROM node:22-alpine AS deps-prod

WORKDIR /app

# Copy root lockfile + workspace manifests
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/

# Install ONLY production dependencies, then clean up caches
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force && \
    rm -f package-lock.json

# ============================================
# Stage 4: Production — minimal runtime image (distroless)
# ============================================
FROM gcr.io/distroless/nodejs22-debian12 AS production

WORKDIR /app

# Copy production node_modules (includes workspace symlinks)
COPY --from=deps-prod --chown=65532:65532 /app/node_modules ./node_modules

# Copy built backend output
COPY --from=builder --chown=65532:65532 /app/apps/backend/dist ./apps/backend/dist

# Copy shared package source (symlink target from node_modules)
COPY --from=builder --chown=65532:65532 /app/packages/shared ./packages/shared

# Set production environment
ENV NODE_ENV=production

EXPOSE 3000

USER 65532

WORKDIR /app/apps/backend
CMD ["dist/server.js"]
