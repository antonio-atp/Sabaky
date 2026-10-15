"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  href: string;
  theme: string;
}

const THEMES: Record<string, { bg: string; text: string; cta: string; orb: string }> = {
  brand: { bg: "bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900", text: "text-white", cta: "bg-white text-brand-800 hover:bg-brand-50", orb: "bg-brand-300/30" },
  sunrise: { bg: "bg-gradient-to-br from-sunrise-300 via-sunrise-400 to-sunrise-500", text: "text-ink-950", cta: "bg-ink-900 text-white hover:bg-ink-800", orb: "bg-white/35" },
  ink: { bg: "bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950", text: "text-white", cta: "bg-sunrise-400 text-ink-950 hover:bg-sunrise-300", orb: "bg-brand-500/25" },
  berry: { bg: "bg-gradient-to-br from-berry-500 via-berry-600 to-berry-700", text: "text-white", cta: "bg-white text-berry-700 hover:bg-berry-50", orb: "bg-sunrise-300/30" },
};

/** Accessible banner carousel: pauses on hover/focus, honours reduced motion. */
export function Hero({ banners }: { banners: HeroBanner[] }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || banners.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(id);
  }, [paused, banners.length]);

  if (!banners.length) return null;
  const go = (d: number) => setIndex((i) => (i + d + banners.length) % banners.length);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("home.promotions")}
      className="relative overflow-hidden rounded-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {banners.map((b, i) => {
          const theme = THEMES[b.theme] ?? THEMES.brand;
          return (
            <div
              key={b.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${banners.length}`}
              aria-hidden={i !== index}
              className={cn("relative flex min-h-[220px] w-full shrink-0 items-center overflow-hidden px-6 py-10 sm:min-h-[300px] sm:px-12", theme.bg, theme.text)}
            >
              <div className={cn("absolute -right-16 -top-24 h-80 w-80 rounded-full blur-2xl", theme.orb)} />
              <div className={cn("absolute -bottom-32 right-40 h-72 w-72 rounded-full blur-3xl", theme.orb)} />
              <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 select-none text-[180px] font-extrabold leading-none tracking-tighter opacity-10 lg:block">
                sabaky
              </div>
              <div className="relative max-w-xl">
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">{b.title}</h2>
                {b.subtitle && <p className="mt-3 text-sm opacity-90 sm:text-base">{b.subtitle}</p>}
                <Link href={b.href} tabIndex={i === index ? 0 : -1} className={cn("mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition", theme.cta)}>
                  {b.ctaLabel ?? t("home.shopNow")} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      {banners.length > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label={t("common.previous")} className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-ink-900 shadow hover:bg-white sm:grid">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => go(1)} aria-label={t("common.next")} className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-ink-900 shadow hover:bg-white sm:grid">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-6 flex gap-1.5 sm:left-12">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}`}
                aria-current={i === index}
                className={cn("h-1.5 rounded-full bg-current transition-all", i === index ? "w-6 opacity-100" : "w-1.5 opacity-40", THEMES[banners[index].theme]?.text)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
