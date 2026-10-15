import { z } from "zod";
import { optionalText, text } from "./common";

export const sellerDecisionSchema = z.object({
  decision: z.enum(["VERIFIED", "REJECTED", "SUSPENDED"]),
  notes: optionalText(1000),
});

export const userModerationSchema = z.object({
  action: z.enum(["suspend", "reactivate", "grant_admin", "revoke_admin", "force_logout"]),
  reason: optionalText(500),
});

export const productModerationSchema = z.object({
  action: z.enum(["approve", "reject", "archive", "feature", "unfeature"]),
  note: optionalText(500),
});

export const reviewModerationSchema = z.object({
  action: z.enum(["publish", "hide", "remove", "dismiss_reports"]),
});

export const riskDecisionSchema = z.object({
  status: z.enum(["REVIEWING", "DISMISSED", "CONFIRMED"]),
});

export const couponAdminSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, "validation.coupon"),
  description: optionalText(200),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  /** PERCENT → basis points; FIXED → minor units. */
  value: z.number().int().min(0).max(1_000_000),
  minSubtotal: z.number().int().min(0).default(0),
  maxDiscount: z.number().int().min(0).nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perUserLimit: z.number().int().min(1).max(100).default(1),
});

export const bannerSchema = z.object({
  title: text(120),
  subtitle: optionalText(240),
  ctaLabel: optionalText(40),
  // Internal links only — prevents open-redirect / phishing banners.
  href: z.string().trim().max(300).regex(/^\/(?!\/)[^\s]*$/, "validation.internalLink"),
  theme: z.enum(["brand", "sunrise", "ink", "berry"]).default("brand"),
  isActive: z.boolean().default(true),
});

export const refundDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
});
