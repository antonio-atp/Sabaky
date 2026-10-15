import type { Metadata } from "next";
import Link from "next/link";
import { Flag } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { listReviewsForModeration } from "@/server/services/admin";
import { PageHeader } from "@/components/dashboard/data-table";
import { ActionButton } from "@/components/admin/action-button";
import { Badge, EmptyState, Rating } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.nav.reviews"), robots: { index: false } };
}

export default async function AdminReviewsPage() {
  const { t, date } = await getI18n();
  const reviews = await listReviewsForModeration();
  return (
    <div>
      <PageHeader title={t("admin.nav.reviews")} subtitle={t("admin.reviewsHint")} />
      {reviews.length ? (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="card p-5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/p/${r.product.slug}`} className="line-clamp-1 flex-1 text-xs font-medium text-fg-muted hover:text-brand-700">
                  {r.product.title}
                </Link>
                <Badge tone={r.status === "PUBLISHED" ? "success" : "warning"}>{t(`reviewStatus.${r.status}`)}</Badge>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Rating value={r.rating} />
                <span className="text-xs text-fg-subtle">
                  {r.user.name} ({r.user.email}) · {date(r.createdAt)}
                </span>
              </div>
              {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
              <p className="mt-1 text-fg-muted">{r.body}</p>
              {r.reports.length > 0 && (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-berry-700">
                  <Flag className="h-3.5 w-3.5" aria-hidden />
                  {r.reports.map((rep, i) => (
                    <Badge key={i} tone="danger">
                      {t(`reportReasons.${rep.reason}`)}
                    </Badge>
                  ))}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton endpoint={`/admin/reviews/${r.id}`} body={{ action: "publish" }} label={t("admin.keepPublished")} variant="primary" />
                <ActionButton endpoint={`/admin/reviews/${r.id}`} body={{ action: "hide" }} label={t("admin.hide")} />
                <ActionButton endpoint={`/admin/reviews/${r.id}`} body={{ action: "remove" }} label={t("admin.remove")} variant="danger" confirmText={t("admin.confirmRemove")} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Flag className="h-6 w-6" />} title={t("admin.moderationClear")} />
      )}
    </div>
  );
}
