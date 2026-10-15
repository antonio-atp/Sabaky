import { z } from "zod";
import { countryCode, email, id, moneyMinor, optionalText, slug, text } from "./common";

export const sellerRegisterSchema = z.object({
  storeName: text(60, 3),
  slug,
  description: optionalText(1000),
  countryCode,
  supportEmail: email,
  legalName: text(120, 2),
  businessType: z.enum(["individual", "company"]),
  registrationNumber: text(40, 3),
  vatNumber: optionalText(20),
  acceptSellerTerms: z.literal(true, { message: "validation.acceptTerms" }),
});

export const storeSettingsSchema = z.object({
  storeName: text(60, 3),
  description: optionalText(1000),
  supportEmail: email,
  logoUrl: optionalText(500),
  bannerUrl: optionalText(500),
  freeShippingThreshold: moneyMinor.nullable().optional(),
  handlingDays: z.number().int().min(0).max(30),
});

export const variantInputSchema = z.object({
  id: id.optional(),
  sku: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9._-]+$/, "validation.sku"),
  name: text(80),
  color: optionalText(40),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  size: optionalText(20),
  price: moneyMinor.min(1, "validation.invalid"),
  compareAtPrice: moneyMinor.nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000),
  isActive: z.boolean().default(true),
});

export const productInputSchema = z
  .object({
    title: text(160, 5),
    description: text(10_000, 20),
    categoryId: id,
    brandName: optionalText(60),
    condition: z.enum(["NEW", "REFURBISHED", "USED"]),
    highlights: z.array(text(160)).max(8).default([]),
    specifications: z.array(z.object({ label: text(60), value: text(200) })).max(40).default([]),
    images: z
      .array(z.object({ url: z.string().min(1).max(500), alt: text(160) }))
      .min(1, "validation.imagesRequired")
      .max(10),
    variants: z.array(variantInputSchema).min(1).max(100),
    shippingCost: moneyMinor,
    freeShipping: z.boolean(),
    deliveryDaysMin: z.number().int().min(1).max(60),
    deliveryDaysMax: z.number().int().min(1).max(90),
    publish: z.boolean().default(true),
  })
  .refine((p) => p.deliveryDaysMax >= p.deliveryDaysMin, { path: ["deliveryDaysMax"], message: "validation.invalid" })
  .refine((p) => new Set(p.variants.map((v) => v.sku.toLowerCase())).size === p.variants.length, {
    path: ["variants"],
    message: "validation.duplicateSku",
  });
export type ProductInput = z.infer<typeof productInputSchema>;

export const shipmentUpdateSchema = z.object({
  status: z.enum(["LABEL_CREATED", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"]),
  carrier: optionalText(40),
  trackingNumber: z
    .string()
    .trim()
    .max(60)
    .regex(/^[A-Za-z0-9-]*$/, "validation.invalid")
    .optional()
    .nullable(),
  location: optionalText(80),
});

export const inventoryUpdateSchema = z.object({
  quantity: z.number().int().min(0).max(1_000_000),
  price: moneyMinor.min(1).optional(),
});

export const reviewReplySchema = z.object({ reply: text(2000, 2) });
