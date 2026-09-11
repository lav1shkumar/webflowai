# Resolve this tag to a reviewed digest in trusted CI and pass NODE_IMAGE with
# --build-arg. Rebuild with --pull after base-image security updates.
ARG NODE_IMAGE=node:22-alpine

# Build tools are not copied into the runtime image.
FROM ${NODE_IMAGE} AS base
ENV NEXT_TELEMETRY_DISABLED=1
# Keep this aligned with package.json's packageManager field.
RUN npm install --global pnpm@11.18.0

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# These values are public and embedded in browser assets. Never pass server
# credentials as build arguments; inject them only when the container starts.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in

ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL

RUN pnpm exec prisma generate
RUN pnpm build

# Runner
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs \
    && adduser -S -D -H -u 1001 -G nodejs nextjs

# Application code belongs to root, so the runtime user cannot replace it.
COPY --from=builder --chown=0:0 /app/.next/standalone ./
COPY --from=builder --chown=0:0 /app/.next/static ./.next/static
COPY --from=builder --chown=0:0 /app/public ./public

RUN mkdir -p /app/.next/cache \
    && chmod -R a-w /app \
    && chown -R 1001:1001 /app/.next/cache \
    && chmod -R u+rwX /app/.next/cache

USER 1001:1001

EXPOSE 3000

# ACA uses its own probes; this healthcheck is for Docker/Compose.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || '3000') + '/api/health', { signal: AbortSignal.timeout(4000) }).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

# Configure a read-only root filesystem and writable /tmp and .next/cache at
# deployment time where supported; Dockerfile cannot enforce that policy.
CMD ["node", "server.js"]
