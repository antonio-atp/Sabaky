import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { AppError } from "@/server/http/errors";
import { couponAdminSchema } from "@/shared/validation";
import { requireSeller } from "@/server/http/seller-guard";
import { db } from "@/server/db";
import { audit } from "@/server/services/audit";

/** Seller-funded discount codes, scoped to the seller's own items. */
export const POST = api({ auth: ["SELLER"], body: couponAdminSchema, rateLimit: RATE_LIMITS.write }, async ({ user, body }) => {
  const seller = await requireSeller(user, { write: true });
  if (seller.status !== "VERIFIED") throw new AppError("FORBIDDEN", "errors.SELLER_NOT_ACTIVE");
  if (body.type === "PERCENT" && body.value > 9000) throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", { value: "validation.invalid" });
  if (await db.coupon.findUnique({ where: { code: body.code } })) throw new AppError("VALIDATION_FAILED", "errors.VALIDATION_FAILED", { code: "validation.codeTaken" });
  const coupon = await db.coupon.create({ data: { ...body, sellerId: seller.id } });
  await audit("seller.coupon_created", { type: "Coupon", id: coupon.id }, { actorId: user.id });
  return coupon;
});
