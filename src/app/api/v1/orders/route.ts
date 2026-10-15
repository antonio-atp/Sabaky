import { z } from "zod";
import { api } from "@/server/http/api";
import { listOrders } from "@/server/services/orders";

export const GET = api({ auth: "user", query: z.object({ page: z.coerce.number().int().min(1).max(500).default(1) }) }, async ({ user, query }) =>
  listOrders(user.id, query.page),
);
