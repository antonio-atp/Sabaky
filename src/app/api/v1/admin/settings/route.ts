import { z } from "zod";
import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { getPlatformSettings, updatePlatformSettings } from "@/server/services/settings";
import { audit } from "@/server/services/audit";

const schema = z.object({
  requireProductApproval: z.boolean().optional(),
  defaultCommissionBps: z.number().int().min(0).max(5000).optional(),
  maintenanceMode: z.boolean().optional(),
});

export const GET = api({ auth: ["ADMIN"] }, async () => getPlatformSettings());

export const PATCH = api({ auth: ["ADMIN"], body: schema, rateLimit: RATE_LIMITS.write }, async ({ user, body, ipHash }) => {
  const value = await updatePlatformSettings(body);
  await audit("admin.settings.updated", { type: "PlatformSetting", id: "platform" }, { actorId: user.id, ipHash, metadata: body });
  return value;
});
