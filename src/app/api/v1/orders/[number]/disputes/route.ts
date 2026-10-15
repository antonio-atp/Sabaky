import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { AppError } from "@/server/http/errors";
import { disputeSchema } from "@/shared/validation";
import { db } from "@/server/db";
import { audit } from "@/server/services/audit";

export const POST = api({ auth: "user", body: disputeSchema, rateLimit: RATE_LIMITS.write }, async ({ user, params, body, ipHash }) => {
  const order = await db.order.findFirst({ where: { number: params.number, userId: user.id }, select: { id: true } });
  if (!order) throw new AppError("NOT_FOUND");
  const open = await db.dispute.findFirst({ where: { orderId: order.id, status: { in: ["OPEN", "UNDER_REVIEW"] } } });
  if (open) throw new AppError("CONFLICT", "errors.DISPUTE_EXISTS");
  const dispute = await db.dispute.create({ data: { orderId: order.id, openedById: user.id, reason: body.reason, details: body.details } });
  await audit("order.dispute_opened", { type: "Dispute", id: dispute.id }, { actorId: user.id, ipHash });
  return { id: dispute.id };
});
