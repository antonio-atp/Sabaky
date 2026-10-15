import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";

const DOCS = ["terms", "privacy", "cookies", "seller-terms", "help"] as const;
type Doc = (typeof DOCS)[number];
const KEY: Record<Doc, string> = { terms: "terms", privacy: "privacy", cookies: "cookies", "seller-terms": "sellerTerms", help: "help" };

type Props = { params: Promise<{ doc: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { doc } = await params;
  if (!DOCS.includes(doc as Doc)) return {};
  const { t } = await getI18n();
  return { title: t(`legal.${KEY[doc as Doc]}.title`) };
}

/**
 * Legal & help documents. Content lives in the i18n dictionaries so it is
 * translated alongside the UI; production copy must be reviewed by counsel.
 */
export default async function LegalPage({ params }: Props) {
  const { doc } = await params;
  if (!DOCS.includes(doc as Doc)) notFound();
  const { t, messages } = await getI18n();
  const key = KEY[doc as Doc];
  const doc_ = (messages.legal as unknown as Record<string, { sections?: Record<string, { heading: string; body: string }> }>)[key];
  const sections = Object.values(doc_?.sections ?? {});

  return (
    <article className="container-page max-w-3xl py-8">
      <h1 className="text-3xl font-bold tracking-tight">{t(`legal.${key}.title`)}</h1>
      <p className="mt-2 text-sm text-fg-subtle">{t("legal.updated", { date: "25 Sep 2026" })}</p>
      <p className="mt-6 text-base leading-relaxed text-fg-muted">{t(`legal.${key}.intro`)}</p>
      <div className="mt-8 space-y-6">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-fg-muted">{s.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
