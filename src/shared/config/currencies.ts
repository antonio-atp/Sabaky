/**
 * Display currencies. The platform settles in BASE_CURRENCY; other currencies
 * are presentment-only. In production `rate` is refreshed by the FX job
 * (see server/services/fx) — these are safe fallbacks.
 */
export const BASE_CURRENCY = "EUR" as const;

export const CURRENCIES = {
  EUR: { symbol: "€", rate: 1, decimals: 2 },
  USD: { symbol: "$", rate: 1.08, decimals: 2 },
  GBP: { symbol: "£", rate: 0.85, decimals: 2 },
  CHF: { symbol: "CHF", rate: 0.95, decimals: 2 },
  BRL: { symbol: "R$", rate: 5.9, decimals: 2 },
  PLN: { symbol: "zł", rate: 4.3, decimals: 2 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export function isCurrency(value: unknown): value is CurrencyCode {
  return typeof value === "string" && value in CURRENCIES;
}
