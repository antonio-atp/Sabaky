/**
 * Verifies that every static translation key referenced in the source exists
 * in every locale dictionary. Run: npx tsx scripts/check-i18n.ts
 * (Dynamic keys like `orderStatus.${status}` are covered by the typed
 * dictionaries: every locale must match the English shape.)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import en from "../src/i18n/messages/en";
import pt from "../src/i18n/messages/pt";
import es from "../src/i18n/messages/es";
import fr from "../src/i18n/messages/fr";
import de from "../src/i18n/messages/de";
import it from "../src/i18n/messages/it";

const dictionaries = { en, pt, es, fr, de, it } as Record<string, unknown>;
const ROOT = path.resolve(__dirname, "../src");
const IGNORE = new Set(["product.archived", "product.created", "product.updated", "wishlist.priceDrop"]); // audit/job names, not UI keys

function walk(dir: string, out: string[] = []) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f !== "generated" && f !== "messages") walk(p, out);
    } else if (/\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}

function has(obj: unknown, key: string) {
  let node = obj;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in (node as object)) node = (node as Record<string, unknown>)[part];
    else return false;
  }
  return typeof node === "string";
}

const keys = new Set<string>();
const pattern = /\bt\(\s*"([a-zA-Z0-9_.]+)"|"((?:errors|validation|cart|wishlist|reviews|questions|orders|common|settings|product)\.[a-zA-Z0-9_.]+)"/g;
for (const file of walk(ROOT)) {
  for (const m of readFileSync(file, "utf8").matchAll(pattern)) {
    const key = m[1] ?? m[2];
    if (key && !IGNORE.has(key)) keys.add(key);
  }
}

let missing = 0;
for (const key of [...keys].sort()) {
  for (const [locale, dict] of Object.entries(dictionaries)) {
    if (!has(dict, key)) {
      console.log(`✘ ${locale}: ${key}`);
      missing++;
    }
  }
}
console.log(missing ? `\n${missing} missing translation(s)` : `✔ ${keys.size} keys present in all ${Object.keys(dictionaries).length} locales`);
process.exit(missing ? 1 : 0);
