# ---- Stage 1: Install dependencies ----
FROM node:22-alpine AS deps
# libc6-compat for native deps; openssl for the Prisma query engine (musl).
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
# Prisma's postinstall runs `prisma generate`, which needs the schema present.
COPY prisma ./prisma
RUN npm ci

# ---- Stage 2: Build the application ----
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects anonymous telemetry — disable it during build
ENV NEXT_TELEMETRY_DISABLED=1

# Raise the Node heap for the build only (type-checking is memory-heavy).
ENV NODE_OPTIONS=--max-old-space-size=4096

# NEXT_PUBLIC_* are inlined into the client bundle at build time (pass as
# --build-arg). Runtime-only secrets (DATABASE_URL, BETTER_AUTH_*, MINIO_*) are
# injected by Coolify at container start — the build needs none of them because
# every DB-querying page is dynamic (the root layout uses headers()), verified
# by building with the CI's exact build-args.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_TMDB_API_KEY
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_TMDB_API_KEY=$NEXT_PUBLIC_TMDB_API_KEY
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Regenerate the Prisma client against the full schema (idempotent).
RUN npx prisma generate
RUN npm run build

# ---- Stage 3: Production runner ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# curl for the Coolify healthcheck; openssl for the Prisma engine at runtime.
RUN apk add --no-cache curl openssl

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder (static assets, PWA service worker, etc.)
COPY --from=builder /app/public ./public

# Copy the standalone server and static build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The generated Prisma client + query-engine binary live in node_modules/.prisma
# and are loaded dynamically, so Next's standalone trace misses them — copy
# explicitly or @prisma/client crashes at runtime ("query engine not found").
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
# Listen on all interfaces so Docker networking works
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
