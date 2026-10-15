# Sabaky REST API (v1)

Base path: `/api/v1`. JSON in, JSON out. Money = integer minor units (EUR).

## Envelope

```json
{ "data": { … } }
{ "error": { "code": "VALIDATION_FAILED", "message": "errors.VALIDATION_FAILED", "fields": { "email": "validation.email" } } }
```

`message` and `fields` values are i18n keys (render them with the client's dictionary). Error codes: `BAD_REQUEST 400`, `UNAUTHENTICATED 401`, `PAYMENT_FAILED 402`, `FORBIDDEN / CSRF_FAILED 403`, `NOT_FOUND 404`, `CONFLICT / OUT_OF_STOCK 409`, `VALIDATION_FAILED / UNPROCESSABLE 422`, `ACCOUNT_LOCKED 423`, `RATE_LIMITED 429` (+ `Retry-After`), `INTERNAL 500`.

## Authentication modes

| Client | How |
|---|---|
| Web | Session cookie (HttpOnly) set by `POST /auth/login`. Mutations must send `x-csrf-token` equal to the `sabaky.csrf` cookie and a same-origin `Origin`. |
| Native / API | Send `X-Sabaky-Client: native`. Login/register return `{ user, token, expiresAt }`; then send `Authorization: Bearer <token>`. CSRF does not apply. |

## Endpoints

**Auth** — `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `POST /auth/forgot-password` · `POST /auth/reset-password` · `POST /auth/verify-email` · `PUT /auth/verify-email` (resend) · `POST /auth/change-password`

**Catalogue** — `GET /categories` · `GET /search?q&category&brand&seller&minPrice&maxPrice&rating&inStock&freeShipping&onSale&maxDays&condition&sort&page` · `GET /search/suggest?q` · `GET /products/{slug|id}` · `GET /products/batch?ids=a,b` · `GET|POST /products/{id}/reviews` · `POST /products/{id}/questions` · `POST /products/{id}/report` · `PATCH /reviews/{id}` (edit own) · `POST /reviews/{id}` (report)

**Cart** — `GET /cart` · `GET /cart/count` · `POST /cart/items` · `PATCH|DELETE /cart/items/{id}` (quantity, variant, save-for-later) · `POST|DELETE /cart/coupon`

**Wishlist** — `GET|POST /wishlist` · `PATCH|DELETE /wishlist/{productId}`

**Checkout & orders** — `POST /checkout/quote` · `POST /checkout` (requires UUID `idempotencyKey`) · `GET /orders` · `GET /orders/{number}` · `POST /orders/{number}/cancel` · `POST /orders/{number}/returns` · `POST /orders/{number}/disputes`

**Account** — `GET|PATCH /account/profile` · `GET|POST /account/addresses` · `PATCH|DELETE /account/addresses/{id}` · `DELETE /account/payment-methods/{id}` · `GET|PATCH|PUT /account/notifications` (list · mark read · preferences) · `DELETE /account/sessions/{id}` · `GET|PATCH|DELETE /account/privacy` (export · consents · erase)

**Preferences & consent** — `POST /preferences` (locale, currency, country) · `POST /consent` · `POST /events` (product view signal)

**Uploads** — `POST /uploads?purpose=product|review|store` (multipart `file`) · `GET /media/{key}` (dev storage)

**Seller** (role `SELLER`) — `POST /seller/register` (any signed-in user) · `GET|POST /seller/products` · `GET|PATCH|DELETE /seller/products/{id}` · `PATCH /seller/inventory/{variantId}` · `PATCH /seller/shipments/{id}` · `POST /seller/questions/{id}` · `POST /seller/reviews/{id}` · `PATCH /seller/store` · `POST /seller/coupons`

**Admin** (role `ADMIN`) — `POST /admin/sellers/{id}` · `POST /admin/users/{id}` · `POST /admin/products/{id}` · `POST /admin/reviews/{id}` · `POST /admin/refunds/{id}` · `POST /admin/risk/{id}` · `POST|PATCH /admin/coupons` · `POST|PATCH /admin/banners` · `GET|PATCH /admin/settings`

**Webhooks** — `POST /webhooks/payments` (provider-signed) · **Health** — `GET /api/health`

## Example (native client)

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" -H "X-Sabaky-Client: native" \
  -d '{"email":"ana@sabaky.test","password":"Customer#Sabaky2026"}'
# → { "data": { "user": {…}, "token": "…", "expiresAt": "…" } }

curl http://localhost:3000/api/v1/orders -H "Authorization: Bearer <token>"
```

`scripts/smoke.mjs` exercises the full customer → seller → admin journey through this API.
