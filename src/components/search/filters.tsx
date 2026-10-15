"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { CURRENCIES } from "@/shared/config/currencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Rating } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export interface FilterFacets {
  brands: { name: string; slug: string; count: number }[];
  categories: { slug: string; name: string; count: number }[];
  priceRange: { min: number; max: number };
}

function useFilterUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const update = (mutate: (sp: URLSearchParams) => void) => {
    const sp = new URLSearchParams(params.toString());
    mutate(sp);
    sp.delete("page"); // any filter change resets pagination
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  };
  return { params, update };
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-line py-4 first:pt-0 last:border-0">
      <legend className="mb-2.5 text-sm font-semibold text-fg">{title}</legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

function Toggle({ label, checked, onChange, trailing }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; trailing?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-fg-muted hover:text-fg">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
      <span className="flex-1">{label}</span>
      {trailing}
    </label>
  );
}

function FilterPanel({ facets, showCategories }: { facets: FilterFacets; showCategories: boolean }) {
  const { t, currency } = useI18n();
  const { params, update } = useFilterUrl();
  const rate = CURRENCIES[currency].rate;
  const toDisplay = (minor: string | null) => (minor ? String(Math.round((Number(minor) * rate) / 100)) : "");
  const [min, setMin] = useState(toDisplay(params.get("minPrice")));
  const [max, setMax] = useState(toDisplay(params.get("maxPrice")));
  const brands = params.getAll("brand");

  const setFlag = (key: string) => (on: boolean) => update((sp) => (on ? sp.set(key, "1") : sp.delete(key)));
  const setValue = (key: string, value: string | null) => update((sp) => (value ? sp.set(key, value) : sp.delete(key)));

  return (
    <div>
      {showCategories && facets.categories.length > 0 && (
        <Group title={t("filters.category")}>
          {facets.categories.slice(0, 12).map((c) => (
            <Toggle
              key={c.slug}
              label={c.name}
              checked={params.get("category") === c.slug}
              onChange={(on) => setValue("category", on ? c.slug : null)}
              trailing={<span className="text-xs text-fg-subtle tabular">{c.count}</span>}
            />
          ))}
        </Group>
      )}

      <Group title={t("filters.price")}>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update((sp) => {
              const toMinor = (v: string) => String(Math.round((Number(v) * 100) / rate));
              if (min) sp.set("minPrice", toMinor(min));
              else sp.delete("minPrice");
              if (max) sp.set("maxPrice", toMinor(max));
              else sp.delete("maxPrice");
            });
          }}
        >
          <Input inputMode="numeric" pattern="[0-9]*" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder={t("filters.min")} aria-label={t("filters.min")} className="h-9 min-w-0 px-2" />
          <span className="text-fg-subtle">–</span>
          <Input inputMode="numeric" pattern="[0-9]*" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder={t("filters.max")} aria-label={t("filters.max")} className="h-9 min-w-0 px-2" />
          <Button type="submit" size="sm" variant="secondary" className="h-9 shrink-0 px-2.5">
            {t("filters.go")}
          </Button>
        </form>
      </Group>

      {facets.brands.length > 0 && (
        <Group title={t("filters.brand")}>
          {facets.brands.map((b) => (
            <Toggle
              key={b.slug}
              label={b.name}
              checked={brands.includes(b.slug)}
              onChange={(on) =>
                update((sp) => {
                  const next = on ? [...brands, b.slug] : brands.filter((x) => x !== b.slug);
                  sp.delete("brand");
                  next.forEach((x) => sp.append("brand", x));
                })
              }
              trailing={<span className="text-xs text-fg-subtle tabular">{b.count}</span>}
            />
          ))}
        </Group>
      )}

      <Group title={t("filters.rating")}>
        {[4, 3].map((r) => (
          <Toggle key={r} label={<span className="inline-flex items-center gap-1.5"><Rating value={r} /> {t("filters.andUp")}</span>} checked={params.get("rating") === String(r)} onChange={(on) => setValue("rating", on ? String(r) : null)} />
        ))}
      </Group>

      <Group title={t("filters.deliveryShipping")}>
        <Toggle label={t("filters.freeShipping")} checked={params.get("freeShipping") === "1"} onChange={setFlag("freeShipping")} />
        {[3, 7, 14].map((d) => (
          <Toggle key={d} label={t("filters.deliveryWithin", { days: d })} checked={params.get("maxDays") === String(d)} onChange={(on) => setValue("maxDays", on ? String(d) : null)} />
        ))}
      </Group>

      <Group title={t("filters.availability")}>
        <Toggle label={t("filters.inStock")} checked={params.get("inStock") === "1"} onChange={setFlag("inStock")} />
        <Toggle label={t("filters.onSale")} checked={params.get("onSale") === "1"} onChange={setFlag("onSale")} />
      </Group>

      <Group title={t("filters.condition")}>
        {(["NEW", "REFURBISHED", "USED"] as const).map((c) => (
          <Toggle key={c} label={t(`product.condition.${c}`)} checked={params.get("condition") === c} onChange={(on) => setValue("condition", on ? c : null)} />
        ))}
      </Group>
    </div>
  );
}

/** Desktop sidebar + mobile bottom-sheet with the same filter panel. */
export function SearchFilters({ facets, showCategories = true, mode }: { facets: FilterFacets; showCategories?: boolean; mode: "sidebar" | "button" }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { params } = useFilterUrl();
  const active = ["brand", "minPrice", "maxPrice", "rating", "inStock", "freeShipping", "onSale", "maxDays", "condition"].filter((k) => params.has(k)).length;

  if (mode === "sidebar") {
    return (
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-40 card max-h-[calc(100vh-11rem)] overflow-y-auto p-4">
          <FilterPanel facets={facets} showCategories={showCategories} />
        </div>
      </aside>
    );
  }
  return (
    <>
      <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="h-4 w-4" /> {t("filters.title")}
        {active > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] text-white">{active}</span>}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("filters.title")}>
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setOpen(false)} />
          <div className={cn("absolute inset-x-0 bottom-0 max-h-[85vh] animate-slide-up overflow-y-auto rounded-t-3xl bg-surface p-5 pb-8")}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">{t("filters.title")}</h2>
              <button onClick={() => setOpen(false)} aria-label={t("common.close")} className="rounded-lg p-1 hover:bg-surface-sunken">
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterPanel facets={facets} showCategories={showCategories} />
            <Button className="mt-4 w-full" onClick={() => setOpen(false)}>
              {t("filters.showResults")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export function SortSelect() {
  const { t } = useI18n();
  const { params, update } = useFilterUrl();
  const options = ["relevance", "popular", "price_asc", "price_desc", "rating", "newest", "discount"];
  return (
    <label className="flex items-center gap-2 text-sm text-fg-muted">
      <span className="hidden sm:inline">{t("sort.label")}</span>
      <select
        value={params.get("sort") ?? "relevance"}
        onChange={(e) => update((sp) => (e.target.value === "relevance" ? sp.delete("sort") : sp.set("sort", e.target.value)))}
        className="h-9 rounded-lg border border-line-strong bg-surface px-2.5 text-sm font-medium text-fg"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {t(`sort.${o}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ActiveFilterChips({ labels }: { labels: Record<string, string> }) {
  const { t } = useI18n();
  const { params, update } = useFilterUrl();
  const chips: { key: string; value: string; label: string }[] = [];
  for (const [key, value] of params.entries()) {
    if (["q", "sort", "page"].includes(key)) continue;
    chips.push({ key, value, label: labels[`${key}:${value}`] ?? `${t(`filters.chip.${key}`)}: ${value}` });
  }
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={`${c.key}-${c.value}`}
          onClick={() =>
            update((sp) => {
              const rest = sp.getAll(c.key).filter((v) => v !== c.value);
              sp.delete(c.key);
              rest.forEach((v) => sp.append(c.key, v));
            })
          }
          className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 hover:bg-brand-100"
        >
          {c.label}
          <X className="h-3 w-3" aria-hidden />
          <span className="sr-only">{t("filters.remove")}</span>
        </button>
      ))}
      <button onClick={() => update((sp) => [...sp.keys()].filter((k) => !["q", "sort"].includes(k)).forEach((k) => sp.delete(k)))} className="text-xs font-semibold text-fg-muted hover:text-fg">
        {t("filters.clearAll")}
      </button>
    </div>
  );
}
