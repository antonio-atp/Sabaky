import { z } from "zod";
import { email, text } from "./common";

export const passwordSchema = z
  .string()
  .min(10, "validation.passwordLength")
  .max(128, "validation.passwordLength")
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), "validation.passwordStrength");

export const registerSchema = z.object({
  name: text(80, 2),
  email,
  password: passwordSchema,
  acceptTerms: z.literal(true, { message: "validation.acceptTerms" }),
  marketingOptIn: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email,
  // The strength policy is not applied at login so older passwords still work.
  password: z.string().min(1, "validation.required").max(128, "validation.tooLong"),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "validation.required").max(128),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
