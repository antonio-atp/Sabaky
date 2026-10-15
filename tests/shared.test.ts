import { describe, expect, it } from "vitest";
import { applyBps, convertFromBase, discountPercent, formatMoney, parseMajorToMinor, vatFromGross } from "@/shared/money";
import { negotiateLocale } from "@/shared/config/locales";
import { addressSchema, checkoutSchema, productInputSchema, registerSchema, searchParamsSchema } from "@/shared/validation";
import { createTranslator } from "@/i18n/core";
import en from "@/i18n/messages/en";
import pt from "@/i18n/messages/pt";

describe("money", () => {
  it("formats minor units per locale and currency", () => {
    expect(formatMoney(123456, "EUR", "pt-PT")).toMatch(/1\s?234,56\s?€/);
    expect(formatMoney(999, "GBP", "en-GB")).toBe("£9.99");
  });
  it("converts from the base currency", () => {
    expect(convertFromBase(1000, "EUR")).toBe(1000);
    expect(convertFromBase(1000, "USD")).toBe(1080);
  });
  it("computes discounts, basis points and VAT", () => {
    expect(discountPercent(7500, 10000)).toBe(25);
    expect(discountPercent(10000, 9000)).toBe(0);
    expect(applyBps(10000, 1500)).toBe(1500);
    expect(vatFromGross(12100, 2100)).toBe(2100);
  });
  it("parses user-entered prices safely", () => {
    expect(parseMajorToMinor("12,34")).toBe(1234);
    expect(parseMajorToMinor("7")).toBe(700);
    expect(parseMajorToMinor("1.999")).toBeNull();
    expect(parseMajorToMinor("-1")).toBeNull();
    expect(parseMajorToMinor("abc")).toBeNull();
  });
});

describe("i18n", () => {
  it("negotiates the best supported locale", () => {
    expect(negotiateLocale("pt-PT,pt;q=0.9,en;q=0.8")).toBe("pt");
    expect(negotiateLocale("ja-JP,de;q=0.5")).toBe("de");
    expect(negotiateLocale(null)).toBe("en");
  });
  it("interpolates and pluralises", () => {
    const t = createTranslator("en", en);
    expect(t("cart.subtotal", { count: 1 })).toBe("Subtotal (1 item)");
    expect(t("cart.subtotal", { count: 3 })).toBe("Subtotal (3 items)");
    expect(t("home.welcomeText", { code: "WELCOME10" })).toContain("WELCOME10");
  });
  it("falls back to English, then to the key itself", () => {
    const t = createTranslator("pt", pt, en);
    expect(t("nav.cart")).toBe("Carrinho");
    expect(t("does.not.exist")).toBe("does.not.exist");
  });
});

describe("validation", () => {
  it("normalises and validates registration input", () => {
    const ok = registerSchema.safeParse({ name: "  Ana  ", email: "ANA@Example.COM ", password: "longpassword1", acceptTerms: true });
    expect(ok.success && ok.data.email).toBe("ana@example.com");
    expect(ok.success && ok.data.name).toBe("Ana");
    const weak = registerSchema.safeParse({ name: "Ana", email: "ana@example.com", password: "onlyletters", acceptTerms: true });
    expect(weak.success).toBe(false);
    const noTerms = registerSchema.safeParse({ name: "Ana", email: "ana@example.com", password: "longpassword1", acceptTerms: false });
    expect(noTerms.success).toBe(false);
  });

  it("strips control characters from free text", () => {
    const parsed = addressSchema.parse({ fullName: "Ana\u0000 Ribeiro", line1: "Rua 1", city: "Lisboa", postalCode: "1100-148", countryCode: "PT" });
    expect(parsed.fullName).toBe("Ana Ribeiro");
  });

  it("rejects unsupported shipping countries", () => {
    expect(addressSchema.safeParse({ fullName: "Ana", line1: "Rua 1", city: "X", postalCode: "12345", countryCode: "ZZ" }).success).toBe(false);
  });

  it("requires an address and a UUID idempotency key at checkout", () => {
    const base = {
      contact: { email: "a@b.co", fullName: "Ana Ribeiro" },
      deliveryMethod: "STANDARD",
      paymentMethod: "CARD",
      idempotencyKey: crypto.randomUUID(),
      acceptTerms: true,
    };
    expect(checkoutSchema.safeParse(base).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, addressId: "abc123" }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...base, addressId: "abc123", idempotencyKey: "nope" }).success).toBe(false);
  });

  it("coerces and bounds search parameters", () => {
    const p = searchParamsSchema.parse({ q: " phone ", page: "3", brand: "nova", minPrice: "1000" });
    expect(p).toMatchObject({ q: "phone", page: 3, brand: ["nova"], minPrice: 1000, sort: "relevance" });
    expect(searchParamsSchema.safeParse({ sort: "DROP TABLE" }).success).toBe(false);
  });

  it("rejects products with duplicate SKUs", () => {
    const variant = { sku: "SKU-1", name: "A", price: 1000, stock: 1 };
    const product = {
      title: "Great product",
      description: "A sufficiently long description.",
      categoryId: "cat1",
      condition: "NEW",
      images: [{ url: "/x.webp", alt: "x" }],
      variants: [variant, { ...variant, name: "B" }],
      shippingCost: 0,
      freeShipping: true,
      deliveryDaysMin: 2,
      deliveryDaysMax: 5,
    };
    expect(productInputSchema.safeParse(product).success).toBe(false);
    expect(productInputSchema.safeParse({ ...product, variants: [variant] }).success).toBe(true);
  });
});
