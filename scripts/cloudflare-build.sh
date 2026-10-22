#!/usr/bin/env bash
# Production build on Cloudflare Workers (Workers Builds runs this as the build
# command). Same data model as development, on PostgreSQL through the `pg`
# driver adapter. Syncs the schema (never drops data), seeds missing defaults
# (never overwrites admin edits), then builds the worker with OpenNext.
set -euo pipefail
if [[ ( -z "${DATABASE_URL:-}" || "${DATABASE_URL:-}" == prisma+* ) && -n "${POSTGRES_URL:-}" ]]; then export DATABASE_URL="$POSTGRES_URL"; fi
if [[ -z "${DATABASE_URL:-}" ]]; then echo "DATABASE_URL is not set: add it under Settings › Build › Variables and secrets." >&2; exit 1; fi
export PRISMA_ADAPTER=pg BUILD_TARGET=cloudflare
sed -e 's/provider = "sqlite"/provider = "postgresql"/' \
    -e 's/provider = "prisma-client-js"/provider   = "prisma-client-js"\n  engineType = "client"/' \
    prisma/schema.prisma > prisma/schema.postgres.prisma
npx prisma generate --schema prisma/schema.postgres.prisma
npx prisma db push --schema prisma/schema.postgres.prisma --skip-generate
npx tsx prisma/seed.ts
npx opennextjs-cloudflare build
