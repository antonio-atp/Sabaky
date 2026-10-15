import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Store } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/session";
import { categoryName, getProductBySlug, getProductReviews } from "@/server/services/catalog";
import { recommender } from "@/server/services/recommendations";
import { reviewEligibility } from "@/server/services/reviews";
import { ProductGallery } from "@/components/product/gallery";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { ReviewList } from "@/components/product/reviews";
import { ReviewForm } from "@/components/product/review-form";
import { QuestionsSection } from "@/components/product/questions";
import { ProductRail } from "@/components/product/product-grid";
import { RecentlyViewed, TrackView } from "@/components/home/recently-viewed";
import { Breadcrumbs } from "@/components/ui/pagination";
import { Badge, Rating } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { initials } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return {};
  return {
    title: product.title,
    description: product.description.slice(0, 160),
    openGraph: { title: product.title, images: product.images[0] ? [{ url: product.images[0].url }] : [] },
    alternates: { canonical: `/p/${product.slug}` },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const { t, date, number, locale } = await getI18n();
  const user = await getCurrentUser();
  const [reviews, similar, together, eligibility] = await Promise.all([
    getProductReviews(product.id),
    recommender.similar(product.id, product.categoryId, 10),
    recommender.boughtTogether(product.id, 5),
    user ? reviewEligibility(user.id, product.id) : Promise.resolve(null),
  ]);
  const totalRatings = product.ratingBreakdown.reduce((s, r) => s + r.count, 0);

  // Structured data for search engines (rich results). JSON is escaped for script context.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images.map((i) => i.url),
    description: product.description.slice(0, 500),
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    aggregateRating: product.ratingCount ? { "@type": "AggregateRating", ratingValue: product.ratingAvg.toFixed(1), reviewCount: product.ratingCount } : undefined,
    offers: { "@type": "Offer", priceCurrency: "EUR", price: (product.variants[0]?.price ?? product.price) / 100, availability: product.totalStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  return (
    <div className="container-page space-y-10 py-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <TrackView productId={product.id} />

      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: t("nav.home"), href: "/" },
            ...(product.category.parent ? [{ label: categoryName(product.category.parent, locale), href: `/c/${product.category.parent.slug}` }] : []),
            { label: categoryName(product.category, locale), href: `/c/${product.category.slug}` },
            { label: product.title.slice(0, 40) },
          ]}
        />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:gap-12">
          <ProductGallery images={product.images.map((i) => ({ url: i.url, alt: i.alt }))} title={product.title} />
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {product.brand && <Badge tone="brand">{product.brand.name}</Badge>}
                {product.condition !== "NEW" && <Badge tone="warning">{t(`product.condition.${product.condition}`)}</Badge>}
              </div>
              <h1 className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">{product.title}</h1>
              <a href="#reviews" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
                {product.ratingCount > 0 ? (
                  <>
                    <Rating value={product.ratingAvg} size="md" />
                    <span className="font-semibold text-fg tabular">{product.ratingAvg.toFixed(1)}</span>
                    <span>· {t("reviews.count", { count: product.ratingCount })}</span>
                  </>
                ) : (
                  <span>{t("reviews.noneShort")}</span>
                )}
                {product.salesCount > 0 && <span>· {t("product.soldLong", { count: number(product.salesCount) })}</span>}
              </a>
            </div>
            <PurchasePanel
              productId={product.id}
              variants={product.variants}
              shippingCost={product.shippingCost}
              freeShipping={product.freeShipping}
              freeShippingThreshold={product.seller.freeShippingThreshold}
              deliveryDaysMin={product.deliveryDaysMin}
              deliveryDaysMax={product.deliveryDaysMax + product.seller.handlingDays}
              deal={product.deal}
            />
            <div className="flex items-center gap-3 rounded-2xl border border-line p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-900 text-sm font-bold text-white">{initials(product.seller.storeName)}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  {product.seller.storeName} <BadgeCheck className="h-4 w-4 text-brand-600" aria-label={t("seller.verified")} />
                </p>
                <p className="text-xs text-fg-muted">
                  ★ {product.seller.ratingAvg.toFixed(1)} · {t("seller.productCount", { count: product.seller._count.products })} · {t("seller.since", { date: date(product.seller.createdAt, { year: "numeric", month: "short" }) })}
                </p>
              </div>
              <ButtonLink href={`/store/${product.seller.slug}`} variant="outline" size="sm">
                <Store className="h-4 w-4" /> {t("seller.visit")}
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>

      {together.length > 0 && <ProductRail title={t("product.boughtTogether")} products={together} />}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold">{t("product.description")}</h2>
          {product.highlights.length > 0 && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {product.highlights.map((h) => (
                <li key={h} className="flex gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                  {h}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-fg-muted">{product.description}</p>
        </section>
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold">{t("product.specifications")}</h2>
          <dl className="mt-4 divide-y divide-line text-sm">
            {[
              ...(product.brand && !product.specifications.some((sp) => sp.label.toLowerCase() === "brand") ? [{ label: t("product.brand"), value: product.brand.name }] : []),
              { label: t("product.conditionLabel"), value: t(`product.condition.${product.condition}`) },
              ...product.specifications,
            ].map((s, i) => (
              <div key={`${s.label}-${i}`} className="grid grid-cols-2 gap-4 py-2.5">
                <dt className="text-fg-muted">{s.label}</dt>
                <dd className="font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section id="reviews" className="card scroll-mt-40 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t("reviews.title")}</h2>
          {eligibility?.canReview && <ReviewForm productId={product.id} productTitle={product.title} />}
        </div>
        <div className="mt-5 grid gap-8 md:grid-cols-[240px_1fr]">
          <div>
            <p className="text-4xl font-extrabold tabular">{product.ratingAvg.toFixed(1)}</p>
            <Rating value={product.ratingAvg} size="md" />
            <p className="mt-1 text-xs text-fg-subtle">{t("reviews.count", { count: product.ratingCount })}</p>
            <div className="mt-4 space-y-1.5">
              {product.ratingBreakdown.map((r) => (
                <div key={r.rating} className="flex items-center gap-2 text-xs">
                  <span className="w-3 tabular">{r.rating}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                    <div className="h-full rounded-full bg-sunrise-400" style={{ width: `${totalRatings ? (r.count / totalRatings) * 100 : 0}%` }} />
                  </div>
                  <span className="w-6 text-right text-fg-subtle tabular">{r.count}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-fg-subtle">{t("reviews.policy")}</p>
          </div>
          <ReviewList
            productId={product.id}
            total={reviews.total}
            initial={reviews.items.map((r) => ({
              id: r.id,
              rating: r.rating,
              title: r.title,
              body: r.body,
              isVerifiedPurchase: r.isVerifiedPurchase,
              sellerReply: r.sellerReply,
              createdAt: r.createdAt.toISOString(),
              author: r.author,
            }))}
          />
        </div>
      </section>

      <section id="questions" className="card scroll-mt-40 p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">{t("questions.title")}</h2>
        <QuestionsSection
          productId={product.id}
          questions={product.questions.map((q) => ({ id: q.id, question: q.question, answer: q.answer, answeredAt: q.answeredAt?.toISOString() ?? null }))}
        />
      </section>

      <ProductRail title={t("product.related")} products={similar} action={<Link href={`/c/${product.category.slug}`} className="text-sm font-semibold text-brand-700 hover:underline">{t("common.seeAll")} →</Link>} />
      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}
