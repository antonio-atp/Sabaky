"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, MapPin } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { LOCALES, LOCALE_LABELS } from "@/shared/config/locales";
import { CURRENCY_CODES, CURRENCIES } from "@/shared/config/currencies";
import { COUNTRY_CODES, COUNTRIES } from "@/shared/config/countries";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Delivery country, language and currency selector (persisted in preference cookies). */
export function PreferencesMenu({ variant = "bar" }: { variant?: "bar" | "footer" }) {
  const { t, locale, currency, country } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ locale: locale as string, currency: currency as string, country: country as string });
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api("/preferences", { body: draft });
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setDraft({ locale, currency, country });
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-3 rounded-md text-xs font-medium",
          variant === "bar" ? "text-white/85 hover:text-white" : "border border-line-strong px-3 py-2 text-sm text-fg hover:bg-surface-muted",
        )}
      >
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {t("prefs.deliverTo")} {country}
        </span>
        <span className="flex items-center gap-1">
          <Globe className="h-3.5 w-3.5" aria-hidden />
          {locale.toUpperCase()} · {currency}
        </span>
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 w-72 animate-fade-in space-y-3 rounded-2xl border border-line bg-surface p-4 text-fg shadow-[var(--shadow-pop)]",
            variant === "bar" ? "right-0 top-full mt-2" : "bottom-full left-0 mb-2",
          )}
        >
          <label className="block space-y-1 text-sm font-medium">
            <span>{t("prefs.country")}</span>
            <Select value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })}>
              {COUNTRY_CODES.map((c) => (
                <option key={c} value={c}>
                  {COUNTRIES[c].name}
                </option>
              ))}
            </Select>
          </label>
          <label className="block space-y-1 text-sm font-medium">
            <span>{t("prefs.language")}</span>
            <Select value={draft.locale} onChange={(e) => setDraft({ ...draft, locale: e.target.value })}>
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {LOCALE_LABELS[l].native}
                </option>
              ))}
            </Select>
          </label>
          <label className="block space-y-1 text-sm font-medium">
            <span>{t("prefs.currency")}</span>
            <Select value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
              {CURRENCY_CODES.map((c) => (
                <option key={c} value={c}>
                  {c} ({CURRENCIES[c].symbol})
                </option>
              ))}
            </Select>
          </label>
          <p className="text-xs text-fg-subtle">{t("prefs.currencyNote")}</p>
          <Button className="w-full" onClick={save} loading={saving}>
            {t("common.save")}
          </Button>
        </div>
      )}
    </div>
  );
}
