# Pabango de Manila — storefront & admin

Online store and private admin dashboard for Pabango de Manila, a Filipino home
fragrance house. Built with Next.js 15 (App Router), TypeScript, Tailwind CSS 4
and Prisma (SQLite for development, PostgreSQL for production).

## Run it locally

Requires Node 20+.

```bash
npm install
cp .env.example .env          # then edit the values
npm run db:push               # create the database tables
npm run db:seed               # owner account, categories, products, press entries
npm run dev                   # http://localhost:3000
```

Admin: http://localhost:3000/admin, signing in with `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` from `.env`. **Change that password straight away**
(Admin › Settings).

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | Type check |
| `npm test` | Unit tests |
| `npm run db:push` | Sync the Prisma schema to the database |
| `npm run db:seed` | Seed (safe to re-run; it never overwrites content edited in the admin) |

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `file:./dev.db` locally; a PostgreSQL URL in production |
| `NEXT_PUBLIC_SITE_URL` | Public site address, used in emails, redirects and the sitemap |
| `APP_SECRET` | Long random string; signs tokens. Generate with `openssl rand -hex 32` |
| `PAYMENT_PROVIDER` | `stub` (development only), `paymongo` or `xendit` |
| `PAYMONGO_*` / `XENDIT_*` | Keys for the chosen provider |
| `CRON_SECRET` | Protects the reservation-release endpoint |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | First owner account created by the seed |
| `SEED_DEMO_STOCK` | `1` gives each product 20 demo units (logged as DEMO). Use `0` for the real launch |

## What is where

- `src/app/(store)` — the public site: home, shop, product pages, cart, checkout,
  orders, account, Our Story, Event Scenting, Private Label, Press & Events,
  Journal, Contact, FAQs, policies.
- `src/app/admin` — the dashboard: overview, orders, products, inventory,
  customers, sales analytics, event bookings, reviews, promotions, website
  content, media library, settings, CSV/Excel exports.
- `src/lib` — business logic: orders and payments, inventory (reservations,
  movement log, low-stock alerts), discounts, shipping, analytics, auth.
- `src/lib/payments` — payment provider layer; see its README.
- `prisma/schema.prisma` — the data model. Money is stored in centavos.
- `public/brand` — the owner's photos. `public/placeholders` — labelled
  placeholder art for anything still missing.

Almost all wording on the site (announcement bar, hero, story, event scenting
rates and inclusions, business services, stockists, contact details, policies,
FAQs, SEO) is edited in **Admin › Website Content**, not in code.

## Payments: a decision for the owner

The site never sees card numbers: GCash, Maya and cards go through a
provider-hosted checkout, confirmed only by a signature-verified webhook.
Bank transfers are confirmed by the owner in Admin › Orders.

Before launch the owner chooses a Philippine provider (for example PayMongo or
Xendit) after checking merchant eligibility and fees. The developer then
finishes that adapter in `src/lib/payments/` and sets `PAYMENT_PROVIDER` and
the keys. Until then the live site hides GCash, Maya and card payments and
accepts bank transfer only (and cash on delivery, if switched on).

## Deploying

1. **Database:** create a PostgreSQL database (Supabase, Neon, Railway, etc.),
   change `provider = "sqlite"` to `"postgresql"` in `prisma/schema.prisma`,
   set `DATABASE_URL`, then run `npx prisma db push` and `npm run db:seed`.
2. **Hosting:** any Node host (Vercel, Railway, Render, a VPS). Set every
   variable above. Uploads are written to `public/uploads`, which suits a VPS or
   a persistent disk. On Vercel or other serverless hosts, switch
   `src/lib/storage.ts` to object storage (S3, R2, Supabase Storage) first.
3. **Scheduler:** every 5–10 minutes call
   `POST /api/cron/release-reservations` with header
   `Authorization: Bearer $CRON_SECRET`. This frees stock held by unpaid orders.
4. **Email:** messages are queued in the `EmailOutbox` table and printed to the
   console. Connect a transactional email service in `src/lib/email.ts`
   before launch.
5. **Webhook:** register `https://<your-domain>/api/webhooks/payments/<provider>`
   in the payment provider dashboard.

## Before launch (the owner's checklist)

The admin Overview page tracks most of these.

- [ ] Change the owner password; add staff accounts if needed.
- [ ] Confirm the Perfumed Candle price (₱498 from the business plan) and that all 8 are 300 g; photos for the 150 g Scented Soy Candle and the reed diffuser, plus reed diffuser scents.
- [ ] Real stock counts (Admin › Inventory, or CSV import), replacing the demo stock.
- [ ] Shipping rates per region (Admin › Settings).
- [ ] Bank account details for bank transfer (Admin › Settings).
- [ ] Shipping, returns, privacy and terms text, and FAQs (Admin › Website Content › Policies). The privacy policy should follow the Data Privacy Act of 2012.
- [ ] Choose the payment provider (see above).
- [ ] Confirm the event scentscaping rates and inclusions shown on the site are current.
- [ ] Logo file, if the brand has one, plus a hero video (optional).
- [ ] Only publish press, event photos and customer feedback the owner has permission to use.
