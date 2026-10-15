import type en from "./messages/en";
import { LOCALE_LABELS, type Locale } from "@/shared/config/locales";

/**
 * Framework-agnostic translation core (usable by server, client, emails and —
 * once extracted to a package — native apps).
 *
 * Message syntax:
 *   "Hello {name}"                  → interpolation
 *   "# item|# items"                → plural (one|other), `#` = count
 */
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Messages = Widen<typeof en>;

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = { [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>> }[keyof T];
export type MessageKey = Paths<Messages> & string;

export type TranslateVars = Record<string, string | number>;
export type Translator = (key: MessageKey | (string & {}), vars?: TranslateVars) => string;

function lookup(messages: unknown, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

export function createTranslator(locale: Locale, messages: Messages, fallback?: Messages): Translator {
  const plural = new Intl.PluralRules(LOCALE_LABELS[locale].intl);
  return (key, vars) => {
    let msg = lookup(messages, key) ?? (fallback ? lookup(fallback, key) : undefined);
    if (msg === undefined) return key; // visible, greppable, never crashes
    if (vars && typeof vars.count === "number" && msg.includes("|")) {
      const [one, other] = msg.split("|");
      msg = (plural.select(vars.count) === "one" ? one : other).replaceAll("#", String(vars.count));
    }
    if (vars) msg = msg.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
    return msg;
  };
}
