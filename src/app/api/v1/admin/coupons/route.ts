import { z } from "zod";
import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { AppError } from "@/server/http/errors";
import { couponAdminSchema } from "@/shared/validation";
import { db } from "@/server/db";
import { audit } from "@/server/services/audit";

export const POST = api({ auth: ["ADMIN"], body: couponAdminSchema, rateLimit: RATE_LIMITS.write }, async ({ user, body, ipHash }) => {
  if (await db.coupon.findUnique({ where: { code: body.code } })) throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", { code: "validation.codeTaken" });
  const coupon = await db.coupon.create({ data: body });
  await audit("admin.coupon.created", { type: "Coupon", id: coupon.id }, { actorId: user.id, ipHash, metadata: { code: coupon.code } });
  return coupon;
});

/** Toggle a coupon on/off. */
export const PATCH = api({ auth: ["ADMIN"], body: z.object({ id: z.string().max(40), isActive: z.boolean() }), rateLimit: RATE_LIMITS.write }, async ({ user, body, ipHash }) => {
  await db.coupon.update({ where: { id: body.id }, data: { isActive: body.isActive } });
  await audit("admin.coupon.toggled", { type: "Coupon", id: body.id }, { actorId: user.id, ipHash, metadata: { isActive: body.isActive } });
  return { ok: true };
});
