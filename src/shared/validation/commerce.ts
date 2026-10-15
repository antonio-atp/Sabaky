import { z } from "zod";
import { DELIVERY_METHODS, MAX_CART_LINE_QTY, PAYMENT_METHODS, SORT_OPTIONS } from "../constants";
import { id, optionalPhone, optionalText, text } from "./common";
import { addressSchema } from "./account";

export const addToCartSchema = z.object({
  variantId: id,
  quantity: z.number().int().min(1).max(MAX_CART_LINE_QTY).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(MAX_CART_LINE_QTY).optional(),
  savedForLater: z.boolean().optional(),
  variantId: id.optional(),
});

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, "validation.coupon"),
});

export const wishlistSchema = z.object({
  productId: id,
  notifyOnPriceDrop: z.boolean().optional(),
});

const flag = z.enum(["1"]).optional();

/** Search / listing query-string contract (shared by web and mobile clients). */
export const searchParamsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  brand: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v ? [v].flat().filter(Boolean).slice(0, 20) : [])),
  seller: z.string().trim().max(60).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  inStock: flag,
  freeShipping: flag,
  onSale: flag,
  maxDays: z.coerce.number().int().min(1).max(60).optional(),
  condition: z.enum(["NEW", "REFURBISHED", "USED"]).optional(),
  sort: z.enum(SORT_OPTIONS).optional().default("relevance"),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
});
export type SearchParams = z.infer<typeof searchParamsSchema>;

export const checkoutQuoteSchema = z.object({
  countryCode: z.string().length(2).optional(),
  deliveryMethod: z.enum(DELIVERY_METHODS).default("STANDARD"),
});

export const checkoutSchema = z
  .object({
    contact: z.object({
      email: z.string().trim().toLowerCase().pipe(z.email("validation.email").max(254)),
      fullName: text(100, 2),
      phone: optionalPhone,
    }),
    addressId: id.optional(),
    address: addressSchema.optional(),
    saveAddress: z.boolean().optional().default(false),
    deliveryMethod: z.enum(DELIVERY_METHODS),
    paymentMethod: z.enum(PAYMENT_METHODS),
    /** Provider token produced client-side by the provider SDK — never raw card data. */
    paymentToken: z.string().max(200).optional(),
    idempotencyKey: z.uuid(),
    acceptTerms: z.literal(true, { message: "validation.acceptTerms" }),
  })
  .refine((c) => c.addressId || c.address, { path: ["address"], message: "validation.required" });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: optionalText(120),
  body: text(4000, 10),
  images: z.array(z.string().max(500)).max(6).default([]),
});

export const reportSchema = z.object({
  reason: z.enum(["spam", "offensive", "fake", "counterfeit", "prohibited", "misleading", "other"]),
  details: optionalText(1000),
});

export const questionSchema = z.object({ question: text(500, 5) });
export const answerSchema = z.object({ answer: text(2000, 2) });

export const cancelOrderSchema = z.object({ reason: optionalText(500) });

export const returnRequestSchema = z.object({
  orderItemId: id,
  quantity: z.number().int().min(1).max(MAX_CART_LINE_QTY),
  reason: z.enum(["damaged", "wrong_item", "not_as_described", "no_longer_needed", "other"]),
  details: optionalText(1000),
});

export const disputeSchema = z.object({
  reason: z.enum(["not_received", "not_as_described", "refund_issue", "other"]),
  details: text(2000, 10),
});
