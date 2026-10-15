import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getCurrentUser } from "./auth/session";
import { cartCount } from "./services/cart";
import { wishlistProductIds } from "./services/wishlist";
import { unreadCount } from "./services/notifications";
import { COOKIE } from "@/lib/cookies";

/** Per-request storefront context (header badges, auth state). */
export const getShopContext = cache(async () => {
  const user = await getCurrentUser();
  const guestToken = (await cookies()).get(COOKIE.cart)?.value ?? null;
  const [count, wishlist, unread] = await Promise.all([
    cartCount({ userId: user?.id ?? null, guestToken }),
    user ? wishlistProductIds(user.id) : Promise.resolve([] as string[]),
    user ? unreadCount(user.id) : Promise.resolve(0),
  ]);
  return {
    user: user
      ? { id: user.id, name: user.name, email: user.email, roles: user.roles, emailVerified: user.emailVerified, isSeller: !!user.sellerId }
      : null,
    cartCount: count,
    wishlistIds: wishlist,
    unreadNotifications: unread,
  };
});

export type ShopContext = Awaited<ReturnType<typeof getShopContext>>;

export async function cartOwner() {
  const user = await getCurrentUser();
  return { userId: user?.id ?? null, guestToken: (await cookies()).get(COOKIE.cart)?.value ?? null };
}
