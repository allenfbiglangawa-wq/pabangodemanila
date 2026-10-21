#!/usr/bin/env bash
# Production build on Vercel: same data model as development, but on PostgreSQL.
# Syncs the database schema (never drops data), seeds missing defaults (never
# overwrites admin edits), then builds the site.
set -euo pipefail
# Prisma Postgres on Vercel may give an Accelerate URL; schema sync needs the direct one.
if [[ ( -z "${DATABASE_URL:-}" || "${DATABASE_URL:-}" == prisma+* ) && -n "${POSTGRES_URL:-}" ]]; then export DATABASE_URL="$POSTGRES_URL"; fi
if [[ -z "${DATABASE_URL:-}" ]]; then echo "DATABASE_URL is not set: add a Postgres database in Vercel › Storage." >&2; exit 1; fi
sed 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma > prisma/schema.postgres.prisma
npx prisma generate --schema prisma/schema.postgres.prisma
npx prisma db push --schema prisma/schema.postgres.prisma --skip-generate
npx tsx prisma/seed.ts
npx next build
