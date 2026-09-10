# syntax=docker/dockerfile:1
#
# Web image for projectnowcdp-report-studio (the JRXML Web Designer Vue 3 SPA ->
# static assets on nginx).
# Build context is the repo root:  docker build -f deploy/Dockerfile .
#
# ── Stage 1: build the static bundle ─────────────────────────────────────────
FROM node:22-alpine AS builder

# pnpm version is pinned to package.json "packageManager"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Install deps first so this layer is cached until the lockfile changes
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# App source (see .dockerignore for what is excluded)
COPY . .

# Build-time config — baked into the JS bundle by Vite.
#   VITE_PDF_PREVIEW_API : JasperReports preview server for this environment.
#                          Optional — the app falls back to its in-code default
#                          and the in-app "Preview Server" setting still overrides
#                          it at runtime.
#   VITE_APP_VERSION     : short git SHA, for display / cache-busting.
ARG VITE_PDF_PREVIEW_API=""
ARG VITE_APP_VERSION="dev"
ENV VITE_PDF_PREVIEW_API=${VITE_PDF_PREVIEW_API} \
    VITE_APP_VERSION=${VITE_APP_VERSION}

# "pnpm build" runs "vue-tsc -b && vite build" — a type error fails the image.
# If that ever becomes a CI bottleneck, swap to "pnpm exec vite build" here and
# rely on the ci.yml "verify" job for the typecheck signal instead.
RUN pnpm build

# ── Stage 2: serve ──────────────────────────────────────────────────────────
# Unprivileged nginx: runs as uid 101, listens on :8080, pid in /tmp.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

# Image self-check (k8s uses the probes in the Deployment; this helps `docker run`)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
