import { z } from "zod";
import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { bannerSchema } from "@/shared/validation";
import { db } from "@/server/db";
import { invalidate } from "@/server/cache";
import { audit } from "@/server/services/audit";

export const POST = api({ auth: ["ADMIN"], body: bannerSchema, rateLimit: RATE_LIMITS.write }, async ({ user, body, ipHash }) => {
  const count = await db.banner.count({ where: { placement: "home_hero" } });
  const banner = await db.banner.create({ data: { ...body, placement: "home_hero", sortOrder: count } });
  invalidate("catalog:banners");
  await audit("admin.banner.created", { type: "Banner", id: banner.id }, { actorId: user.id, ipHash });
  return banner;
});

export const PATCH = api({ auth: ["ADMIN"], body: z.object({ id: z.string().max(40), isActive: z.boolean() }), rateLimit: RATE_LIMITS.write }, async ({ user, body, ipHash }) => {
  await db.banner.update({ where: { id: body.id }, data: { isActive: body.isActive } });
  invalidate("catalog:banners");
  await audit("admin.banner.toggled", { type: "Banner", id: body.id }, { actorId: user.id, ipHash });
  return { ok: true };
});
