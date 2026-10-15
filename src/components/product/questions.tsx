"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useShop } from "@/components/providers/shop-provider";
import { api, ApiClientError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";

export function QuestionsSection({ productId, questions }: { productId: string; questions: { id: string; question: string; answer: string | null; answeredAt: string | null }[] }) {
  const { t, date } = useI18n();
  const { user } = useShop();
  const toast = useToast();
  const pathname = usePathname();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/products/${productId}/questions`, { body: { question: text } });
      setText("");
      toast("success", "questions.sent");
    } catch (err) {
      toast("error", err instanceof ApiClientError ? err.message : "errors.INTERNAL");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {questions.length ? (
        <ul className="space-y-4">
          {questions.map((q) => (
            <li key={q.id} className="rounded-2xl bg-surface-muted p-4 text-sm">
              <p className="font-semibold">
                <span className="mr-2 text-brand-700">Q</span>
                {q.question}
              </p>
              {q.answer && (
                <p className="mt-2 text-fg-muted">
                  <span className="mr-2 font-semibold text-sunrise-600">A</span>
                  {q.answer}
                  {q.answeredAt && <span className="ml-2 text-xs text-fg-subtle">· {date(q.answeredAt)}</span>}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <MessageCircleQuestion className="h-4 w-4" aria-hidden /> {t("questions.none")}
        </p>
      )}
      {user ? (
        <form onSubmit={ask} className="space-y-2">
          <label htmlFor="q-text" className="text-sm font-medium">
            {t("questions.ask")}
          </label>
          <Textarea id="q-text" value={text} onChange={(e) => setText(e.target.value)} minLength={5} maxLength={500} required rows={3} placeholder={t("questions.placeholder")} />
          <Button type="submit" variant="secondary" loading={busy}>
            {t("questions.submit")}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-fg-muted">
          <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="font-semibold text-brand-700 hover:underline">
            {t("nav.signIn")}
          </Link>{" "}
          {t("questions.signInToAsk")}
        </p>
      )}
    </div>
  );
}
