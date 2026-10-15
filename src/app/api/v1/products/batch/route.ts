import { z } from "zod";
import { api } from "@/server/http/api";
import { cardsByIds } from "@/server/services/catalog";

const query = z.object({
  ids: z
    .string()
    .max(1200)
    .transform((s) => s.split(",").filter((id) => /^[a-z0-9]{1,40}$/i.test(id)).slice(0, 24)),
});

export const GET = api({ query }, async ({ query }) => cardsByIds(query.ids));
