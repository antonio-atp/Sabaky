import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { reportSchema } from "@/shared/validation";
import { db } from "@/server/db";
import { AppError } from "@/server/http/errors";

export const POST = api({ auth: "user", body: reportSchema, rateLimit: RATE_LIMITS.review }, async ({ params, body, user }) => {
  const product = await db.product.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!product) throw new AppError("NOT_FOUND");
  const existing = await db.productReport.findFirst({ where: { productId: product.id, reporterId: user.id, status: "OPEN" } });
  if (!existing) await db.productReport.create({ data: { productId: product.id, reporterId: user.id, reason: body.reason, details: body.details } });
  return { ok: true };
});
