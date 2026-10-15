import "server-only";
import { db } from "../db";
import { AppError } from "./errors";
import type { SessionUser } from "../auth/session";

/** Resolves the caller's seller account; rejects suspended/rejected sellers for write actions. */
export async function requireSeller(user: SessionUser, opts: { write?: boolean } = {}) {
  if (!user.sellerId) throw new AppError("FORBIDDEN", "errors.NOT_A_SELLER");
  const seller = await db.seller.findUnique({ where: { id: user.sellerId }, select: { id: true, status: true } });
  if (!seller) throw new AppError("FORBIDDEN", "errors.NOT_A_SELLER");
  if (opts.write && (seller.status === "SUSPENDED" || seller.status === "REJECTED")) throw new AppError("FORBIDDEN", "errors.SELLER_NOT_ACTIVE");
  return seller;
}
