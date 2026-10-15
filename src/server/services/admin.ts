import "server-only";
import { db } from "../db";
import { AppError } from "../http/errors";
import { revokeAllSessions } from "../auth/session";
import { payments } from "../integrations/payments";
import { invalidate } from "../cache";
import { audit } from "./audit";
import { notify } from "./notifications";
import { recalcProductRating } from "./reviews";
import { fillDays } from "./seller";
import type { Prisma, RiskStatus, SellerStatus } from "@/generated/prisma/client";

const PAID = ["PAYMENT_CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "REFUNDED"] as const;
const PAGE = 25;

// ── Analytics ───────────────────────────────────────────────────────────────

export async function platformAnalytics(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const paidOrders: Prisma.OrderWhereInput = { status: { in: [...PAID] }, placedAt: { gte: since } };

  const [gmv, commission, refunds, customers, sellers, pendingSellers, products, activeViewers, buyers, series, openRisk, topSellers] = await Promise.all([
    db.order.aggregate({ where: paidOrders, _sum: { total: true }, _count: { _all: true } }),
    db.orderItem.aggregate({ where: { status: { not: "CANCELLED" }, order: paidOrders }, _sum: { commission: true } }),
    db.refund.aggregate({ where: { status: "COMPLETED", createdAt: { gte: since } }, _sum: { amount: true } }),
    db.user.count({ where: { status: "ACTIVE", roles: { has: "CUSTOMER" } } }),
    db.seller.count({ where: { status: "VERIFIED" } }),
    db.seller.count({ where: { status: "PENDING" } }),
    db.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
    db.userEvent.findMany({ where: { type: "VIEW", createdAt: { gte: since } }, distinct: ["userId"], select: { userId: true } }),
    db.order.findMany({ where: paidOrders, distinct: ["userId"], select: { userId: true } }),
    db.$queryRaw<{ day: Date; total: bigint }[]>`
      SELECT date_trunc('day', "placedAt") AS day, COALESCE(SUM(total), 0)::bigint AS total
      FROM "Order"
      WHERE status::text IN ('PAYMENT_CONFIRMED','PROCESSING','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','REFUNDED')
        AND "placedAt" >= ${since}
      GROUP BY 1 ORDER BY 1`,
    db.riskEvent.count({ where: { status: "OPEN" } }),
    db.orderItem.groupBy({
      by: ["sellerId"],
      where: { status: { not: "CANCELLED" }, order: paidOrders },
      _sum: { lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 5,
    }),
  ]);

  const sellerNames = await db.seller.findMany({ where: { id: { in: topSellers.map((s) => s.sellerId) } }, select: { id: true, storeName: true, ratingAvg: true } });
  const totalSales = gmv._sum.total ?? 0;
  const orderCount = gmv._count._all;
  return {
    totalSales,
    revenue: commission._sum.commission ?? 0,
    orders: orderCount,
    customers,
    sellers,
    pendingSellers,
    products,
    openRisk,
    averageOrderValue: orderCount ? Math.round(totalSales / orderCount) : 0,
    refundRate: totalSales ? (refunds._sum.amount ?? 0) / totalSales : 0,
    // Signed-in visitors who purchased ÷ signed-in visitors who viewed a product.
    conversionRate: activeViewers.length ? Math.min(1, buyers.length / activeViewers.length) : 0,
    series: fillDays(series.map((s) => ({ day: s.day, value: Number(s.total) })), days),
    topSellers: topSellers.map((t) => ({
      sellerId: t.sellerId,
      name: sellerNames.find((s) => s.id === t.sellerId)?.storeName ?? "—",
      rating: sellerNames.find((s) => s.id === t.sellerId)?.ratingAvg ?? 0,
      sales: t._sum.lineTotal ?? 0,
    })),
  };
}

// ── Users ───────────────────────────────────────────────────────────────────

export async function listUsers(opts: { q?: string; role?: string; status?: string; page?: number }) {
  const where: Prisma.UserWhereInput = {
    ...(opts.q ? { OR: [{ email: { contains: opts.q, mode: "insensitive" } }, { name: { contains: opts.q, mode: "insensitive" } }] } : {}),
    ...(opts.role ? { roles: { has: opts.role as "CUSTOMER" | "SELLER" | "ADMIN" | "SUPPORT" } } : {}),
    ...(opts.status ? { status: opts.status as "ACTIVE" | "SUSPENDED" | "DELETED" } : {}),
  };
  const page = opts.page ?? 1;
  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
      select: { id: true, email: true, name: true, roles: true, status: true, emailVerifiedAt: true, createdAt: true, lastLoginAt: true, _count: { select: { orders: true } } },
    }),
    db.user.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / PAGE)) };
}

export async function moderateUser(actorId: string, userId: string, action: string, reason: string | null, ipHash: string) {
  if (actorId === userId) throw new AppError("BAD_REQUEST", "errors.SELF_MODERATION");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.status === "DELETED") throw new AppError("NOT_FOUND");
  switch (action) {
    case "suspend":
      await db.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
      await revokeAllSessions(userId);
      break;
    case "reactivate":
      await db.user.update({ where: { id: userId }, data: { status: "ACTIVE", failedLoginCount: 0, lockedUntil: null } });
      break;
    case "grant_admin":
      if (!user.roles.includes("ADMIN")) await db.user.update({ where: { id: userId }, data: { roles: { push: "ADMIN" } } });
      break;
    case "revoke_admin":
      await db.user.update({ where: { id: userId }, data: { roles: user.roles.filter((r) => r !== "ADMIN") } });
      await revokeAllSessions(userId);
      break;
    case "force_logout":
      await revokeAllSessions(userId);
      break;
  }
  await audit(`admin.user.${action}`, { type: "User", id: userId }, { actorId, ipHash, metadata: { reason } });
}

// ── Sellers ─────────────────────────────────────────────────────────────────

export async function listSellers(status?: string, page = 1) {
  const where: Prisma.SellerWhereInput = status ? { status: status as SellerStatus } : {};
  const [items, total] = await Promise.all([
    db.seller.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: PAGE,
      skip: (page - 1) * PAGE,
      include: {
        user: { select: { email: true, name: true } },
        verifications: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { legalName: true, businessType: true, countryCode: true, status: true, createdAt: true, reviewNotes: true, vatNumber: true },
        },
        _count: { select: { products: true, orderItems: true } },
        riskEvents: { where: { status: "OPEN" }, select: { id: true } },
      },
    }),
    db.seller.count({ where }),
  ]);
  return {
    // Encrypted identifiers never leave the service layer; the UI only needs to know one exists.
    items: items.map((s) => ({ ...s, verifications: s.verifications.map(({ vatNumber, ...v }) => ({ ...v, hasVat: !!vatNumber })) })),
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE)),
  };
}

export async function decideSeller(actorId: string, sellerId: string, decision: "VERIFIED" | "REJECTED" | "SUSPENDED", notes: string | null, ipHash: string) {
  const seller = await db.seller.findUnique({ where: { id: sellerId } });
  if (!seller) throw new AppError("NOT_FOUND");
  await db.$transaction(async (tx) => {
    await tx.seller.update({ where: { id: sellerId }, data: { status: decision } });
    const latest = await tx.sellerVerification.findFirst({ where: { sellerId }, orderBy: { createdAt: "desc" } });
    if (latest) {
      await tx.sellerVerification.update({ where: { id: latest.id }, data: { status: decision, reviewerId: actorId, reviewedAt: new Date(), reviewNotes: notes } });
    }
    // Suspended sellers' products disappear via the visibility rule; on verification,
    // products the seller submitted while pending go live.
    if (decision === "VERIFIED") {
      await tx.product.updateMany({ where: { sellerId, status: "PENDING_REVIEW" }, data: { status: "ACTIVE", publishedAt: new Date() } });
    }
  });
  const key = decision === "VERIFIED" ? "sellerVerified" : decision === "REJECTED" ? "sellerRejected" : "sellerSuspended";
  await notify(seller.userId, { type: "SELLER_UPDATE", key, vars: { store: seller.storeName }, href: "/seller" });
  await audit(`admin.seller.${decision.toLowerCase()}`, { type: "Seller", id: sellerId }, { actorId, ipHash, metadata: { notes } });
  invalidate("catalog:");
}

// ── Products ────────────────────────────────────────────────────────────────

export async function listProductsAdmin(opts: { status?: string; q?: string; reported?: boolean; page?: number }) {
  const where: Prisma.ProductWhereInput = {
    ...(opts.status ? { status: opts.status as "ACTIVE" } : {}),
    ...(opts.q ? { title: { contains: opts.q, mode: "insensitive" } } : {}),
    ...(opts.reported ? { reports: { some: { status: "OPEN" } } } : {}),
  };
  const page = opts.page ?? 1;
  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: PAGE,
      skip: (page - 1) * PAGE,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        price: true,
        totalStock: true,
        isFeatured: true,
        updatedAt: true,
        seller: { select: { storeName: true, status: true } },
        category: { select: { name: true } },
        images: { take: 1, select: { url: true, alt: true } },
        _count: { select: { reports: { where: { status: "OPEN" } } } },
      },
    }),
    db.product.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / PAGE)) };
}

export async function moderateProduct(actorId: string, productId: string, action: string, note: string | null, ipHash: string) {
  const product = await db.product.findUnique({ where: { id: productId }, include: { seller: { select: { userId: true } } } });
  if (!product) throw new AppError("NOT_FOUND");
  const data: Prisma.ProductUpdateInput =
    action === "approve"
      ? { status: "ACTIVE", publishedAt: product.publishedAt ?? new Date(), moderationNote: null }
      : action === "reject"
        ? { status: "REJECTED", moderationNote: note }
        : action === "archive"
          ? { status: "ARCHIVED", moderationNote: note }
          : { isFeatured: action === "feature" };
  await db.product.update({ where: { id: productId }, data });
  if (action === "approve" || action === "reject" || action === "archive") {
    await db.productReport.updateMany({ where: { productId, status: "OPEN" }, data: { status: action === "approve" ? "DISMISSED" : "ACTIONED" } });
    await notify(product.seller.userId, {
      type: "SELLER_UPDATE",
      key: action === "approve" ? "productApproved" : "productRejected",
      vars: { title: product.title.slice(0, 60) },
      href: "/seller/products",
    });
  }
  await audit(`admin.product.${action}`, { type: "Product", id: productId }, { actorId, ipHash, metadata: { note } });
  invalidate("catalog:");
}

// ── Orders, refunds ─────────────────────────────────────────────────────────

export async function listOrdersAdmin(opts: { status?: string; q?: string; page?: number }) {
  const where: Prisma.OrderWhereInput = {
    ...(opts.status ? { status: opts.status as "DELIVERED" } : {}),
    ...(opts.q ? { OR: [{ number: { contains: opts.q, mode: "insensitive" } }, { email: { contains: opts.q, mode: "insensitive" } }] } : {}),
  };
  const page = opts.page ?? 1;
  const [items, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        placedAt: true,
        riskScore: true,
        email: true,
        deliveryMethod: true,
        payments: { select: { method: true, status: true }, take: 1, orderBy: { createdAt: "desc" } },
        _count: { select: { items: true, shipments: true } },
      },
    }),
    db.order.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / PAGE)) };
}

export async function listRefunds() {
  return db.refund.findMany({
    where: { status: { in: ["REQUESTED", "APPROVED", "PROCESSING", "FAILED"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      order: { select: { number: true, userId: true } },
      returnRequest: { select: { reason: true, details: true, quantity: true, orderItem: { select: { title: true } } } },
    },
  });
}

export async function decideRefund(actorId: string, refundId: string, decision: "APPROVED" | "REJECTED", ipHash: string) {
  const refund = await db.refund.findUnique({ where: { id: refundId }, include: { order: { include: { payments: true } } } });
  if (!refund || refund.status !== "REQUESTED") throw new AppError("CONFLICT");
  const href = `/account/orders/${refund.order.number}`;

  if (decision === "REJECTED") {
    await db.refund.update({ where: { id: refundId }, data: { status: "REJECTED" } });
    if (refund.returnId) {
      const ret = await db.returnRequest.update({ where: { id: refund.returnId }, data: { status: "REJECTED" } });
      await db.orderItem.update({ where: { id: ret.orderItemId }, data: { status: "ACTIVE" } });
    }
    await notify(refund.order.userId, { type: "REFUND_UPDATE", key: "refundRejected", vars: { number: refund.order.number }, href });
  } else {
    const payment = refund.order.payments.find((p) => p.status === "CAPTURED" || p.status === "PARTIALLY_REFUNDED");
    if (!payment?.providerPaymentId) throw new AppError("CONFLICT", "errors.NO_CAPTURED_PAYMENT");
    const result = await payments().refund(payment.providerPaymentId, refund.amount, `refund-${refund.id}`);
    const completed = result.status === "COMPLETED";
    await db.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refundId },
        data: { status: completed ? "COMPLETED" : result.status === "FAILED" ? "FAILED" : "PROCESSING", paymentId: payment.id, providerRefundId: result.providerRefundId },
      });
      if (refund.returnId) {
        const ret = await tx.returnRequest.update({ where: { id: refund.returnId }, data: { status: completed ? "REFUNDED" : "APPROVED" } });
        await tx.orderItem.update({ where: { id: ret.orderItemId }, data: { status: completed ? "REFUNDED" : "RETURNED" } });
      }
      const refunded = await tx.refund.aggregate({ where: { paymentId: payment.id, status: "COMPLETED" }, _sum: { amount: true } });
      await tx.payment.update({ where: { id: payment.id }, data: { status: (refunded._sum.amount ?? 0) >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    });
    if (completed) await notify(refund.order.userId, { type: "REFUND_UPDATE", key: "refundCompleted", vars: { number: refund.order.number }, href });
  }
  await audit(`admin.refund.${decision.toLowerCase()}`, { type: "Refund", id: refundId }, { actorId, ipHash, metadata: { amount: refund.amount } });
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function listReviewsForModeration() {
  return db.review.findMany({
    where: { OR: [{ status: "PENDING" }, { reports: { some: { status: "OPEN" } } }] },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      product: { select: { title: true, slug: true } },
      user: { select: { name: true, email: true } },
      reports: { where: { status: "OPEN" }, select: { reason: true, createdAt: true } },
    },
  });
}

export async function moderateReview(actorId: string, reviewId: string, action: string, ipHash: string) {
  const review = await db.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError("NOT_FOUND");
  const status = action === "publish" || action === "dismiss_reports" ? "PUBLISHED" : action === "hide" ? "HIDDEN" : "REMOVED";
  await db.$transaction([
    db.review.update({ where: { id: reviewId }, data: { status } }),
    db.reviewReport.updateMany({ where: { reviewId, status: "OPEN" }, data: { status: status === "PUBLISHED" ? "DISMISSED" : "ACTIONED" } }),
  ]);
  await recalcProductRating(review.productId);
  await audit(`admin.review.${action}`, { type: "Review", id: reviewId }, { actorId, ipHash });
}

// ── Risk ────────────────────────────────────────────────────────────────────

export async function listRiskEvents(status: RiskStatus | undefined) {
  return db.riskEvent.findMany({
    where: status ? { status } : { status: { in: ["OPEN", "REVIEWING"] } },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      user: { select: { email: true, name: true, status: true } },
      seller: { select: { storeName: true, status: true } },
      order: { select: { number: true, total: true } },
    },
  });
}

export async function decideRisk(actorId: string, id: string, status: RiskStatus, ipHash: string) {
  const res = await db.riskEvent.updateMany({ where: { id }, data: { status, reviewerId: actorId, reviewedAt: new Date() } });
  if (!res.count) throw new AppError("NOT_FOUND");
  await audit("admin.risk.decision", { type: "RiskEvent", id }, { actorId, ipHash, metadata: { status } });
}

// ── Promotions & audit ──────────────────────────────────────────────────────

export const listCoupons = () => db.coupon.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { seller: { select: { storeName: true } } } });
export const listBanners = () => db.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] });
export const listPromotions = () => db.promotion.findMany({ orderBy: { startsAt: "desc" }, take: 20, include: { _count: { select: { products: true } } } });

export async function listAuditLogs(opts: { action?: string; page?: number }) {
  const page = opts.page ?? 1;
  const where: Prisma.AuditLogWhereInput = opts.action ? { action: { startsWith: opts.action } } : {};
  const [items, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, skip: (page - 1) * 50, include: { actor: { select: { email: true } } } }),
    db.auditLog.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / 50)) };
}
