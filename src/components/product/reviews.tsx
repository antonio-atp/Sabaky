"use client";

import { useState } from "react";
import { BadgeCheck, Flag, Store } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Rating } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  isVerifiedPurchase: boolean;
  sellerReply: string | null;
  createdAt: string;
  author: string;
}

/** Review list with "load more" (server-paginated) and abuse reporting. */
export function ReviewList({ productId, initial, total }: { productId: string; initial: ReviewItem[]; total: number }) {
  const { t, date } = useI18n();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    setLoading(true);
    try {
      const res = await api<{ items: ReviewItem[] }>(`/products/${productId}/reviews?page=${page + 1}`);
      setItems((all) => [...all, ...res.items]);
      setPage((p) => p + 1);
    } finally {
      setLoading(false);
    }
  }

  async function report(id: string) {
    try {
      await api(`/reviews/${id}`, { body: { reason: "offensive" } });
      toast("success", "reviews.reported");
    } catch {
      toast("error", "errors.LOGIN_REQUIRED");
    }
  }

  if (!items.length) return <p className="text-sm text-fg-muted">{t("reviews.none")}</p>;

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {items.map((r) => (
          <li key={r.id} className="py-4 first:pt-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Rating value={r.rating} />
              {r.title && <p className="text-sm font-semibold">{r.title}</p>}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
              <span>{r.author}</span>·<span>{date(r.createdAt)}</span>
              {r.isVerifiedPurchase && (
                <span className="inline-flex items-center gap-1 font-medium text-brand-700">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {t("reviews.verifiedPurchase")}
                </span>
              )}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-fg">{r.body}</p>
            {r.sellerReply && (
              <div className="mt-3 rounded-xl bg-surface-muted p-3 text-sm">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-fg-muted">
                  <Store className="h-3.5 w-3.5" aria-hidden /> {t("reviews.sellerReply")}
                </p>
                {r.sellerReply}
              </div>
            )}
            <button onClick={() => report(r.id)} className="mt-2 inline-flex items-center gap-1 text-xs text-fg-subtle hover:text-berry-600">
              <Flag className="h-3 w-3" aria-hidden /> {t("reviews.report")}
            </button>
          </li>
        ))}
      </ul>
      {items.length < total && (
        <Button variant="outline" onClick={loadMore} loading={loading}>
          {t("reviews.loadMore")}
        </Button>
      )}
    </div>
  );
}
