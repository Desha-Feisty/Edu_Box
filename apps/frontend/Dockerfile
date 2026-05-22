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
# Stage 2: Builder — compile frontend
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy installed node_modules from installer
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/package.json ./package.json
COPY --from=installer /app/package-lock.json ./package-lock.json

# Copy source code
COPY apps/frontend apps/frontend
COPY packages/shared packages/shared
COPY apps/backend/package.json apps/backend/

# Build frontend
WORKDIR /app/apps/frontend
RUN npm run build

# ============================================
# Stage 3: Nginx — serve built static files
# ============================================
FROM nginx:alpine

# Remove default nginx configs
RUN rm -f /etc/nginx/conf.d/default.conf /etc/nginx/nginx.conf

# Copy custom nginx configs
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built frontend assets
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Prepare writable directories for non-root nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 8080

USER nginx

CMD ["nginx", "-g", "daemon off;"]
