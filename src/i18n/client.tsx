"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createTranslator, type Messages, type Translator } from "./core";
import { LOCALE_LABELS, type Locale } from "@/shared/config/locales";
import type { CurrencyCode } from "@/shared/config/currencies";
import type { CountryCode } from "@/shared/config/countries";
import { convertFromBase, formatMoney } from "@/shared/money";

interface I18nValue {
  locale: Locale;
  currency: CurrencyCode;
  country: CountryCode;
  intl: string;
  t: Translator;
  price: (minor: number) => string;
  date: (d: Date | string, opts?: Intl.DateTimeFormatOptions) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  currency,
  country,
  messages,
  children,
}: {
  locale: Locale;
  currency: CurrencyCode;
  country: CountryCode;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(() => {
    const intl = LOCALE_LABELS[locale].intl;
    return {
      locale,
      currency,
      country,
      intl,
      t: createTranslator(locale, messages),
      price: (minor) => formatMoney(convertFromBase(minor, currency), currency, intl),
      date: (d, opts = { dateStyle: "medium" }) => new Intl.DateTimeFormat(intl, opts).format(new Date(d)),
    };
  }, [locale, currency, country, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
