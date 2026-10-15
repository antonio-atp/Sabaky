import { z } from "zod";
import { NextResponse } from "next/server";
import { api } from "@/server/http/api";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { searchEngine } from "@/server/services/search";

export const GET = api({ query: z.object({ q: z.string().trim().max(80).default("") }), rateLimit: RATE_LIMITS.search }, async ({ query }) => {
  const data = await searchEngine.suggest(query.q);
  // Suggestions are public and identical for everyone → short shared cache.
  return NextResponse.json({ data }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
});
