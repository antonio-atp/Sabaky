import type { MetadataRoute } from "next";
import { db } from "@/server/db";

// Rebuilt at most hourly. For catalogues beyond ~50k URLs, split with generateSitemaps().
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const [products, categories, stores] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE", deletedAt: null, seller: { status: "VERIFIED" } }, select: { slug: true, updatedAt: true }, take: 45_000 }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    db.seller.findMany({ where: { status: "VERIFIED" }, select: { slug: true, updatedAt: true } }),
  ]).catch(() => [[], [], []] as const);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/deals`, changeFrequency: "hourly", priority: 0.8 },
    ...categories.map((c) => ({ url: `${base}/c/${c.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/p/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
    ...stores.map((s) => ({ url: `${base}/store/${s.slug}`, lastModified: s.updatedAt, priority: 0.4 })),
  ];
}
