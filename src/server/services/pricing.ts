import { applyBps, vatFromGross } from "@/shared/money";
import { COUNTRIES, DEFAULT_COUNTRY, isCountry } from "@/shared/config/countries";
import type { DeliveryMethodCode } from "@/shared/constants";

/**
 * Pure pricing engine — no I/O, fully unit-tested. The cart preview, checkout
 * quote and order creation all call this same function with prices loaded
 * from the database, so the client can never influence what is charged.
 *
 * EU consumer pricing is VAT-inclusive: `tax` is the VAT contained in the
 * total, shown separately for transparency, not added on top.
 */

export interface PricingLine {
  key: string;
  sellerId: string;
  unitPrice: number;
  quantity: number;
  shippingCost: number;
  freeShipping: boolean;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
}

export interface PricingSeller {
  id: string;
  freeShippingThreshold: number | null;
  handlingDays: number;
}

export interface PricingCoupon {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  sellerId: string | null;
}

export interface SellerGroupTotals {
  sellerId: string;
  subtotal: number;
  shipping: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
}

export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  shippingDiscount: number;
  tax: number;
  total: number;
  vatBps: number;
  groups: SellerGroupTotals[];
  /** Per-line share of the goods discount (for order-item records / refunds). */
  lineDiscounts: Record<string, number>;
  coupon: { code: string; applied: boolean; reason?: "min_subtotal" | "not_applicable" } | null;
}

export const DELIVERY_RULES: Record<DeliveryMethodCode, { surcharge: number; flat: number | null; speed: number; extraDays: number }> = {
  STANDARD: { surcharge: 0, flat: null, speed: 1, extraDays: 0 },
  EXPRESS: { surcharge: 599, flat: null, speed: 0.5, extraDays: 0 },
  PICKUP_POINT: { surcharge: 0, flat: 199, speed: 1, extraDays: 1 },
};

export function vatRateFor(country: string | null | undefined): number {
  return COUNTRIES[isCountry(country) ? country : DEFAULT_COUNTRY].vatBps;
}

export function computeTotals(input: {
  lines: PricingLine[];
  sellers: Record<string, PricingSeller>;
  coupon?: PricingCoupon | null;
  deliveryMethod: DeliveryMethodCode;
  countryCode?: string | null;
}): Totals {
  const { lines, sellers, coupon, deliveryMethod } = input;
  const rule = DELIVERY_RULES[deliveryMethod];

  // ── Group by seller: each seller ships separately ──────────────────────────
  const bySeller = new Map<string, PricingLine[]>();
  for (const line of lines) bySeller.set(line.sellerId, [...(bySeller.get(line.sellerId) ?? []), line]);

  const groups: SellerGroupTotals[] = [];
  for (const [sellerId, sellerLines] of bySeller) {
    const seller = sellers[sellerId];
    const subtotal = sellerLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const paidLines = sellerLines.filter((l) => !l.freeShipping);
    const meetsThreshold = seller?.freeShippingThreshold != null && subtotal >= seller.freeShippingThreshold;
    let shipping = 0;
    if (rule.flat != null) shipping = paidLines.length && !meetsThreshold ? rule.flat : 0;
    else {
      const base = meetsThreshold ? 0 : Math.max(0, ...paidLines.map((l) => l.shippingCost));
      shipping = base + rule.surcharge;
    }
    const handling = seller?.handlingDays ?? 0;
    const min = Math.max(...sellerLines.map((l) => l.deliveryDaysMin));
    const max = Math.max(...sellerLines.map((l) => l.deliveryDaysMax));
    groups.push({
      sellerId,
      subtotal,
      shipping,
      deliveryDaysMin: Math.max(1, Math.ceil(min * rule.speed)) + rule.extraDays,
      deliveryDaysMax: Math.max(1, Math.ceil((max + handling) * rule.speed)) + rule.extraDays,
    });
  }

  const subtotal = groups.reduce((s, g) => s + g.subtotal, 0);
  const shipping = groups.reduce((s, g) => s + g.shipping, 0);

  // ── Coupon ─────────────────────────────────────────────────────────────────
  let discount = 0;
  let shippingDiscount = 0;
  let couponResult: Totals["coupon"] = null;
  const lineDiscounts: Record<string, number> = {};

  if (coupon) {
    const eligibleLines = coupon.sellerId ? lines.filter((l) => l.sellerId === coupon.sellerId) : lines;
    const eligibleSubtotal = eligibleLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    if (!eligibleLines.length) couponResult = { code: coupon.code, applied: false, reason: "not_applicable" };
    else if (eligibleSubtotal < coupon.minSubtotal) couponResult = { code: coupon.code, applied: false, reason: "min_subtotal" };
    else {
      couponResult = { code: coupon.code, applied: true };
      if (coupon.type === "FREE_SHIPPING") {
        shippingDiscount = groups
          .filter((g) => !coupon.sellerId || g.sellerId === coupon.sellerId)
          .reduce((s, g) => s + g.shipping, 0);
      } else {
        discount = coupon.type === "PERCENT" ? applyBps(eligibleSubtotal, coupon.value) : coupon.value;
        if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
        discount = Math.min(discount, eligibleSubtotal);
        allocate(discount, eligibleLines, lineDiscounts);
      }
    }
  }

  const total = subtotal - discount + shipping - shippingDiscount;
  const vatBps = vatRateFor(input.countryCode);
  return {
    subtotal,
    discount,
    shipping,
    shippingDiscount,
    tax: vatFromGross(total, vatBps),
    total,
    vatBps,
    groups,
    lineDiscounts,
    coupon: couponResult,
  };
}

/** Pro-rata allocation with the rounding remainder on the largest line. */
function allocate(amount: number, lines: PricingLine[], out: Record<string, number>) {
  const base = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  if (!base || !amount) return;
  let allocated = 0;
  const sorted = [...lines].sort((a, b) => b.unitPrice * b.quantity - a.unitPrice * a.quantity);
  for (const line of sorted.slice(1)) {
    const share = Math.floor((amount * line.unitPrice * line.quantity) / base);
    out[line.key] = share;
    allocated += share;
  }
  out[sorted[0].key] = amount - allocated;
}

/** Business-day-agnostic ETA window used for display and order records. */
export function deliveryWindow(from: Date, minDays: number, maxDays: number) {
  const day = 86_400_000;
  return { earliest: new Date(from.getTime() + minDays * day), latest: new Date(from.getTime() + maxDays * day) };
}
