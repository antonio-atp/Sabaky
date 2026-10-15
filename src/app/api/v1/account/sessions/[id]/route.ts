import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { db } from "@/server/db";
import { AppError } from "@/server/http/errors";
import { audit } from "@/server/services/audit";

/** Sign out a specific device. */
export const DELETE = api({ auth: "user", rateLimit: RATE_LIMITS.write }, async ({ user, params, ipHash }) => {
  const res = await db.session.updateMany({ where: { id: params.id, userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!res.count) throw new AppError("NOT_FOUND");
  await audit("auth.session_revoked", { type: "Session", id: params.id }, { actorId: user.id, ipHash });
  return { ok: true };
});
