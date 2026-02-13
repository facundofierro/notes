# Base stage
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@9.0.0
# Builder stage
FROM base AS builder
WORKDIR /app
COPY . .
RUN npx turbo prune @agelum/site --docker

# Installer stage
FROM base AS installer
WORKDIR /app

# First copy the pruned package.json and lockfile
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the pruned files and build
COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=@agelum/site...

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
RUN mkdir -p apps/site/public
COPY --from=installer /app/apps/site/public* ./apps/site/public/
COPY --from=installer --chown=nextjs:nodejs /app/apps/site/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/site/.next/static ./apps/site/.next/static

USER nextjs

EXPOSE 6600

ENV PORT=6600
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/site/server.js"]
