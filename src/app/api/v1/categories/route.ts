import { api } from "@/server/http/api";
import { getCategoryTree } from "@/server/services/catalog";
import { getPreferences } from "@/i18n/server";

export const GET = api({}, async () => {
  const { locale } = await getPreferences();
  return getCategoryTree(locale);
});
