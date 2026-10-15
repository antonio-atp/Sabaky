import { BASE_CURRENCY, CURRENCIES, type CurrencyCode } from "./config/currencies";

/** Money is always handled as integer minor units to avoid float drift. */
export type Minor = number;

export function convertFromBase(amount: Minor, currency: CurrencyCode): Minor {
  if (currency === BASE_CURRENCY) return amount;
  return Math.round(amount * CURRENCIES[currency].rate);
}

const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: Minor, currency: CurrencyCode = BASE_CURRENCY, intlLocale = "en-GB"): string {
  const key = `${intlLocale}|${currency}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(intlLocale, { style: "currency", currency });
    formatterCache.set(key, fmt);
  }
  const decimals = CURRENCIES[currency].decimals;
  return fmt.format(amount / 10 ** decimals);
}

/** Percentage (0–100) saved between compare-at and sale price. */
export function discountPercent(price: Minor, compareAt: Minor | null | undefined): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** Apply basis points (1/100 of a percent) with banker-safe rounding. */
export function applyBps(amount: Minor, bps: number): Minor {
  return Math.round((amount * bps) / 10_000);
}

/** VAT contained in a VAT-inclusive gross amount. */
export function vatFromGross(gross: Minor, vatBps: number): Minor {
  if (vatBps <= 0) return 0;
  return Math.round(gross - gross / (1 + vatBps / 10_000));
}

/** Parse "12.34" / "12,34" user input into minor units. Returns null if invalid. */
export function parseMajorToMinor(input: string): Minor | null {
  const normalised = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(normalised)) return null;
  return Math.round(Number(normalised) * 100);
}
