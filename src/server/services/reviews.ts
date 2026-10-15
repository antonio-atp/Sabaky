import "server-only";
import { db } from "../db";
import { AppError } from "../http/errors";
import { audit } from "./audit";
import { notify } from "./notifications";
import { REVIEW_EDIT_WINDOW_DAYS } from "@/shared/constants";

/**
 * Reviews: only customers with a *delivered* order line for the product may
 * review, so every review is a verified purchase. The flag is always
 * computed server-side, never accepted from input.
 */
export async function reviewEligibility(userId: string, productId: string) {
  const [orderItem, existing] = await Promise.all([
    db.orderItem.findFirst({
      where: { productId, order: { userId, status: "DELIVERED" }, review: null, status: { in: ["ACTIVE", "RETURN_REQUESTED", "RETURNED"] } },
      select: { id: true },
    }),
    db.review.findUnique({ where: { productId_userId: { productId, userId } }, select: { id: true } }),
  ]);
  return { canReview: !!orderItem && !existing, orderItemId: orderItem?.id ?? null, existingReviewId: existing?.id ?? null };
}

export async function recalcProductRating(productId: string) {
  const agg = await db.review.aggregate({ where: { productId, status: "PUBLISHED" }, _avg: { rating: true }, _count: { _all: true } });
  const product = await db.product.update({
    where: { id: productId },
    data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count._all },
    select: { sellerId: true },
  });
  const sellerAgg = await db.review.aggregate({ where: { product: { sellerId: product.sellerId }, status: "PUBLISHED" }, _avg: { rating: true }, _count: { _all: true } });
  await db.seller.update({ where: { id: product.sellerId }, data: { ratingAvg: sellerAgg._avg.rating ?? 0, ratingCount: sellerAgg._count._all } });
}

export async function createReview(userId: string, productId: string, input: { rating: number; title: string | null; body: string; images: string[] }) {
  const { canReview, orderItemId } = await reviewEligibility(userId, productId);
  if (!canReview || !orderItemId) throw new AppError("FORBIDDEN", "errors.REVIEW_NOT_ELIGIBLE");
  const images = input.images.filter(isOwnMediaUrl);
  const review = await db.review.create({
    data: {
      productId,
      userId,
      orderItemId,
      rating: input.rating,
      title: input.title,
      body: input.body,
      images,
      isVerifiedPurchase: true,
      editableUntil: new Date(Date.now() + REVIEW_EDIT_WINDOW_DAYS * 86_400_000),
    },
  });
  await recalcProductRating(productId);
  const product = await db.product.findUnique({ where: { id: productId }, select: { title: true, seller: { select: { userId: true } } } });
  if (product) await notify(product.seller.userId, { type: "SELLER_UPDATE", key: "newReview", vars: { rating: input.rating }, href: "/seller/reviews" });
  return review;
}

export async function updateReview(userId: string, reviewId: string, input: { rating: number; title: string | null; body: string; images: string[] }) {
  const review = await db.review.findFirst({ where: { id: reviewId, userId } });
  if (!review) throw new AppError("NOT_FOUND");
  if (review.editableUntil < new Date() || review.status === "REMOVED") throw new AppError("FORBIDDEN", "errors.REVIEW_NOT_EDITABLE");
  await db.review.update({
    where: { id: reviewId },
    data: { rating: input.rating, title: input.title, body: input.body, images: input.images.filter(isOwnMediaUrl) },
  });
  await recalcProductRating(review.productId);
}

export async function reportReview(userId: string, reviewId: string, reason: string) {
  const review = await db.review.findUnique({ where: { id: reviewId }, select: { id: true, userId: true } });
  if (!review) throw new AppError("NOT_FOUND");
  if (review.userId === userId) throw new AppError("BAD_REQUEST");
  await db.reviewReport.upsert({
    where: { reviewId_reporterId: { reviewId, reporterId: userId } },
    update: {},
    create: { reviewId, reporterId: userId, reason },
  });
  // Auto-hide pending moderation once several distinct users report it (reversible).
  const reports = await db.reviewReport.count({ where: { reviewId, status: "OPEN" } });
  if (reports >= 3) await db.review.update({ where: { id: reviewId }, data: { status: "PENDING" } });
}

export async function listUserReviews(userId: string) {
  return db.review.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { title: true, slug: true, images: { take: 1, select: { url: true, alt: true } } } } },
  });
}

/** Review images must come from our own upload pipeline. */
function isOwnMediaUrl(url: string) {
  return url.startsWith("/api/v1/media/") || (!!process.env.NEXT_PUBLIC_CDN_URL && url.startsWith(process.env.NEXT_PUBLIC_CDN_URL));
}

// ── Questions & answers ─────────────────────────────────────────────────────

export async function askQuestion(userId: string, productId: string, question: string) {
  const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { id: true, seller: { select: { userId: true } } } });
  if (!product) throw new AppError("NOT_FOUND");
  const q = await db.productQuestion.create({ data: { productId, userId, question } });
  await notify(product.seller.userId, { type: "SELLER_UPDATE", key: "newQuestion", href: "/seller/questions" });
  return q;
}

export async function answerQuestion(sellerId: string, actorId: string, questionId: string, answer: string) {
  const q = await db.productQuestion.findFirst({ where: { id: questionId, product: { sellerId } }, include: { product: { select: { slug: true, title: true } } } });
  if (!q) throw new AppError("NOT_FOUND");
  await db.productQuestion.update({ where: { id: q.id }, data: { answer, answeredAt: new Date(), status: "ANSWERED" } });
  await notify(q.userId, { type: "SELLER_UPDATE", key: "questionAnswered", vars: { title: q.product.title.slice(0, 60) }, href: `/p/${q.product.slug}#questions` });
  await audit("seller.question_answered", { type: "ProductQuestion", id: q.id }, { actorId });
}
