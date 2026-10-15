"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Clock, Search, Tag, X, LayoutGrid } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Suggestions {
  products: { title: string; slug: string }[];
  categories: { name: string; slug: string }[];
  brands: { name: string; slug: string }[];
}

const RECENT_KEY = "sabaky.recentSearches";

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").slice(0, 6);
  } catch {
    return [];
  }
}

export function saveRecentSearch(q: string) {
  try {
    const next = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode) — recent searches are optional */
  }
}

export function SearchBar({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => !wrapper.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced suggestions with request cancellation.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      api<Suggestions>(`/search/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then(setSuggestions)
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const options: { label: string; href: string; kind: "recent" | "product" | "category" | "brand" }[] =
    query.trim().length < 2
      ? recent.map((r) => ({ label: r, href: `/search?q=${encodeURIComponent(r)}`, kind: "recent" as const }))
      : [
          ...(suggestions?.categories ?? []).map((c) => ({ label: c.name, href: `/c/${c.slug}`, kind: "category" as const })),
          ...(suggestions?.brands ?? []).map((b) => ({ label: b.name, href: `/search?brand=${b.slug}`, kind: "brand" as const })),
          ...(suggestions?.products ?? []).map((p) => ({ label: p.title, href: `/p/${p.slug}`, kind: "product" as const })),
        ];

  function submit(q: string) {
    const value = q.trim();
    if (!value) return;
    saveRecentSearch(value);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || !options.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      setOpen(false);
      router.push(options[active].href);
    } else if (e.key === "Escape") setOpen(false);
  }

  const Icon = { recent: Clock, product: Search, category: LayoutGrid, brand: Tag };

  return (
    <div ref={wrapper} className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
        className="flex h-11 items-center rounded-full border-2 border-brand-600 bg-surface pl-4 pr-1 transition-shadow focus-within:shadow-[0_0_0_4px_rgb(22_174_136/0.15)]"
      >
        <Search className="h-4.5 w-4.5 shrink-0 text-fg-subtle" aria-hidden />
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => {
            setRecent(readRecent());
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={t("search.placeholder")}
          aria-label={t("search.label")}
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          maxLength={120}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-fg outline-none placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="mr-1 rounded-full p-1 text-fg-subtle hover:text-fg" aria-label={t("search.clear")}>
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="submit" className="h-8.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
          <span className="hidden sm:inline">{t("search.submit")}</span>
          <Search className="h-4 w-4 sm:hidden" aria-label={t("search.submit")} />
        </button>
      </form>

      {open && options.length > 0 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 animate-fade-in overflow-hidden rounded-2xl border border-line bg-surface py-2 shadow-[var(--shadow-pop)]">
          {query.trim().length < 2 && (
            <div className="flex items-center justify-between px-4 pb-1 pt-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{t("search.recent")}</span>
              <button
                type="button"
                className="text-xs font-medium text-brand-700 hover:underline"
                onClick={() => {
                  try {
                    localStorage.removeItem(RECENT_KEY);
                  } catch {}
                  setRecent([]);
                }}
              >
                {t("search.clearRecent")}
              </button>
            </div>
          )}
          <ul id={listId} role="listbox">
            {options.map((o, i) => {
              const I = Icon[o.kind];
              return (
                <li key={`${o.kind}-${o.href}`} role="option" aria-selected={i === active}>
                  <Link
                    href={o.href}
                    onClick={() => {
                      if (o.kind === "recent") saveRecentSearch(o.label);
                      setOpen(false);
                    }}
                    className={cn("flex items-center gap-3 px-4 py-2 text-sm text-fg hover:bg-surface-muted", i === active && "bg-surface-muted")}
                  >
                    <I className="h-4 w-4 shrink-0 text-fg-subtle" />
                    <span className="truncate">{o.label}</span>
                    {o.kind !== "recent" && o.kind !== "product" && <span className="ml-auto text-xs text-fg-subtle">{t(`search.kind.${o.kind}`)}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
