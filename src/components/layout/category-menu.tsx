"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Menu } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { CategoryDTO } from "@/shared/types";
import { CategoryIcon } from "@/components/product/category-icon";
import { cn } from "@/lib/utils";

/** Desktop mega-menu: root categories on the left, children on the right. */
export function CategoryMenu({ categories }: { categories: CategoryDTO[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const current = categories[active];

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        aria-expanded={open}
        className="flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-ink-900 px-3.5 text-sm font-semibold text-white hover:bg-ink-800"
      >
        <Menu className="h-4 w-4" aria-hidden />
        {t("nav.allCategories")}
      </button>
      {open && categories.length > 0 && (
        <div className="absolute left-0 top-full z-50 pt-2">
          <div className="flex w-[760px] animate-fade-in overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]">
            <ul className="w-64 shrink-0 border-r border-line bg-surface-muted py-2">
              {categories.map((c, i) => (
                <li key={c.id}>
                  <Link
                    href={`/c/${c.slug}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setOpen(false)}
                    className={cn("flex items-center gap-3 px-4 py-2 text-sm text-fg", i === active && "bg-surface font-semibold text-brand-700")}
                  >
                    <CategoryIcon name={c.icon} className="h-4 w-4" />
                    <span className="flex-1">{c.name}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-fg-subtle" />
                  </Link>
                </li>
              ))}
            </ul>
            {current && (
              <div className="flex-1 p-6">
                <Link href={`/c/${current.slug}`} onClick={() => setOpen(false)} className="text-base font-bold text-fg hover:text-brand-700">
                  {current.name} →
                </Link>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {current.children?.map((child) => (
                    <Link
                      key={child.id}
                      href={`/c/${child.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl p-2 text-sm text-fg-muted hover:bg-surface-muted hover:text-fg"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                        <CategoryIcon name={child.icon ?? current.icon} className="h-4 w-4" />
                      </span>
                      {child.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
