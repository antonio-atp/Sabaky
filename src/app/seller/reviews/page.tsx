import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireSellerPage } from "@/server/auth/seller-page";
import { listSellerReviews } from "@/server/services/seller";
import { displayName } from "@/server/services/catalog";
import { PageHeader } from "@/components/dashboard/data-table";
import { ReplyForm } from "@/components/seller/reply-form";
import { EmptyState, Rating } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("seller.nav.reviews"), robots: { index: false } };
}

export default async function SellerReviewsPage() {
  const { seller } = await requireSellerPage("/seller/reviews");
  const { t, date } = await getI18n();
  const reviews = await listSellerReviews(seller.id);
  return (
    <div>
      <PageHeader title={t("seller.nav.reviews")} subtitle={t("seller.reviewsHint", { rating: seller.ratingAvg.toFixed(1), count: seller.ratingCount })} />
      {reviews.length ? (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="card p-5 text-sm">
              <Link href={`/p/${r.product.slug}`} className="line-clamp-1 text-xs font-medium text-fg-muted hover:text-brand-700">
                {r.product.title}
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Rating value={r.rating} />
                <span className="text-xs text-fg-subtle">
                  {displayName(r.user.name)} · {date(r.createdAt)}
                </span>
                {r.isVerifiedPurchase && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {t("reviews.verifiedPurchase")}
                  </span>
                )}
              </div>
              {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
              <p className="mt-1 text-fg-muted">{r.body}</p>
              {r.sellerReply ? (
                <p className="mt-3 rounded-lg bg-surface-muted p-3">
                  <span className="block text-xs font-semibold text-fg-muted">{t("reviews.sellerReply")}</span>
                  {r.sellerReply}
                </p>
              ) : (
                <ReplyForm endpoint={`/seller/reviews/${r.id}`} field="reply" placeholder={t("seller.replyPlaceholder")} submitLabel={t("seller.publishReply")} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Star className="h-6 w-6" />} title={t("seller.noReviews")} />
      )}
    </div>
  );
}
