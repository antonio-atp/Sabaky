/**
 * Supported UI locales. Adding a language = add it here + a messages file in
 * `src/i18n/messages`. Shared with future native apps.
 */
export const LOCALES = ["en", "pt", "es", "fr", "de", "it"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, { native: string; intl: string }> = {
  en: { native: "English", intl: "en-GB" },
  pt: { native: "Português", intl: "pt-PT" },
  es: { native: "Español", intl: "es-ES" },
  fr: { native: "Français", intl: "fr-FR" },
  de: { native: "Deutsch", intl: "de-DE" },
  it: { native: "Italiano", intl: "it-IT" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Pick the best supported locale from an Accept-Language header. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { base: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { base } of ranked) if (isLocale(base)) return base;
  return DEFAULT_LOCALE;
}
