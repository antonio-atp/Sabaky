# Sabaky

**Sabaky** is an international, multi-seller e-commerce marketplace: customers discover, compare and buy products from verified sellers, with buyer protection, transparent pricing (price · discount · shipping · VAT · total) and full EU privacy controls.

This repository is the production foundation: a responsive web app plus a versioned REST API (`/api/v1`) that future **iOS and Android apps** use unchanged (Bearer-token auth, shared validation schemas and DTOs).

| Area | What's included |
|---|---|
| Storefront | Home (hero banners, flash deals with countdown, personalised & recommended rails, featured, best sellers, new arrivals, trending, recently viewed, category shortcuts), search with suggestions & recent searches, 10 filter types, 7 sort orders, category pages, seller storefronts, product page (gallery, variants, stock, cost breakdown, delivery ETA, seller card, reviews, Q&A, related, bought-together) |
| Cart & checkout | Guest + customer carts (merged at login), variants, save for later, coupons, per-seller shipping, VAT, 6-step checkout (contact → address → delivery → payment → review → confirmation), idempotent order placement, mock + Stripe payment adapters |
| Customer account | Overview, orders, 7-stage tracking timeline, cancel, returns/refunds, disputes, addresses, tokenised payment methods, reviews, notifications inbox & preferences, profile, password, sessions, GDPR privacy centre (consents, data export, account deletion) |
| Seller Center | Onboarding + KYB verification, dashboard (sales, net revenue, orders, customers, daily chart, low stock, top products), product CRUD with variants/inventory/images, shipments, customers, Q&A, review replies, store settings, seller coupons |
| Admin console | Analytics (GMV, revenue, orders, AOV, customers, sellers, products, conversion, refund rate, commission, trend), users, seller verification, product moderation, orders, refunds, review moderation, fraud & risk queue, campaigns/coupons/banners, audit log, platform settings |
| Platform | 6 languages (EN, PT, ES, FR, DE, IT), 6 currencies, EU VAT per destination, notifications (in-app + email, push-ready), fraud rules engine, audit trail, background jobs, secure image uploads |

---

## Quick start

Requirements: **Node.js ≥ 20.9** (tested on 24). A PostgreSQL 15+ database.

```bash
npm install
cp .env.example .env            # then set AUTH_SECRET (see below)
```

Pick a database:

```bash
# Option A — zero-install local Postgres managed by Prisma (used in development here)
npm run db:local                # prints a postgres:// URL on port 51214
#   → set DATABASE_URL to it and DATABASE_POOL_MAX=1 in .env

# Option B — Docker
npm run db:up                   # postgres:17 on :5432 (credentials already in .env.example)
```

Then:

```bash
npm run db:deploy               # apply migrations (schema + search indexes + CHECK constraints)
npm run db:seed                 # ~110 products, 11 sellers, 20 customers, ~130 orders, ~150 verified reviews
npm run dev                     # http://localhost:3000
```

Generate a secret with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

### Demo accounts (seed data — local only)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@sabaky.test` | `Admin#Sabaky2026` |
| Seller (verified) | `technova@sabaky.test` (also `atelier@`, `lumen@`, `pureglow@`, `peakmotion@`, …) | `Seller#Sabaky2026` |
| Seller (pending verification) | `nordic@sabaky.test` | `Seller#Sabaky2026` |
| Customer | `ana@sabaky.test` (also `lucas@`, `marta@`, `felix@`, `elena@`, `james@`) | `Customer#Sabaky2026` |

Coupons: `WELCOME10` (10 %, max €20) · `FREESHIP` · `SAVE5` (€5 off €40+) · `TECHNOVA15` (seller-scoped).

**Payments run in test mode** (`PAYMENT_PROVIDER=mock`): choose *Successful payment* or *Card declined* at checkout. **Emails are printed to the server console** (`EMAIL_PROVIDER=console`) — that's where verification and password-reset links appear.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run check` | typecheck + lint + i18n completeness + unit tests |
| `npm test` | Vitest unit tests (pricing engine, validation, i18n, crypto, password hashing, rate limiting, redirects…) |
| `npm run test:smoke` | End-to-end API journey against a running server (auth, RBAC, CSRF, IDOR, checkout, idempotency, declined card, seller shipping, admin) |
| `npm run i18n:check` | Verifies every translation key used in code exists in all 6 locales |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:reset` / `db:studio` | Prisma workflows |

---

## Tech stack

- **Next.js 16** (App Router, React 19, Server Components, Turbopack) · **TypeScript** (strict) · **Tailwind CSS 4**
- **PostgreSQL** via **Prisma 7** (driver adapter `@prisma/adapter-pg`), 44 models, trigram search indexes, CHECK constraints
- **Zod 4** schemas shared by server, web client and future native apps
- **Argon2id** (`@node-rs/argon2`) password hashing · **sharp** image re-encoding · `lucide` icons
- No heavyweight SDKs: Stripe, S3 (SigV4) and Resend are called over HTTPS behind swappable adapters

## Project structure

```
prisma/                 schema, migrations, seed + seed data
scripts/                smoke test, i18n checker
src/
  app/                  routes (UI) and REST API
    (shop)/             storefront + customer account (shared header/footer/bottom nav)
    (auth)/             login, register, password reset, email verification
    checkout/           distraction-free checkout + confirmation
    seller/             Seller Center
    admin/              admin console
    api/v1/             versioned REST API (web + native apps)
    demo-media/         generated catalogue artwork for seed data
  components/           ui/ layout/ product/ cart/ checkout/ account/ seller/ admin/ dashboard/ …
  hooks/                client hooks
  i18n/                 translator core, server/client bindings, messages/{en,pt,es,fr,de,it}.ts
  lib/                  browser API client, cookies, upload helper, utils
  server/
    auth/               sessions, password hashing, RBAC guards
    http/               API handler wrapper, errors, request metadata
    security/           CSRF, rate limiting, crypto
    services/           domain logic (catalog, search, cart, pricing, checkout, orders, reviews,
                        wishlist, seller, admin, notifications, risk, recommendations, account, audit)
    integrations/       payments (mock, Stripe), email (console, Resend), storage (local, S3)
    jobs/               background job port
  shared/               isomorphic: config (locales, currencies, countries), money, constants,
                        validation schemas, DTO types  ← reusable by React Native / native apps
  proxy.ts              CSP nonces, CSRF cookie, protected-route redirects
tests/                  Vitest unit tests
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layers, data model, scaling path, mobile readiness, extension points
- [docs/SECURITY.md](docs/SECURITY.md) — security & privacy controls and the production checklist
- [docs/API.md](docs/API.md) — REST API reference and authentication modes

## Going to production

See the checklist at the end of [docs/SECURITY.md](docs/SECURITY.md). In short: managed PostgreSQL, `AUTH_SECRET` + `DATA_ENCRYPTION_KEY` from a secrets manager, `PAYMENT_PROVIDER=stripe`, `EMAIL_PROVIDER=resend`, `STORAGE_PROVIDER=s3` behind a CDN, a shared Redis for rate limiting/cache when running more than one instance, HTTPS termination with HSTS, and legal review of the Terms/Privacy copy in `src/i18n/messages`.
