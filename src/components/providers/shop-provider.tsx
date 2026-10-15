"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import type { ShopContext } from "@/server/context";

interface ShopValue {
  user: ShopContext["user"];
  cartCount: number;
  unreadNotifications: number;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  addToCart: (variantId: string, quantity?: number) => Promise<boolean>;
  refreshCartCount: () => Promise<void>;
}

const Ctx = createContext<ShopValue | null>(null);

/** Client-side storefront state: cart badge + wishlist hearts, kept in sync with the API. */
export function ShopProvider({ initial, children }: { initial: ShopContext; children: ReactNode }) {
  const [cartCount, setCartCount] = useState(initial.cartCount);
  const [wishlist, setWishlist] = useState(() => new Set(initial.wishlistIds));
  const toast = useToast();
  const router = useRouter();

  const refreshCartCount = useCallback(async () => {
    try {
      const { count } = await api<{ count: number }>("/cart/count");
      setCartCount(count);
    } catch {
      /* non-critical */
    }
  }, []);

  const addToCart = useCallback(
    async (variantId: string, quantity = 1) => {
      try {
        const res = await api<{ count: number; limited: boolean }>("/cart/items", { body: { variantId, quantity } });
        setCartCount(res.count);
        toast("success", res.limited ? "cart.addedLimited" : "cart.added");
        router.refresh();
        return true;
      } catch (e) {
        toast("error", e instanceof ApiClientError ? e.message : "errors.INTERNAL");
        return false;
      }
    },
    [toast, router],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!initial.user) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const had = wishlist.has(productId);
      setWishlist((s) => {
        const next = new Set(s);
        if (had) next.delete(productId);
        else next.add(productId);
        return next;
      });
      try {
        if (had) await api(`/wishlist/${productId}`, { method: "DELETE" });
        else await api("/wishlist", { body: { productId } });
        toast("success", had ? "wishlist.removed" : "wishlist.added");
      } catch (e) {
        setWishlist((s) => {
          const next = new Set(s);
          if (had) next.add(productId);
          else next.delete(productId);
          return next;
        });
        toast("error", e instanceof ApiClientError ? e.message : "errors.INTERNAL");
      }
    },
    [initial.user, wishlist, router, toast],
  );

  const value = useMemo<ShopValue>(
    () => ({
      user: initial.user,
      cartCount,
      unreadNotifications: initial.unreadNotifications,
      isWishlisted: (id) => wishlist.has(id),
      toggleWishlist,
      addToCart,
      refreshCartCount,
    }),
    [initial.user, initial.unreadNotifications, cartCount, wishlist, toggleWishlist, addToCart, refreshCartCount],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShop() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShop must be used inside <ShopProvider>");
  return ctx;
}
