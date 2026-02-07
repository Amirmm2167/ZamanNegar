# Stage 1: Dependencies
FROM node:24-slim AS deps
# We don't need libc6-compat anymore, but we need openssl for some packages
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

COPY package.json package-lock.json* ./

# If you still have network issues, keep the mirror. If not, remove this line.
RUN npm config set registry https://registry.npmmirror.com/

RUN npm ci

# Stage 2: Builder
FROM node:24-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment Arguments
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Stage 3: Runner
FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for process management
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "--max-old-space-size=512", "server.js"]