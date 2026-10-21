#!/usr/bin/env bash
# Production build on Vercel: same data model as development, but on PostgreSQL.
# Syncs the database schema (never drops data), seeds missing defaults (never
# overwrites admin edits), then builds the site.
set -euo pipefail
sed 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma > prisma/schema.postgres.prisma
npx prisma generate --schema prisma/schema.postgres.prisma
npx prisma db push --schema prisma/schema.postgres.prisma --skip-generate
npx tsx prisma/seed.ts
npx next build
