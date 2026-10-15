/** Order lifecycle shown to customers (tracking timeline order). */
export const ORDER_TIMELINE = [
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export type TimelineStatus = (typeof ORDER_TIMELINE)[number];

/** Customers may self-cancel until the seller ships. */
export const CANCELLABLE_STATUSES = ["PENDING_PAYMENT", "PAYMENT_CONFIRMED", "PROCESSING"] as const;

/** Return window after delivery (EU consumer law minimum is 14 days). */
export const RETURN_WINDOW_DAYS = 30;
/** Reviews can be edited for this many days after posting. */
export const REVIEW_EDIT_WINDOW_DAYS = 30;

export const PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 60;
export const MAX_CART_LINE_QTY = 99;

export const SORT_OPTIONS = ["relevance", "price_asc", "price_desc", "rating", "popular", "newest", "discount"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const PAYMENT_METHODS = ["CARD", "PAYPAL", "APPLE_PAY", "GOOGLE_PAY", "BANK_TRANSFER"] as const;
export type PaymentMethodCode = (typeof PAYMENT_METHODS)[number];

export const DELIVERY_METHODS = ["STANDARD", "EXPRESS", "PICKUP_POINT"] as const;
export type DeliveryMethodCode = (typeof DELIVERY_METHODS)[number];

export const CARRIERS = ["CTT", "DHL", "DPD", "GLS", "UPS", "Correos", "La Poste", "PostNL", "Sabaky Logistics"] as const;
