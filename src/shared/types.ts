/**
 * API data-transfer objects shared by the web client and future native apps.
 * All monetary values are integer minor units in the base currency (EUR).
 */

export interface ProductCardDTO {
  id: string;
  slug: string;
  title: string;
  image: { url: string; alt: string } | null;
  price: number;
  compareAtPrice: number | null;
  discountPct: number;
  ratingAvg: number;
  ratingCount: number;
  salesCount: number;
  freeShipping: boolean;
  deliveryDaysMax: number;
  inStock: boolean;
  brand: string | null;
  seller: { name: string; slug: string };
  deal: { endsAt: string; discountPct: number } | null;
  isFeatured?: boolean;
}

export interface CategoryDTO {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  children?: CategoryDTO[];
}

export interface CartLineDTO {
  id: string;
  variantId: string;
  productId: string;
  productSlug: string;
  title: string;
  variantName: string;
  image: { url: string; alt: string } | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  lineTotal: number;
  available: number;
  savedForLater: boolean;
  seller: { id: string; name: string; slug: string };
  variants: { id: string; name: string; available: number }[];
  issue: "out_of_stock" | "insufficient_stock" | "unavailable" | null;
}

export interface CartDTO {
  id: string | null;
  lines: CartLineDTO[];
  saved: CartLineDTO[];
  itemCount: number;
  couponCode: string | null;
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    shippingDiscount: number;
    tax: number;
    total: number;
    vatBps: number;
  };
  coupon: { code: string; applied: boolean; reason?: string } | null;
  groups: { sellerId: string; sellerName: string; subtotal: number; shipping: number; deliveryDaysMin: number; deliveryDaysMax: number }[];
  deliveryOptions?: { method: "STANDARD" | "EXPRESS" | "PICKUP_POINT"; shipping: number; deliveryDaysMin: number; deliveryDaysMax: number }[];
}

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export type ApiResponse<T> = { data: T } | { error: ApiError };
