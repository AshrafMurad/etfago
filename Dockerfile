# Multi-stage Dockerfile for Etfago
# Designed for single VPS deployment with persistent private server filesystem (NO S3)
# See docs/07-private-server-file-storage.md & docs/11-deployment-and-operations.md

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# 1. Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml* .npmrc* ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile=false

# 2. Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN pnpm db:generate
RUN pnpm build

# 3. Production runner stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Security: create non-root service user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 etfago

# Create persistent storage directory for private files with 0700 permissions per doc 07
RUN mkdir -p /data/etfago/private-files && \
    chown -R etfago:nodejs /data/etfago && \
    chmod 700 /data/etfago/private-files

COPY --from=builder --chown=etfago:nodejs /app/public ./public
COPY --from=builder --chown=etfago:nodejs /app/.next ./.next
COPY --from=builder --chown=etfago:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=etfago:nodejs /app/package.json ./package.json
COPY --from=builder --chown=etfago:nodejs /app/prisma ./prisma
COPY --from=builder --chown=etfago:nodejs /app/messages ./messages

USER etfago

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV STORAGE_ROOT=/data/etfago/private-files

CMD ["npm", "start"]
