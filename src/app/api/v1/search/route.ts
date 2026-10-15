import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { searchParamsSchema } from "@/shared/validation";
import { searchEngine } from "@/server/services/search";
import { getCategoryBySlug } from "@/server/services/catalog";
import { getPreferences } from "@/i18n/server";
import { trackEvent } from "@/server/services/recommendations";

/** Product search / listing (used by native apps; the web page renders server-side). */
export const GET = api({ query: searchParamsSchema, rateLimit: RATE_LIMITS.search }, async ({ query, user }) => {
  const { locale } = await getPreferences();
  const category = query.category ? await getCategoryBySlug(query.category, locale) : null;
  if (query.q) await trackEvent({ userId: user?.id ?? null, type: "SEARCH", query: query.q });
  return searchEngine.search({ ...query, categoryIds: category?.ids });
});
