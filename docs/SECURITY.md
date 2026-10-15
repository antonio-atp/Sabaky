# Security & privacy

Security is enforced on the server for every request; UI hiding is cosmetic only.

## Controls implemented

| Requirement | Implementation |
|---|---|
| HTTPS / transport | HSTS (2 years, preload), `upgrade-insecure-requests` in CSP, `Secure` + `__Host-` cookies in production (`next.config.ts`, `lib/cookies.ts`) |
| Password hashing | Argon2id, m=19 MiB t=2 p=1 (OWASP), transparent rehash on login when parameters change (`server/auth/password.ts`) |
| Password policy | 10–128 chars, letters + digits, common-password deny-list; strength meter in UI |
| Secure sessions | 256-bit random opaque tokens, only SHA-256 stored, HttpOnly + SameSite=Lax + Secure, sliding 30-day expiry, per-device revocation, global revocation on password change/reset/suspension (`server/auth/session.ts`) |
| API authentication | Same session tokens as `Authorization: Bearer` for native apps |
| RBAC & server-side authorisation | `api({ auth: ["ADMIN"] })`, page guards `requireRole`, ownership filters inside every query (orders, carts, addresses, reviews, shipments) — IDOR tested in `scripts/smoke.mjs` |
| Input validation | Zod schemas on every body/query (control-char stripping, length caps, enums, UUID idempotency keys), JSON-only bodies with size limits |
| SQL injection | Prisma parameterised queries; the two raw analytics queries use tagged templates (parameterised) |
| XSS / output encoding | React escaping everywhere; no `dangerouslySetInnerHTML` except JSON-LD (escaped `<`); HTML-escaped email templates; strict CSP with per-request nonces and `strict-dynamic`; no SVG uploads; uploaded files served with `nosniff` + `sandbox` CSP |
| CSRF | SameSite cookies + Origin/Referer check + double-submit token header (`server/security/csrf.ts`); Server-side never trusts GET for mutations |
| Security headers | CSP (nonce), HSTS, X-Frame-Options DENY + `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, COOP; `poweredByHeader: false` |
| Rate limiting | Per-route rules (login, register, reset, checkout, coupons, uploads, reviews, search) keyed by user or pseudonymised IP; per-account login limiter |
| Brute-force protection & lockout | Exponential account lockout from 5 failures (1 → 60 min), security email on lockout, credential-stuffing detection across accounts per IP, timing-equalised responses for unknown emails |
| Account enumeration | Generic login errors; password reset always returns the same response |
| Password reset / email verification | Single-use 256-bit tokens, hashed at rest, 30 min / 24 h expiry, previous tokens invalidated, `Referrer-Policy: no-referrer` on token pages; reset revokes all sessions |
| Secure file uploads | Auth + role check, 5 MB cap, magic-byte allow-list (JPEG/PNG/WebP), decoded and re-encoded by sharp (strips EXIF/GPS and polyglots), pixel limit, random keys, path-traversal guard |
| Open redirects | `safeReturnPath` for `?next=`; banner links restricted to internal paths |
| Payments | No card data ever reaches Sabaky: provider-hosted fields/tokens; only provider IDs + last4/brand stored; idempotency keys on every charge/refund; webhook signature verification with timestamp tolerance |
| Audit logs | Append-only `AuditLog` for auth events, privileged/admin actions, seller decisions, refunds, uploads, privacy exports/deletions (viewer at `/admin/audit`) |
| Suspicious activity detection | `services/risk.ts`: credential stuffing, suspicious logins, payment-failure bursts, abnormal orders (velocity/value/new account), fake-account bursts, coupon abuse, refund abuse, seller fake-discount abuse → `RiskEvent` queue for human review. Only reversible automatic controls (temporary lockout). |
| Encryption at rest | AES-256-GCM field encryption for seller registration/VAT numbers (`DATA_ENCRYPTION_KEY`); tokens hashed; IPs HMAC-pseudonymised |
| Secrets management | Validated env (`server/env.ts`, refuses placeholder secrets in production), `server-only` guard prevents server modules/secrets in client bundles, only `NEXT_PUBLIC_*` values reach the browser, log redaction of password/token/card/cookie fields |
| Error handling | Typed `AppError`s → safe messages; unknown errors return an opaque 500 with no stack/SQL |
| Database integrity | FK constraints, unique constraints, CHECK constraints (money ≥ 0, stock ≥ 0, rating 1–5), one default address per user, conditional stock decrement to prevent overselling |

## Privacy (GDPR)

- **Consent:** cookie banner with "Reject" as prominent as "Accept"; non-essential categories off by default; consents recorded in an append-only ledger (`ConsentRecord`) for guests (pseudonymous id) and users; re-prompt after 6 months; changeable any time (footer link, privacy centre).
- **Personalisation only with consent:** behavioural events (`UserEvent`) are stored only when the personalisation cookie is granted; recently-viewed lives on the device.
- **Data minimisation:** no date of birth, no gender, phone optional; sellers see customer display names and shipping addresses only for their own orders; review authors shown as "First L.".
- **Right of access/portability:** one-click JSON export (`GET /api/v1/account/privacy`), rate-limited and audited.
- **Right to erasure:** password-confirmed account deletion anonymises personal data and keeps legally required order records de-identified; sessions revoked.
- **Transactional vs marketing email:** transactional always sent, marketing strictly opt-in (and synced with the marketing consent).
- **Legal pages:** Terms, Privacy, Cookies, Seller terms and Help in all 6 languages (content in `src/i18n/messages`) — have counsel review before launch.

## Production checklist

- [ ] `AUTH_SECRET` (≥ 48 random bytes) and `DATA_ENCRYPTION_KEY` (32 bytes, base64) from a secrets manager; rotate on staff changes
- [ ] Managed PostgreSQL with TLS, automated backups/PITR, least-privilege DB role for the app (migrations run with a separate role)
- [ ] `PAYMENT_PROVIDER=stripe` with Stripe Elements on the client, `STRIPE_WEBHOOK_SECRET` set, webhook endpoint `/api/v1/webhooks/payments`
- [ ] `EMAIL_PROVIDER=resend` (or another adapter) with SPF/DKIM/DMARC on the sending domain
- [ ] `STORAGE_PROVIDER=s3` with a private bucket for KYB documents and a public/CDN bucket for product images
- [ ] Redis-backed `RateLimitStore` + cache and a durable job queue when running > 1 instance
- [ ] Edge/CDN overwrites `X-Forwarded-For` (client IP trust), WAF/bot protection in front of `/api/v1/auth/*`
- [ ] Remove demo seed data; create the first admin via a one-off script; enforce MFA for admin accounts (next step: TOTP/WebAuthn)
- [ ] Centralised log shipping + alerting on `level=error`, `auth.lockout`, risk events with score ≥ 70
- [ ] Dependency scanning (`npm audit`, Dependabot) and a periodic penetration test
- [ ] DPA/ROPA documentation, cookie inventory review, legal review of all policy texts
