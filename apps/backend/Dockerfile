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
RUN npm ci

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
# Stage 3: Production — minimal runtime image
# ============================================
FROM node:22-alpine AS production

# Create non-root user
RUN addgroup --system --gid 1001 nodegroup && \
    adduser --system --uid 1001 nodeuser

WORKDIR /app

# Copy production dependencies
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/

# Install ONLY production dependencies
RUN npm ci --omit=dev && \
    rm -f package-lock.json

# Copy built backend output
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Copy shared package source (it's used as source, not compiled)
COPY --from=builder /app/packages/shared ./packages/shared

# No need to copy public/ or docs/ — those are development-only
# (public serving is already gated behind !isProduction)

# Switch to non-root user
USER nodeuser

EXPOSE 3000

WORKDIR /app/apps/backend
CMD ["node", "dist/server.js"]
