import { z } from "zod";
import { COUNTRY_CODES } from "../config/countries";

/**
 * Validation schemas are isomorphic: used by API route handlers (authoritative)
 * and by client forms (UX only). Messages are i18n keys under `validation.*`.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trims, strips control characters and enforces length. */
export const text = (max: number, min = 1) =>
  z
    .string()
    .transform((s) => s.replace(CONTROL_CHARS, "").trim())
    .pipe(z.string().min(min, min === 1 ? "validation.required" : "validation.tooShort").max(max, "validation.tooLong"));

export const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((s) => {
      const v = (s ?? "").replace(CONTROL_CHARS, "").trim();
      return v.length ? v : null;
    })
    .pipe(z.string().max(max, "validation.tooLong").nullable());

export const id = z.string().min(1).max(64).regex(/^[a-z0-9]+$/i, "validation.invalid");

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("validation.email").max(254, "validation.tooLong"));

export const countryCode = z.enum(COUNTRY_CODES as [string, ...string[]], { message: "validation.invalid" });

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "validation.tooShort")
  .max(60, "validation.tooLong")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "validation.slug");

export const moneyMinor = z.number().int("validation.invalid").min(0, "validation.invalid").max(100_000_000, "validation.invalid");

export const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{6,20}$/, "validation.phone");

/** Empty string → null, otherwise a valid phone number. */
export const optionalPhone = z
  .union([z.literal(""), phone])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));
