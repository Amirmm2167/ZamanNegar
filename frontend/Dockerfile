# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm config set registry https://registry.npmmirror.com/
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment Arguments
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run dev

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 1. Install tzdata for Timezone support
# 2. Add dumb-init to handle process signals correctly (stops zombie processes)
RUN apk add --no-cache tzdata dumb-init

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# --- THE FIX ---
# 1. Use dumb-init as the entrypoint
# 2. Set max-old-space-size (e.g., 512MB or 75% of your VPS RAM)
# This forces the Garbage Collector to work early and prevents the 100% CPU lockup.
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "--max-old-space-size=512", "server.js"]