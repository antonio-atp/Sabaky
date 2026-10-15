import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireSellerPage } from "@/server/auth/seller-page";
import { listSellerQuestions } from "@/server/services/seller";
import { PageHeader } from "@/components/dashboard/data-table";
import { ReplyForm } from "@/components/seller/reply-form";
import { Badge, EmptyState } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("seller.nav.questions"), robots: { index: false } };
}

export default async function SellerQuestionsPage() {
  const { seller } = await requireSellerPage("/seller/questions");
  const { t, date } = await getI18n();
  const questions = await listSellerQuestions(seller.id);
  return (
    <div>
      <PageHeader title={t("seller.nav.questions")} subtitle={t("seller.questionsHint")} />
      {questions.length ? (
        <ul className="space-y-3">
          {questions.map((q) => (
            <li key={q.id} className="card p-5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/p/${q.product.slug}`} className="line-clamp-1 flex-1 text-xs font-medium text-fg-muted hover:text-brand-700">
                  {q.product.title}
                </Link>
                <Badge tone={q.status === "PENDING" ? "warning" : "success"}>{t(`questionStatus.${q.status}`)}</Badge>
                <span className="text-xs text-fg-subtle">{date(q.createdAt)}</span>
              </div>
              <p className="mt-2 font-semibold">{q.question}</p>
              {q.answer ? (
                <p className="mt-2 rounded-lg bg-surface-muted p-3 text-fg-muted">{q.answer}</p>
              ) : (
                <ReplyForm endpoint={`/seller/questions/${q.id}`} field="answer" placeholder={t("seller.answerPlaceholder")} submitLabel={t("seller.publishAnswer")} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<MessageCircleQuestion className="h-6 w-6" />} title={t("seller.noQuestions")} />
      )}
    </div>
  );
}
