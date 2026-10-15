/**
 * Shipping destinations + VAT rates (standard rate, B2C, VAT-inclusive pricing).
 * Tax rules live in server/services/tax — this is the reference table.
 */
export const COUNTRIES = {
  PT: { name: "Portugal", vatBps: 2300 },
  ES: { name: "España", vatBps: 2100 },
  FR: { name: "France", vatBps: 2000 },
  DE: { name: "Deutschland", vatBps: 1900 },
  IT: { name: "Italia", vatBps: 2200 },
  NL: { name: "Nederland", vatBps: 2100 },
  BE: { name: "België", vatBps: 2100 },
  IE: { name: "Ireland", vatBps: 2300 },
  AT: { name: "Österreich", vatBps: 2000 },
  PL: { name: "Polska", vatBps: 2300 },
  GB: { name: "United Kingdom", vatBps: 2000 },
  CH: { name: "Schweiz", vatBps: 810 },
  US: { name: "United States", vatBps: 0 },
  BR: { name: "Brasil", vatBps: 0 },
} as const;

export type CountryCode = keyof typeof COUNTRIES;
export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];
export const DEFAULT_COUNTRY: CountryCode = "PT";

export function isCountry(value: unknown): value is CountryCode {
  return typeof value === "string" && value in COUNTRIES;
}
