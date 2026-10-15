import { api } from "@/server/http/api";
import { AppError } from "@/server/http/errors";
import { getOrderForUser } from "@/server/services/orders";

export const GET = api({ auth: "user" }, async ({ user, params }) => {
  const order = await getOrderForUser(user.id, params.number);
  if (!order) throw new AppError("NOT_FOUND");
  return order;
});
