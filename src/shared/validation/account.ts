import { z } from "zod";
import { LOCALES } from "../config/locales";
import { CURRENCY_CODES } from "../config/currencies";
import { countryCode, optionalPhone, optionalText, text } from "./common";

const currency = z.enum(CURRENCY_CODES as [string, ...string[]]);

export const addressSchema = z.object({
  label: optionalText(40),
  fullName: text(100, 2),
  line1: text(120, 3),
  line2: optionalText(120),
  city: text(80),
  region: optionalText(80),
  postalCode: z.string().trim().regex(/^[A-Za-z0-9 -]{3,10}$/, "validation.postalCode"),
  countryCode,
  phone: optionalPhone,
  isDefault: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const profileSchema = z.object({
  name: text(80, 2),
  phone: optionalPhone,
  locale: z.enum(LOCALES),
  currency,
  countryCode: countryCode.optional().nullable(),
});

export const preferencesSchema = z.object({
  locale: z.enum(LOCALES).optional(),
  currency: currency.optional(),
  country: countryCode.optional(),
});

export const NOTIFICATION_TYPES = [
  "ORDER_CONFIRMATION",
  "PAYMENT_CONFIRMATION",
  "SHIPPING_UPDATE",
  "DELIVERY_UPDATE",
  "REFUND_UPDATE",
  "PROMOTION",
  "PRICE_DROP",
  "WISHLIST_UPDATE",
  "SELLER_UPDATE",
  "SECURITY_ALERT",
] as const;
export const NOTIFICATION_CHANNELS = ["IN_APP", "EMAIL", "PUSH"] as const;

export const notificationPrefsSchema = z.object({
  preferences: z
    .array(z.object({ type: z.enum(NOTIFICATION_TYPES), channel: z.enum(NOTIFICATION_CHANNELS), enabled: z.boolean() }))
    .max(60),
});

export const consentSchema = z.object({
  analytics: z.boolean(),
  marketing: z.boolean(),
  personalization: z.boolean(),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "validation.required").max(128),
  confirm: z.literal("DELETE", { message: "validation.confirmDelete" }),
});
