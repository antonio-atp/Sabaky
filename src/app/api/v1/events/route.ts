import { z } from "zod";
import { api } from "@/server/http/api";
import { id } from "@/shared/validation";
import { trackEvent } from "@/server/services/recommendations";
import { incrementViewCount } from "@/server/services/catalog";
import { rateLimit } from "@/server/security/rate-limit";

const body = z.object({ type: z.enum(["VIEW"]), productId: id });

/**
 * Behavioural signal intake. Aggregate view counts are always recorded
 * (anonymous); per-user events only with personalisation consent (see trackEvent).
 */
export const POST = api({ body }, async ({ body, user, ipHash }) => {
  const rl = await rateLimit({ name: "view", limit: 1, windowMs: 30 * 60_000 }, `${ipHash}:${body.productId}`);
  if (rl.ok) await incrementViewCount(body.productId);
  await trackEvent({ userId: user?.id ?? null, type: "VIEW", productId: body.productId });
  return { ok: true };
});
