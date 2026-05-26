# ---- Stage 1: Install dependencies ----
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: Build the application ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects anonymous telemetry — disable it during build
ENV NEXT_TELEMETRY_DISABLED=1

# Raise the Node heap for the build only. Wiring the generated Supabase
# `Database` types into the client makes `next build` type-checking
# memory-heavy and it OOMs at Node's default ~2GB limit. (Build stage only —
# the runtime `runner` stage below starts from a fresh image.)
ENV NODE_OPTIONS=--max-old-space-size=4096

# NEXT_PUBLIC_* vars must be provided at build time — Next.js inlines them
# into client-side JS bundles. Pass them as --build-arg in CI/CD.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_TMDB_API_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_TMDB_API_KEY=$NEXT_PUBLIC_TMDB_API_KEY

RUN npm run build

# ---- Stage 3: Production runner ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install curl for Coolify healthcheck
RUN apk add --no-cache curl

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder (static assets, PWA service worker, etc.)
COPY --from=builder /app/public ./public

# Copy the standalone server and static build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# Listen on all interfaces so Docker networking works
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
