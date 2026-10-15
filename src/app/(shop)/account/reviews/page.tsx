import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { listUserReviews } from "@/server/services/reviews";
import { Badge, EmptyState, Rating } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("account.nav.reviews"), robots: { index: false } };
}

export default async function MyReviewsPage() {
  const user = await requireUser("/account/reviews");
  const { t, date } = await getI18n();
  const reviews = await listUserReviews(user.id);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">{t("account.nav.reviews")}</h1>
      {reviews.length ? (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="card flex gap-4 p-5">
              <Link href={`/p/${r.product.slug}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-sunken">
                {r.product.images[0] && <Image src={r.product.images[0].url} alt="" fill sizes="64px" className="object-cover" />}
              </Link>
              <div className="min-w-0 flex-1 text-sm">
                <Link href={`/p/${r.product.slug}`} className="line-clamp-1 font-medium hover:text-brand-700">
                  {r.product.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Rating value={r.rating} />
                  <span className="text-xs text-fg-subtle">{date(r.createdAt)}</span>
                  {r.status !== "PUBLISHED" && <Badge tone="warning">{t(`reviewStatus.${r.status}`)}</Badge>}
                </div>
                {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                <p className="mt-1 line-clamp-3 text-fg-muted">{r.body}</p>
                {r.sellerReply && <p className="mt-2 rounded-lg bg-surface-muted p-2 text-xs">{r.sellerReply}</p>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Star className="h-6 w-6" />} title={t("reviews.youHaveNone")} description={t("reviews.youHaveNoneHint")} />
      )}
    </div>
  );
}
