# ==============================================================================
# Stage 1: Builder (Shared + Web PWA + NestJS API — skips Electron Desktop)
# ==============================================================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first for optimal Docker layer caching
COPY package.json package-lock.json tsconfig.base.json ./
COPY prisma ./prisma
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/desktop/package.json ./apps/desktop/

RUN npm ci

# Copy source code of cloud modules only (desktop is intentionally excluded)
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY apps/api ./apps/api

# Generate Prisma Client & clean-build shared -> web -> api
RUN npx prisma generate
RUN rm -f packages/shared/tsconfig.tsbuildinfo apps/api/*.tsbuildinfo \
 && npm run build --workspace=@youtube-engagement/shared \
 && npm run build --workspace=@youtube-engagement/web \
 && npm run build --workspace=@youtube-engagement/api

# Strip devDependencies and source files before copying to production image
RUN npm prune --omit=dev \
 && rm -rf apps/api/src apps/api/test packages/shared/src

# ==============================================================================
# Stage 2: Production Runner (Node 20 + Prisma Migrate + Litestream SQLite Sync)
# ==============================================================================
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/data/dev.db

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    wget \
  && ARCH="$(dpkg --print-architecture)" \
  && wget -qO /tmp/litestream.tar.gz "https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-${ARCH}.tar.gz" \
  && tar -C /usr/local/bin -xzf /tmp/litestream.tar.gz \
  && rm -f /tmp/litestream.tar.gz \
  && chmod +x /usr/local/bin/litestream \
  && npm install -g prisma@5.14.0 \
  && npm cache clean --force \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data

# Copy production runtime artifacts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Copy Litestream config and startup scripts (ensuring LF line endings)
COPY litestream.yml ./litestream.yml
COPY docker ./docker
RUN sed -i 's/\r$//' /app/docker/entrypoint.sh && chmod +x /app/docker/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/docker/entrypoint.sh"]
