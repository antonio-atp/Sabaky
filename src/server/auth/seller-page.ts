import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "./guards";
import { getSellerForUser } from "../services/seller";

/** Page guard for Seller Center routes: signed-in user with a seller account. */
export async function requireSellerPage(path: string) {
  const user = await requireUser(path);
  const seller = await getSellerForUser(user.id);
  if (!seller) redirect("/seller/register");
  return { user, seller };
}
