"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

export function ProductGallery({ images, title }: { images: { url: string; alt: string }[]; title: string }) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const select = (i: number) => {
    setActive(i);
    track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" });
  };

  if (!images.length) return <div className="aspect-square rounded-3xl bg-surface-sunken" />;

  return (
    <div className="flex min-w-0 flex-col-reverse gap-3 md:flex-row">
      <div className="scrollbar-none flex gap-2 overflow-x-auto md:max-h-[560px] md:flex-col md:overflow-y-auto" role="tablist" aria-label={t("product.gallery")}>
        {images.map((img, i) => (
          <button
            key={img.url + i}
            role="tab"
            aria-selected={i === active}
            aria-label={`${t("product.image")} ${i + 1}`}
            onClick={() => select(i)}
            className={cn("relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-surface-sunken transition", i === active ? "border-brand-600" : "border-transparent opacity-70 hover:opacity-100")}
          >
            <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
          </button>
        ))}
      </div>
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== active) setActive(i);
        }}
        className="scrollbar-none relative flex aspect-square min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto rounded-3xl bg-surface-sunken"
      >
        {images.map((img, i) => (
          <div key={img.url + i} className="relative h-full w-full shrink-0 snap-center">
            <Image src={img.url} alt={img.alt || title} fill priority={i === 0} sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
          </div>
        ))}
        <span className="absolute bottom-3 right-3 rounded-full bg-ink-900/70 px-2.5 py-1 text-xs font-medium text-white md:hidden">
          {active + 1}/{images.length}
        </span>
      </div>
    </div>
  );
}
