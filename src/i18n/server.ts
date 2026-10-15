import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { COOKIE } from "@/lib/cookies";
import { DEFAULT_LOCALE, LOCALE_LABELS, isLocale, negotiateLocale, type Locale } from "@/shared/config/locales";
import { BASE_CURRENCY, isCurrency, type CurrencyCode } from "@/shared/config/currencies";
import { DEFAULT_COUNTRY, isCountry, type CountryCode } from "@/shared/config/countries";
import { convertFromBase, formatMoney } from "@/shared/money";
import { createTranslator, type Messages } from "./core";
import { loadMessages } from "./load";
import { getCurrentUser } from "@/server/auth/session";

export interface Preferences {
  locale: Locale;
  currency: CurrencyCode;
  country: CountryCode;
}

/** Explicit choice (cookie) > account profile > browser Accept-Language. */
export const getPreferences = cache(async (): Promise<Preferences> => {
  const [jar, h, user] = await Promise.all([cookies(), headers(), getCurrentUser()]);
  const cookieLocale = jar.get(COOKIE.locale)?.value;
  const cookieCurrency = jar.get(COOKIE.currency)?.value;
  const cookieCountry = jar.get(COOKIE.country)?.value;

  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : isLocale(user?.locale)
      ? user.locale
      : negotiateLocale(h.get("accept-language"));
  const currency = isCurrency(cookieCurrency) ? cookieCurrency : isCurrency(user?.currency) ? user.currency : BASE_CURRENCY;
  const country = isCountry(cookieCountry) ? cookieCountry : DEFAULT_COUNTRY;
  return { locale, currency, country };
});

export const getI18n = cache(async () => {
  const prefs = await getPreferences();
  const [messages, fallback] = await Promise.all([
    loadMessages(prefs.locale),
    prefs.locale === DEFAULT_LOCALE ? Promise.resolve(undefined) : loadMessages(DEFAULT_LOCALE),
  ]);
  const intl = LOCALE_LABELS[prefs.locale].intl;
  return {
    ...prefs,
    messages,
    intl,
    t: createTranslator(prefs.locale, messages, fallback),
    /** Format a base-currency (EUR) minor amount in the visitor's currency. */
    price: (minor: number) => formatMoney(convertFromBase(minor, prefs.currency), prefs.currency, intl),
    date: (d: Date | string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) =>
      new Intl.DateTimeFormat(intl, opts).format(new Date(d)),
    number: (n: number) => new Intl.NumberFormat(intl).format(n),
  };
});

/** Translator for a specific user (emails / notifications rendered off-request). */
export async function translatorFor(locale: string | null | undefined) {
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const messages: Messages = await loadMessages(l);
  return createTranslator(l, messages, l === DEFAULT_LOCALE ? undefined : await loadMessages(DEFAULT_LOCALE));
}
