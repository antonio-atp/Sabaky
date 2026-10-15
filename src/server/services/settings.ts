import "server-only";
import { db } from "../db";
import { cached, invalidate } from "../cache";

/** Platform-wide switches editable by administrators (stored in PlatformSetting). */
export interface PlatformSettings {
  requireProductApproval: boolean;
  defaultCommissionBps: number;
  maintenanceMode: boolean;
}

const DEFAULTS: PlatformSettings = {
  requireProductApproval: false,
  defaultCommissionBps: 1000,
  maintenanceMode: false,
};

export function getPlatformSettings(): Promise<PlatformSettings> {
  return cached("settings:platform", 60, async () => {
    const row = await db.platformSetting.findUnique({ where: { key: "platform" } });
    return { ...DEFAULTS, ...((row?.value as Partial<PlatformSettings>) ?? {}) };
  });
}

export async function updatePlatformSettings(patch: Partial<PlatformSettings>) {
  const current = await getPlatformSettings();
  const value = { ...current, ...patch };
  await db.platformSetting.upsert({ where: { key: "platform" }, update: { value }, create: { key: "platform", value } });
  invalidate("settings:");
  return value;
}
