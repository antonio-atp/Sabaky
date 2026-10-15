import { api } from "@/server/http/api";
import { cartCount } from "@/server/services/cart";
import { cartOwner } from "@/server/context";

export const GET = api({}, async () => ({ count: await cartCount(await cartOwner()) }));
