import type { Locale } from "@/shared/config/locales";
import type { Messages } from "./core";

/** Lazy-loaded dictionaries — each request only loads the active locale. */
const loaders: Record<Locale, () => Promise<Messages>> = {
  en: () => import("./messages/en").then((m) => m.default),
  pt: () => import("./messages/pt").then((m) => m.default),
  es: () => import("./messages/es").then((m) => m.default),
  fr: () => import("./messages/fr").then((m) => m.default),
  de: () => import("./messages/de").then((m) => m.default),
  it: () => import("./messages/it").then((m) => m.default),
};

export function loadMessages(locale: Locale): Promise<Messages> {
  return loaders[locale]();
}
