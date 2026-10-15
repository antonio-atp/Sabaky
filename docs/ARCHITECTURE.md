# Sabaky architecture

## 1. Shape of the system

```
 Browser (Next.js RSC + client islands)      Future iOS / Android apps
        │  cookies + CSRF header                    │  Bearer token + X-Sabaky-Client: native
        ▼                                           ▼
 ┌───────────────────────────── src/proxy.ts ─────────────────────────────┐
 │ CSP nonce · CSRF cookie · optimistic redirect for protected areas      │
 └────────────────────────────────────────────────────────────────────────┘
        │ pages (Server Components)                 │ /api/v1/* (route handlers)
        ▼                                           ▼
 ┌──────────────────── server/http/api.ts (every API route) ──────────────┐
 │ auth (cookie|Bearer) · RBAC · CSRF · rate limit · Zod validation ·     │
 │ body-size limit · typed errors → { data } | { error }                  │
 └────────────────────────────────────────────────────────────────────────┘
        ▼
 ┌──────────────────────── server/services (domain) ──────────────────────┐
 │ catalog · search · recommendations · cart · pricing · checkout ·       │
 │ orders · reviews · wishlist · seller · admin · account · notifications │
 │ · risk · audit · settings                                              │
 └────────────────────────────────────────────────────────────────────────┘
        ▼                         ▼                          ▼
   Prisma → PostgreSQL     integrations/ (ports)        jobs/queue (port)
                           payments · email · storage
```

**Pages never call the REST API** — Server Components call services directly (no extra hop, full SSR). Client components mutate through `/api/v1`, exactly like native apps will. One business-logic layer, two delivery mechanisms.

## 2. Modules and responsibilities

| Layer | Location | Rule |
|---|---|---|
| Shared contracts | `src/shared` | Pure TypeScript, no Node/React imports. Validation schemas, DTOs, money helpers, locale/currency/country config. Extractable to an npm package for React Native. |
| Domain services | `src/server/services` | All business rules and authorisation-by-ownership (e.g. `getOrderForUser` filters by `userId` in the query). `server-only` import guard. |
| Pricing engine | `services/pricing.ts` | Pure function; the cart preview, checkout quote and order creation all use it, fed only with DB prices. Unit-tested. |
| Transport | `src/app/api/v1` | Thin handlers: parse → call service → return. |
| Integrations | `src/server/integrations` | Ports + adapters, selected by env: `payments()` (mock/Stripe), `email()` (console/Resend), `storage()` (local/S3). |
| UI | `src/components` | Small, reusable pieces; design tokens in `app/globals.css`. |

## 3. Data model (PostgreSQL, 44 models)

- **Identity:** `User` (roles array, status, lockout counters), `Session` (hashed tokens), `VerificationToken`, `LoginAttempt` (pseudonymised), `ConsentRecord`, `PrivacyRequest`, `NotificationPreference`.
- **Sellers:** `Seller` (status PENDING/VERIFIED/REJECTED/SUSPENDED, commission, shipping policy) and `SellerVerification` (KYB history; identifiers encrypted at rest).
- **Catalogue:** `Category` (tree + translations JSON), `Brand`, `Product` (denormalised price/discount/rating/stock for index-backed sorting), `ProductVariant`, `Inventory` (quantity + reserved), `ProductImage`, `ProductQuestion`, `ProductReport`.
- **Commerce:** `Cart`/`CartItem` (guest or customer), `Wishlist`/`WishlistItem` (price at add → price-drop alerts), `Coupon`/`CouponRedemption`, `Promotion`/`PromotionProduct`, `Banner`.
- **Orders:** `Order` (address snapshot, totals, VAT, presentment currency + FX rate, risk score) → `OrderItem` (price snapshot, commission) → one `Shipment` per seller with `ShipmentEvent`s; `OrderEvent` timeline; `Payment` (idempotency key, provider IDs only); `ReturnRequest`, `Refund`, `Dispute`.
- **Trust:** `Review` (only via a delivered `OrderItem` → verified purchase), `ReviewReport`, `RiskEvent`, `AuditLog`, `UserEvent` (behavioural signals), `PlatformSetting`.

Money is always integer minor units (EUR). Indexes cover every listing/sort path (`status + categoryId + price`, `status + salesCount DESC`, …); the `search_and_integrity` migration adds `pg_trgm` GIN indexes for substring search plus CHECK constraints (non-negative money/stock, rating 1–5, one default address per user).

## 4. Key flows

**Checkout** (`services/checkout.ts`)
1. Idempotency: an existing `Payment.idempotencyKey` returns the original order (double-click/retry safe).
2. Cart re-priced from the database; stock/availability issues block checkout.
3. Risk assessment (velocity, account age, value, failed payments).
4. One transaction: conditional stock decrement (`quantity >= n` → no overselling), order, items, per-seller shipments, coupon redemption, pending payment.
5. Payment provider call **outside** the transaction.
6. Success → `PAYMENT_CONFIRMED`; decline → order cancelled, stock and coupon restored, clear error, nothing charged; bank transfer → awaits webhook.
7. Side effects: notifications (customer + sellers), purchase signals, audit, risk flag if needed.

**Order status** advances from shipment updates; a multi-seller order is only *Delivered* when every parcel is (`syncOrderStatus`). Shipments can only move forward.

**Reviews**: eligibility requires a delivered order line; `isVerifiedPurchase` is set by the server only. Three distinct reports auto-hold a review for moderation (reversible).

## 5. Scaling path

| Concern | Today | Scale-out |
|---|---|---|
| Web/API | Stateless Next.js; sessions in DB | Horizontal replicas behind a load balancer/CDN |
| Rate limiting & cache | In-process (`security/rate-limit.ts`, `server/cache.ts`) | Implement the same interfaces on Redis (`RATE_LIMIT_STORE=redis`) |
| Background jobs | In-process queue with retries (`jobs/queue.ts`) | Same `defineJob/enqueue` API on BullMQ/SQS; separate worker process |
| Search | PostgreSQL + trigram indexes behind `SearchEngine` | Meilisearch/OpenSearch/Typesense adapter; index via jobs on product change |
| Recommendations | Heuristics behind `Recommender` (recency-weighted categories, co-purchase) | Collaborative filtering / embeddings service; AI shopping assistant uses the same port |
| Images | Local disk (dev) or S3 + CDN; re-encoded to WebP ≤ 2000 px | Add responsive variants in a job; `next/image` already serves AVIF/WebP |
| Database | Single Postgres, pooled | Read replicas for listings/analytics; partition `UserEvent`/`AuditLog` by month |
| Analytics | Live SQL aggregates | Nightly roll-up tables or a warehouse fed from the outbox |

Pagination is everywhere (offset for UI pages; switch hot listings to keyset cursors when catalogues exceed ~100k).

## 6. Mobile readiness

- `/api/v1` is the product API; the web client uses it for every mutation.
- Native apps send `X-Sabaky-Client: native`: login/register return the session token in the body (store it in Keychain/Keystore) and subsequent calls use `Authorization: Bearer <token>`. These requests are CSRF-exempt by design (custom headers can't be sent cross-site without CORS preflight).
- `src/shared` (Zod schemas, DTO types, money/locale helpers) is framework-free and can be published as a package consumed by React Native.
- Notifications already have a `PUSH` channel and a `PushProvider` port; add device-token registration + APNs/FCM adapter.

## 7. Internationalisation

- Dictionaries in `src/i18n/messages/*.ts`; every locale is **type-checked against English** (a missing key fails `npm run typecheck`), and `npm run i18n:check` verifies every key referenced in code.
- Syntax: `{var}` interpolation and `one|other` plurals (`#` = count) using `Intl.PluralRules`.
- Locale resolution: explicit cookie → account profile → `Accept-Language`. Currency/country via preference cookies.
- Categories carry a `translations` JSON; banners can be written per locale; product content is seller-authored (add a `ProductTranslation` table for machine/human translations later).
- Prices are stored in EUR; display currencies use configurable rates (`shared/config/currencies.ts`, to be refreshed by an FX job). Orders record the presentment currency and rate.

## 8. Extension points (where to plug things in)

| Want to add… | Implement |
|---|---|
| Another payment provider (PayPal direct, Adyen, Mollie) | `PaymentProvider` in `integrations/payments` |
| Email/SMS vendor | `EmailProvider` in `integrations/email` |
| Push notifications | `PushProvider` in `services/notifications.ts` |
| Shipping labels / carrier tracking | A carrier port feeding `ShipmentEvent`s (webhook route under `/api/v1/webhooks`) |
| Search engine | `SearchEngine` in `services/search.ts` |
| ML recommendations / AI assistant | `Recommender` in `services/recommendations.ts` |
| Fraud vendor | the `assess*` functions in `services/risk.ts` |
| Dark mode | tokens under `[data-theme="dark"]` in `globals.css` already exist — add a toggle that sets `data-theme` |
