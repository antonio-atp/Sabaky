import "server-only";
import { db, type Tx } from "../db";
import { logger } from "../logger";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Append-only audit trail for security-relevant and privileged actions
 * (auth events, admin moderation, seller verification, refunds, data exports).
 * Never include secrets or full personal data in `metadata`.
 */
export async function audit(
  action: string,
  entity: { type: string; id?: string | null },
  opts: { actorId?: string | null; ipHash?: string | null; metadata?: Prisma.InputJsonValue; tx?: Tx } = {},
) {
  const client = opts.tx ?? db;
  try {
    await client.auditLog.create({
      data: {
        action,
        entityType: entity.type,
        entityId: entity.id ?? null,
        actorId: opts.actorId ?? null,
        ipHash: opts.ipHash ?? null,
        metadata: opts.metadata ?? {},
      },
    });
  } catch (error) {
    // Auditing must never break the user-facing operation, but failures are loud.
    logger.error("Audit log write failed", { action, error });
  }
}
