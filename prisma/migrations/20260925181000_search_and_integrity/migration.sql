-- ─────────────────────────────────────────────────────────────────────────────
-- Search acceleration + integrity rules Prisma cannot express declaratively.
-- ─────────────────────────────────────────────────────────────────────────────

-- Trigram indexes make ILIKE '%term%' product search index-backed.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Product_title_trgm_idx" ON "Product" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Brand_name_trgm_idx" ON "Brand" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Seller_storeName_trgm_idx" ON "Seller" USING gin ("storeName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Category_name_trgm_idx" ON "Category" USING gin ("name" gin_trgm_ops);

-- Money and quantities can never go negative (defence in depth beyond app validation).
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_nonneg" CHECK ("price" >= 0 AND "shippingCost" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_price_positive" CHECK ("price" > 0);
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_nonneg" CHECK ("quantity" >= 0 AND "reserved" >= 0);
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0 AND "unitPrice" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_totals_nonneg" CHECK ("total" >= 0 AND "subtotal" >= 0 AND "taxTotal" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_nonneg" CHECK ("amount" >= 0);
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_value_nonneg" CHECK ("value" >= 0 AND "usedCount" >= 0);

-- At most one default address per customer.
CREATE UNIQUE INDEX IF NOT EXISTS "Address_one_default_per_user" ON "Address" ("userId") WHERE "isDefault";
