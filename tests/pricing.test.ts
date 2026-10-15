import { describe, expect, it } from "vitest";
import { computeTotals, type PricingLine, type PricingSeller } from "@/server/services/pricing";

const seller = (id: string, freeShippingThreshold: number | null = null): PricingSeller => ({ id, freeShippingThreshold, handlingDays: 1 });
const line = (key: string, sellerId: string, unitPrice: number, quantity = 1, extra: Partial<PricingLine> = {}): PricingLine => ({
  key,
  sellerId,
  unitPrice,
  quantity,
  shippingCost: 399,
  freeShipping: false,
  deliveryDaysMin: 2,
  deliveryDaysMax: 5,
  ...extra,
});

describe("computeTotals", () => {
  it("charges one shipping fee per seller (the highest line fee)", () => {
    const t = computeTotals({
      lines: [line("a", "s1", 1000), line("b", "s1", 2000, 1, { shippingCost: 599 }), line("c", "s2", 500)],
      sellers: { s1: seller("s1"), s2: seller("s2") },
      deliveryMethod: "STANDARD",
      countryCode: "PT",
    });
    expect(t.subtotal).toBe(3500);
    expect(t.shipping).toBe(599 + 399);
    expect(t.total).toBe(3500 + 998);
    expect(t.groups).toHaveLength(2);
  });

  it("applies a seller's free-shipping threshold", () => {
    const t = computeTotals({ lines: [line("a", "s1", 4000)], sellers: { s1: seller("s1", 3500) }, deliveryMethod: "STANDARD" });
    expect(t.shipping).toBe(0);
  });

  it("adds the express surcharge and shortens the delivery window", () => {
    const std = computeTotals({ lines: [line("a", "s1", 1000)], sellers: { s1: seller("s1") }, deliveryMethod: "STANDARD" });
    const exp = computeTotals({ lines: [line("a", "s1", 1000)], sellers: { s1: seller("s1") }, deliveryMethod: "EXPRESS" });
    expect(exp.shipping).toBe(std.shipping + 599);
    expect(exp.groups[0].deliveryDaysMax).toBeLessThan(std.groups[0].deliveryDaysMax);
  });

  it("computes VAT contained in a VAT-inclusive total per destination", () => {
    const pt = computeTotals({ lines: [line("a", "s1", 12300, 1, { freeShipping: true })], sellers: { s1: seller("s1") }, deliveryMethod: "STANDARD", countryCode: "PT" });
    expect(pt.vatBps).toBe(2300);
    expect(pt.tax).toBe(2300); // 123.00 gross → 23.00 VAT
    const de = computeTotals({ lines: [line("a", "s1", 11900, 1, { freeShipping: true })], sellers: { s1: seller("s1") }, deliveryMethod: "STANDARD", countryCode: "DE" });
    expect(de.tax).toBe(1900);
  });

  it("applies percentage coupons with a cap and allocates the discount across lines exactly", () => {
    const t = computeTotals({
      lines: [line("a", "s1", 3333), line("b", "s1", 3333), line("c", "s1", 3334)],
      sellers: { s1: seller("s1") },
      coupon: { code: "P10", type: "PERCENT", value: 1000, minSubtotal: 0, maxDiscount: 500, sellerId: null },
      deliveryMethod: "STANDARD",
    });
    expect(t.discount).toBe(500); // 10% of 100.00 = 10.00, capped at 5.00
    expect(Object.values(t.lineDiscounts).reduce((a, b) => a + b, 0)).toBe(500);
  });

  it("rejects a coupon below its minimum subtotal", () => {
    const t = computeTotals({
      lines: [line("a", "s1", 1000)],
      sellers: { s1: seller("s1") },
      coupon: { code: "SAVE5", type: "FIXED", value: 500, minSubtotal: 4000, maxDiscount: null, sellerId: null },
      deliveryMethod: "STANDARD",
    });
    expect(t.coupon).toEqual({ code: "SAVE5", applied: false, reason: "min_subtotal" });
    expect(t.discount).toBe(0);
  });

  it("scopes seller coupons to that seller's items", () => {
    const t = computeTotals({
      lines: [line("a", "s1", 2000), line("b", "s2", 8000)],
      sellers: { s1: seller("s1"), s2: seller("s2") },
      coupon: { code: "S1", type: "PERCENT", value: 5000, minSubtotal: 0, maxDiscount: null, sellerId: "s1" },
      deliveryMethod: "STANDARD",
    });
    expect(t.discount).toBe(1000);
    expect(t.lineDiscounts).toEqual({ a: 1000 });
  });

  it("never discounts more than the eligible subtotal", () => {
    const t = computeTotals({
      lines: [line("a", "s1", 300)],
      sellers: { s1: seller("s1") },
      coupon: { code: "BIG", type: "FIXED", value: 5000, minSubtotal: 0, maxDiscount: null, sellerId: null },
      deliveryMethod: "STANDARD",
    });
    expect(t.discount).toBe(300);
    expect(t.total).toBe(399);
  });

  it("waives shipping with a free-shipping coupon", () => {
    const t = computeTotals({
      lines: [line("a", "s1", 3000)],
      sellers: { s1: seller("s1") },
      coupon: { code: "FREESHIP", type: "FREE_SHIPPING", value: 0, minSubtotal: 2000, maxDiscount: null, sellerId: null },
      deliveryMethod: "STANDARD",
    });
    expect(t.shippingDiscount).toBe(399);
    expect(t.total).toBe(3000);
  });
});
