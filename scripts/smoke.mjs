#!/usr/bin/env node
/**
 * End-to-end API smoke test against a running instance with seed data.
 * Uses the native-client (Bearer token) path, exactly like the future iOS /
 * Android apps will.
 *
 *   node scripts/smoke.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3000";
let failures = 0;

async function call(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "X-Sabaky-Client": "native",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

function check(name, ok, detail = "") {
  console.log(`${ok ? "✔" : "✘"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const login = async (email, password) => (await call("POST", "/auth/login", { body: { email, password } })).data?.token;

// ── Security basics ──────────────────────────────────────────────────────────
{
  const res = await fetch(`${BASE}/api/v1/cart/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  check("cookie-authenticated POST without CSRF token is rejected", res.status === 403, `status ${res.status}`);
  const bad = await call("POST", "/auth/login", { body: { email: "ana@sabaky.test", password: "wrong-password-1" } });
  check("wrong password → 401 generic error", bad.status === 401 && bad.error?.message === "errors.INVALID_CREDENTIALS");
  const admin = await call("GET", "/admin/settings");
  check("admin endpoint without auth → 401", admin.status === 401);
}

// ── Customer journey ─────────────────────────────────────────────────────────
const customer = await login("ana@sabaky.test", "Customer#Sabaky2026");
check("customer login returns bearer token", !!customer);

const denied = await call("GET", "/admin/settings", { token: customer });
check("customer cannot access admin API (RBAC)", denied.status === 403);

const search = await call("GET", "/search?q=headphones&sort=price_asc");
check("search returns results", search.data?.total > 0, `${search.data?.total} results`);
const product = search.data.items[0];

const reviews = await call("GET", `/products/${product.id}/reviews`);
check("product reviews endpoint", reviews.status === 200);

const suggestion = await call("GET", "/search/suggest?q=spe");
check("search suggestions", suggestion.data?.products?.length > 0);

const detail = await fetch(`${BASE}/p/${product.slug}`);
check("product page renders", detail.status === 200);

const batch = await call("GET", `/products/batch?ids=${product.id}`);
check("batch product lookup", batch.data?.length === 1);

const apiDetail = await call("GET", `/products/${product.slug}`);
const variantId = apiDetail.data?.variants?.find((v) => v.available > 3)?.id;
check("product detail API exposes purchasable variants", !!variantId);

const add = await call("POST", "/cart/items", { token: customer, body: { variantId, quantity: 2 } });
check("add to cart", add.status === 200 && add.data.count >= 2, `count ${add.data?.count}`);

const coupon = await call("POST", "/cart/coupon", { token: customer, body: { code: "SAVE5" } });
check("apply coupon SAVE5", coupon.status === 200 || coupon.status === 422, coupon.error?.message ?? coupon.data?.coupon?.code);

const quote = await call("POST", "/checkout/quote", { token: customer, body: { countryCode: "PT", deliveryMethod: "EXPRESS" } });
check("checkout quote with delivery options", quote.data?.deliveryOptions?.length === 3);
const express = quote.data.deliveryOptions.find((o) => o.method === "EXPRESS");
const standard = quote.data.deliveryOptions.find((o) => o.method === "STANDARD");
check("express costs more than standard", express.shipping > standard.shipping, `${standard.shipping} → ${express.shipping}`);

const addresses = await call("GET", "/account/addresses", { token: customer });
const idempotencyKey = crypto.randomUUID();
const orderBody = {
  contact: { email: "ana@sabaky.test", fullName: "Ana Ribeiro", phone: null },
  addressId: addresses.data[0].id,
  deliveryMethod: "STANDARD",
  paymentMethod: "CARD",
  paymentToken: "tok_test_success",
  idempotencyKey,
  acceptTerms: true,
};
if (coupon.status !== 200) await call("DELETE", "/cart/coupon", { token: customer });
const order = await call("POST", "/checkout", { token: customer, body: orderBody });
check("place order (mock card)", order.data?.status === "confirmed", order.data?.orderNumber ?? JSON.stringify(order.error));

const replay = await call("POST", "/checkout", { token: customer, body: orderBody });
check("checkout is idempotent", replay.data?.orderNumber === order.data?.orderNumber);

const tracked = await call("GET", `/orders/${order.data.orderNumber}`, { token: customer });
check("order tracking detail", tracked.data?.status === "PAYMENT_CONFIRMED", tracked.data?.status);

// Declined card path: nothing charged, stock restored, clear error.
await call("POST", "/cart/items", { token: customer, body: { variantId, quantity: 1 } });
const declined = await call("POST", "/checkout", { token: customer, body: { ...orderBody, paymentToken: "tok_test_declined", idempotencyKey: crypto.randomUUID() } });
check("declined card → 402 with friendly message", declined.status === 402 && declined.error?.message === "errors.PAYMENT_DECLINED");
await call("DELETE", `/cart/items/${(await call("GET", "/cart", { token: customer })).data.lines[0]?.id}`, { token: customer });

// IDOR: another customer cannot see Ana's order.
const other = await login("lucas@sabaky.test", "Customer#Sabaky2026");
const idor = await call("GET", `/orders/${order.data.orderNumber}`, { token: other });
check("other customers cannot read the order (IDOR)", idor.status === 404);

// ── Seller fulfils ───────────────────────────────────────────────────────────
const sellers = { "TechNova Europe": "technova", "Atelier Rua": "atelier", "Lumen & Co.": "lumen", "Casa Verde Market": "casaverde", "Pure Glow Lab": "pureglow", "Peak Motion": "peakmotion", "Little Nest": "littlenest", "Office Loft": "officeloft", "Pixel Gifts": "pixelgifts", "AutoPro Parts": "autopro" };
const shipment = tracked.data.shipments[0];
const sellerToken = await login(`${sellers[shipment.seller.storeName]}@sabaky.test`, "Seller#Sabaky2026");
check("seller login", !!sellerToken);
const noTracking = await call("PATCH", `/seller/shipments/${shipment.id}`, { token: sellerToken, body: { status: "SHIPPED", carrier: "DHL", trackingNumber: null, location: null } });
check("shipping requires a tracking number", noTracking.status === 422);
const shipped = await call("PATCH", `/seller/shipments/${shipment.id}`, { token: sellerToken, body: { status: "SHIPPED", carrier: "DHL", trackingNumber: "JD014600003SE", location: "Lisboa Hub" } });
check("seller marks shipment shipped", shipped.status === 200);
const back = await call("PATCH", `/seller/shipments/${shipment.id}`, { token: sellerToken, body: { status: "LABEL_CREATED", carrier: "DHL", trackingNumber: null, location: null } });
check("shipment status cannot go backwards", back.status === 409);
const after = await call("GET", `/orders/${order.data.orderNumber}`, { token: customer });
check("customer sees SHIPPED", after.data?.status === "SHIPPED", after.data?.status);
const cancel = await call("POST", `/orders/${order.data.orderNumber}/cancel`, { token: customer, body: { reason: null } });
check("shipped order can no longer be cancelled", cancel.status === 409);

// ── Admin ────────────────────────────────────────────────────────────────────
const adminToken = await login("admin@sabaky.test", "Admin#Sabaky2026");
const settings = await call("GET", "/admin/settings", { token: adminToken });
check("admin can read platform settings", settings.status === 200);

// ── Registration & validation ────────────────────────────────────────────────
const weak = await call("POST", "/auth/register", { body: { name: "T", email: "not-an-email", password: "short", acceptTerms: true } });
check("registration validation errors", weak.status === 422 && !!weak.error?.fields?.email && !!weak.error?.fields?.password);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
