/**
 * Development seed. Idempotent-ish: wipes marketplace data, then rebuilds a
 * realistic dataset (users, sellers, catalogue, orders, reviews, promotions).
 *
 *   npm run db:seed
 *
 * Demo credentials are printed at the end — for local use only.
 */
import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { BANNERS, BANNER_LINKS, CATEGORIES, COLORS, HIGHLIGHTS, PRODUCTS, SELLERS, type ProductSeed } from "./seed-data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Deterministic PRNG → the same dataset on every run.
let seed = 20260925;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const cents = (eur: number) => Math.round(eur * 100);
const daysAgo = (d: number, h = int(8, 21)) => new Date(Date.now() - d * 86_400_000 - (24 - h) * 3_600_000);
const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);

const pw = (p: string) => hash(p, { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 });

async function wipe() {
  // Order matters (FK constraints). Users are kept only if not demo.
  const tables = [
    "AuditLog", "RiskEvent", "UserEvent", "Notification", "NotificationPreference", "ConsentRecord", "PrivacyRequest",
    "ReviewReport", "Review", "ProductQuestion", "ProductReport", "Dispute", "Refund", "ReturnRequest", "ShipmentEvent",
    "CouponRedemption", "Payment", "OrderEvent", "OrderItem", "Shipment", "Order", "CartItem", "Cart", "WishlistItem",
    "Wishlist", "PromotionProduct", "Promotion", "Banner", "Coupon", "Inventory", "ProductVariant", "ProductImage",
    "Product", "Brand", "Category", "SellerVerification", "Seller", "Address", "PaymentMethod", "VerificationToken",
    "Session", "LoginAttempt", "PlatformSetting", "User",
  ];
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} CASCADE`);
}

const REVIEW_BODIES = [
  ["Exactly as described", "Arrived two days early and the quality is excellent for the price. Would buy again from this seller."],
  ["Great value", "Really happy with this purchase. Packaging was plastic-free and everything worked straight out of the box."],
  ["Very good, minor issue", "Works well overall. The instructions could be clearer, but the seller answered my question quickly."],
  ["Love it", "Beautiful finish and feels premium. I've already recommended it to friends."],
  ["Solid choice", "Does the job perfectly. Delivery tracking was accurate the whole way."],
  ["Good but runs small", "Nice material. I'd suggest ordering one size up — exchange was easy though."],
  ["Five stars", "Fast shipping, great communication and a quality product. Couldn't ask for more."],
  ["Okay", "It's fine for the price, nothing special. Delivery was quick."],
];

async function main() {
  console.log("🌱 Seeding Sabaky…");
  await wipe();

  // ── Users ──────────────────────────────────────────────────────────────────
  const [adminHash, sellerHash, customerHash] = await Promise.all([pw("Admin#Sabaky2026"), pw("Seller#Sabaky2026"), pw("Customer#Sabaky2026")]);
  const now = new Date();

  const admin = await db.user.create({
    data: { email: "admin@sabaky.test", name: "Sofia Admin", passwordHash: adminHash, roles: ["CUSTOMER", "ADMIN"], emailVerifiedAt: now, locale: "en", passwordChangedAt: now, wishlist: { create: {} } },
  });

  const customerSeeds = [
    { email: "ana@sabaky.test", name: "Ana Ribeiro", locale: "pt", country: "PT" },
    { email: "lucas@sabaky.test", name: "Lucas Moreau", locale: "fr", country: "FR" },
    { email: "marta@sabaky.test", name: "Marta García", locale: "es", country: "ES" },
    { email: "felix@sabaky.test", name: "Felix Wagner", locale: "de", country: "DE" },
    { email: "elena@sabaky.test", name: "Elena Conti", locale: "it", country: "IT" },
    { email: "james@sabaky.test", name: "James O'Connor", locale: "en", country: "IE" },
    // Additional synthetic shoppers so reviews and analytics have realistic volume.
    ...["Pedro Santos", "Chloé Petit", "Javier Ruiz", "Hannah Keller", "Luca Ferri", "Niamh Byrne", "Beatriz Lopes", "Julien Roux",
      "Carmen Díaz", "Moritz Braun", "Sara Greco", "Tomás Nunes", "Léa Girard", "Paul Hoffmann"].map((name, i) => ({
      email: `shopper${i + 1}@sabaky.test`,
      name,
      locale: ["pt", "fr", "es", "de", "it", "en"][i % 6],
      country: ["PT", "FR", "ES", "DE", "IT", "IE"][i % 6],
    })),
  ];
  const customers = [];
  for (const [i, c] of customerSeeds.entries()) {
    customers.push(
      await db.user.create({
        data: {
          email: c.email,
          name: c.name,
          passwordHash: customerHash,
          emailVerifiedAt: now,
          locale: c.locale,
          countryCode: c.country,
          passwordChangedAt: now,
          createdAt: daysAgo(90 - i * 5),
          wishlist: { create: {} },
          consents: { create: [{ purpose: "terms", granted: true, version: "2026-09" }, { purpose: "marketing", granted: i % 2 === 0, version: "2026-09" }] },
          addresses: {
            create: {
              label: "Home",
              fullName: c.name,
              line1: `${pick(["Rua das Flores", "Calle Mayor", "Rue de Rivoli", "Hauptstraße", "Via Roma", "Grafton Street"])} ${int(1, 200)}`,
              city: { PT: "Lisboa", FR: "Paris", ES: "Madrid", DE: "Berlin", IT: "Roma", IE: "Dublin" }[c.country]!,
              postalCode: { PT: "1100-148", FR: "75001", ES: "28013", DE: "10115", IT: "00184", IE: "D02 X285" }[c.country]!,
              countryCode: c.country,
              isDefault: true,
            },
          },
        },
      }),
    );
  }

  // ── Sellers ────────────────────────────────────────────────────────────────
  const sellerIds: Record<string, { id: string; userId: string }> = {};
  for (const s of SELLERS) {
    const user = await db.user.create({
      data: {
        email: `${s.email}@sabaky.test`,
        name: s.owner,
        passwordHash: sellerHash,
        roles: ["CUSTOMER", "SELLER"],
        emailVerifiedAt: now,
        locale: "en",
        passwordChangedAt: now,
        wishlist: { create: {} },
      },
    });
    const seller = await db.seller.create({
      data: {
        userId: user.id,
        storeName: s.storeName,
        slug: slugify(s.storeName),
        description: s.description,
        countryCode: s.country,
        supportEmail: `support@${s.email}.example`,
        status: s.status,
        freeShippingThreshold: 3500,
        handlingDays: int(1, 2),
        createdAt: daysAgo(s.status === "PENDING" ? 1 : int(200, 700)),
        verifications: {
          create: {
            status: s.status,
            legalName: s.legalName,
            businessType: "company",
            registrationNumber: `REG-${int(100000, 999999)}`,
            vatNumber: `${s.country}${int(100000000, 999999999)}`,
            countryCode: s.country,
            documentKeys: [],
            reviewedAt: s.status === "VERIFIED" ? daysAgo(int(150, 600)) : null,
            reviewerId: s.status === "VERIFIED" ? admin.id : null,
          },
        },
      },
    });
    sellerIds[s.key] = { id: seller.id, userId: user.id };
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  const categoryIds: Record<string, { id: string; root: string; hue: number; seller: string; icon: string }> = {};
  for (const [i, root] of CATEGORIES.entries()) {
    const r = await db.category.create({ data: { slug: root.slug, name: root.name, icon: root.icon, translations: root.tr, sortOrder: i } });
    for (const [j, child] of root.children.entries()) {
      const c = await db.category.create({ data: { slug: child.slug, name: child.name, icon: child.icon, translations: child.tr, parentId: r.id, sortOrder: j } });
      categoryIds[child.slug] = { id: c.id, root: root.slug, hue: root.hue, seller: child.seller, icon: child.icon };
    }
  }

  // ── Brands & products ──────────────────────────────────────────────────────
  const brandIds = new Map<string, string>();
  const products: { id: string; sellerId: string; title: string; categoryId: string; variants: { id: string; name: string; price: number }[]; image: string }[] = [];

  const variantsFor = (p: ProductSeed, base: number) => {
    const price = cents(base);
    const compare = p.compareAt ? cents(p.compareAt) : null;
    switch (p.scheme) {
      case "colors":
        return COLORS.slice(0, int(2, 4)).map((c) => ({ name: c.name, color: c.name, colorHex: c.hex, size: null, price, compareAtPrice: compare }));
      case "apparel":
        return ["XS", "S", "M", "L", "XL"].flatMap((size) =>
          COLORS.slice(0, 2).map((c) => ({ name: `${c.name} / ${size}`, color: c.name, colorHex: c.hex, size, price, compareAtPrice: compare })),
        );
      case "shoes":
        return ["38", "39", "40", "41", "42", "43", "44"].map((size) => ({ name: `EU ${size}`, color: null, colorHex: null, size, price, compareAtPrice: compare }));
      case "storage":
        return [
          { name: "128 GB", color: null, colorHex: null, size: "128 GB", price, compareAtPrice: compare },
          { name: "256 GB", color: null, colorHex: null, size: "256 GB", price: price + 6000, compareAtPrice: compare ? compare + 6000 : null },
        ];
      case "volume":
        return [
          { name: "50 ml", color: null, colorHex: null, size: "50 ml", price, compareAtPrice: compare },
          { name: "100 ml", color: null, colorHex: null, size: "100 ml", price: Math.round(price * 1.6), compareAtPrice: compare ? Math.round(compare * 1.6) : null },
        ];
      default:
        return [{ name: "Standard", color: null, colorHex: null, size: null, price, compareAtPrice: compare }];
    }
  };

  let skuCounter = 1000;
  for (const [subSlug, list] of Object.entries(PRODUCTS)) {
    const cat = categoryIds[subSlug];
    if (!cat) continue;
    const seller = sellerIds[cat.seller];
    for (const [idx, p] of list.entries()) {
      if (!brandIds.has(p.brand)) {
        const b = await db.brand.create({ data: { name: p.brand, slug: slugify(p.brand) } });
        brandIds.set(p.brand, b.id);
      }
      const hue = (cat.hue + idx * 23) % 360;
      const variants = variantsFor(p, p.price);
      const cheapest = variants.reduce((a, b) => (a.price <= b.price ? a : b));
      const stockPer = variants.map(() => (rand() < 0.08 ? int(0, 3) : int(8, 120)));
      const totalStock = stockPer.reduce((a, b) => a + b, 0);
      const discountPct = cheapest.compareAtPrice ? Math.round(((cheapest.compareAtPrice - cheapest.price) / cheapest.compareAtPrice) * 100) : 0;
      const ship = p.free ? 0 : pick([299, 399, 499]);
      const minDays = int(2, 4);
      const highlights = [...HIGHLIGHTS[cat.root]].sort(() => rand() - 0.5).slice(0, 3);

      const created = await db.product.create({
        data: {
          sellerId: seller.id,
          categoryId: cat.id,
          brandId: brandIds.get(p.brand),
          title: p.title,
          slug: `${slugify(p.title)}-${(skuCounter + idx).toString(36)}`,
          description: `${p.title} by ${p.brand}.\n\nChosen by our team for its quality and value, this item is sold and shipped by a verified Sabaky seller. ${highlights.join(". ")}.\n\nNeed help choosing? Ask the seller a question below — most questions are answered within a day.`,
          highlights,
          specifications: [
            { label: "Brand", value: p.brand },
            { label: "Model", value: `${p.brand.slice(0, 3).toUpperCase()}-${int(100, 999)}` },
            { label: "Warranty", value: cat.root === "digital" ? "—" : "2 years (EU)" },
            { label: "Ships from", value: SELLERS.find((s) => s.key === cat.seller)!.country },
          ],
          condition: rand() < 0.05 ? "REFURBISHED" : "NEW",
          status: "ACTIVE",
          price: cheapest.price,
          compareAtPrice: cheapest.compareAtPrice,
          discountPct,
          shippingCost: ship,
          freeShipping: !!p.free,
          deliveryDaysMin: minDays,
          deliveryDaysMax: minDays + int(2, 5),
          salesCount: int(5, 2400),
          viewCount: int(100, 20000),
          totalStock,
          isFeatured: !!p.featured,
          publishedAt: daysAgo(int(1, 180)),
          images: {
            create: [0, 1, 2].map((v) => ({ url: `/demo-media/${p.icon}-${hue}${v ? `-${v}` : ""}.svg`, alt: p.title, sortOrder: v, width: 600, height: 600 })),
          },
        },
      });
      const createdVariants = [];
      for (const [vi, v] of variants.entries()) {
        const cv = await db.productVariant.create({
          data: { productId: created.id, sku: `SBK-${skuCounter++}`, name: v.name, color: v.color, colorHex: v.colorHex, size: v.size, price: v.price, compareAtPrice: v.compareAtPrice, sortOrder: vi, inventory: { create: { quantity: stockPer[vi] } } },
        });
        createdVariants.push({ id: cv.id, name: cv.name, price: cv.price });
      }
      products.push({ id: created.id, sellerId: seller.id, title: created.title, categoryId: cat.id, variants: createdVariants, image: `/demo-media/${p.icon}-${hue}.svg` });
    }
  }

  // ── Orders, shipments, payments, reviews ───────────────────────────────────
  const carriers = ["CTT", "DHL", "DPD", "GLS", "UPS"];
  let orderSeq = 0;
  const flow = ["PAYMENT_CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
  const shipFlow = { PAYMENT_CONFIRMED: "PENDING", PROCESSING: "LABEL_CREATED", SHIPPED: "SHIPPED", IN_TRANSIT: "IN_TRANSIT", OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY", DELIVERED: "DELIVERED" } as const;
  const reviewed = new Set<string>();

  for (const customer of customers) {
    const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });
    const orderCount = int(5, 8);
    for (let o = 0; o < orderCount; o++) {
      const ageDays = int(0, 45);
      // Recent orders are still moving; older ones are delivered.
      const status = ageDays > 7 ? "DELIVERED" : pick([...flow]);
      const picks = [...products].sort(() => rand() - 0.5).slice(0, int(1, 3));
      const lines = picks.map((p) => ({ p, v: pick(p.variants), qty: rand() < 0.8 ? 1 : 2 }));
      const subtotal = lines.reduce((s, l) => s + l.v.price * l.qty, 0);
      const shipping = subtotal > 3500 ? 0 : 399;
      const total = subtotal + shipping;
      const placedAt = daysAgo(ageDays);
      const number = `SBK-${placedAt.toISOString().slice(2, 10).replace(/-/g, "")}-${(++orderSeq).toString(36).toUpperCase().padStart(6, "Q")}`;
      const addr = { fullName: address.fullName, line1: address.line1, line2: null, city: address.city, region: null, postalCode: address.postalCode, countryCode: address.countryCode, phone: null };

      const order = await db.order.create({
        data: {
          number,
          userId: customer.id,
          status,
          email: customer.email,
          shippingAddress: addr,
          deliveryMethod: "STANDARD",
          subtotal,
          shippingTotal: shipping,
          taxTotal: Math.round(total - total / 1.21),
          total,
          placedAt,
          estimatedDeliveryAt: new Date(placedAt.getTime() + 6 * 86_400_000),
          payments: { create: { provider: "mock", providerPaymentId: `mock_pi_seed_${orderSeq}`, method: pick(["CARD", "CARD", "PAYPAL", "APPLE_PAY"]), status: "CAPTURED", amount: total, currency: "EUR", idempotencyKey: `seed-${orderSeq}`, createdAt: placedAt } },
        },
      });

      const reached = flow.slice(0, flow.indexOf(status) + 1);
      await db.orderEvent.createMany({
        data: [{ orderId: order.id, status: "PENDING_PAYMENT" as const, createdAt: placedAt }, ...reached.map((s, i) => ({ orderId: order.id, status: s, createdAt: new Date(placedAt.getTime() + (i + 1) * 9 * 3_600_000) }))],
      });

      for (const sellerId of [...new Set(lines.map((l) => l.p.sellerId))]) {
        const shipStatus = shipFlow[status];
        const shipped = flow.indexOf(status) >= 2;
        const shipment = await db.shipment.create({
          data: {
            orderId: order.id,
            sellerId,
            status: shipStatus,
            carrier: shipped ? pick(carriers) : null,
            trackingNumber: shipped ? `TRK${int(10000000, 99999999)}EU` : null,
            shippedAt: shipped ? new Date(placedAt.getTime() + 30 * 3_600_000) : null,
            deliveredAt: status === "DELIVERED" ? new Date(placedAt.getTime() + int(3, 6) * 86_400_000) : null,
            estimatedDeliveryAt: new Date(placedAt.getTime() + 6 * 86_400_000),
            events: shipped
              ? {
                  create: ["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"]
                    .slice(0, Math.max(1, flow.indexOf(status) - 1))
                    .map((s, i) => ({ status: s as "SHIPPED", description: `status.${s}`, location: pick(["Lisboa Hub", "Madrid Hub", "Köln Hub", "Paris Nord", "Local depot"]), occurredAt: new Date(placedAt.getTime() + (30 + i * 20) * 3_600_000) })),
                }
              : undefined,
          },
        });
        for (const l of lines.filter((x) => x.p.sellerId === sellerId)) {
          const item = await db.orderItem.create({
            data: {
              orderId: order.id,
              shipmentId: shipment.id,
              productId: l.p.id,
              variantId: l.v.id,
              sellerId,
              title: l.p.title,
              variantName: l.v.name,
              imageUrl: l.p.image,
              unitPrice: l.v.price,
              quantity: l.qty,
              lineTotal: l.v.price * l.qty,
              commission: Math.round(l.v.price * l.qty * 0.1),
            },
          });
          const key = `${customer.id}:${l.p.id}`;
          if (status === "DELIVERED" && !reviewed.has(key) && rand() < 0.75) {
            reviewed.add(key);
            const [title, body] = pick(REVIEW_BODIES);
            const rating = title === "Okay" ? 3 : title.includes("minor") || title.includes("small") ? 4 : pick([4, 5, 5, 5]);
            await db.review.create({
              data: {
                productId: l.p.id,
                userId: customer.id,
                orderItemId: item.id,
                rating,
                title,
                body,
                isVerifiedPurchase: true,
                helpfulCount: int(0, 40),
                editableUntil: new Date(Date.now() + 30 * 86_400_000),
                createdAt: new Date(placedAt.getTime() + int(6, 12) * 86_400_000),
                sellerReply: rand() < 0.3 ? "Thank you so much for your feedback — we're glad you're happy with it!" : null,
              },
            });
          }
        }
      }
      await db.notification.create({
        data: { userId: customer.id, type: "ORDER_CONFIRMATION", title: `Order ${number} received`, body: "Thanks for shopping on Sabaky! We'll let you know when it ships.", href: `/account/orders/${number}`, createdAt: placedAt, readAt: ageDays > 3 ? placedAt : null },
      });
    }
  }

  // Denormalised ratings on products & sellers.
  const ratings = await db.review.groupBy({ by: ["productId"], _avg: { rating: true }, _count: { _all: true } });
  for (const r of ratings) await db.product.update({ where: { id: r.productId }, data: { ratingAvg: r._avg.rating ?? 0, ratingCount: r._count._all } });
  for (const s of Object.values(sellerIds)) {
    const agg = await db.review.aggregate({ where: { product: { sellerId: s.id } }, _avg: { rating: true }, _count: { _all: true } });
    await db.seller.update({ where: { id: s.id }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count._all } });
  }

  // ── Questions ──────────────────────────────────────────────────────────────
  for (const p of products.slice(0, 40)) {
    const asker = pick(customers);
    const answered = rand() < 0.7;
    await db.productQuestion.create({
      data: {
        productId: p.id,
        userId: asker.id,
        question: pick(["Is this compatible with EU plugs?", "What are the exact dimensions?", "Does it come with a warranty card?", "Is the colour accurate to the photos?", "How long does delivery to Portugal take?"]),
        answer: answered ? pick(["Yes — it ships with an EU plug and a 2-year warranty.", "Full dimensions are listed in the specifications tab.", "Colours are photographed in daylight; they're very accurate.", "Usually 3–5 business days with tracking."]) : null,
        answeredAt: answered ? daysAgo(int(1, 30)) : null,
        status: answered ? "ANSWERED" : "PENDING",
      },
    });
  }

  // ── Promotions ─────────────────────────────────────────────────────────────
  const dealProducts = [...products].sort(() => rand() - 0.5).slice(0, 14);
  await db.promotion.create({
    data: {
      name: "Autumn Flash Sale",
      kind: "FLASH_DEAL",
      startsAt: daysAgo(1),
      endsAt: new Date(Date.now() + 2 * 86_400_000 + 5 * 3_600_000),
      products: { create: dealProducts.map((p) => ({ productId: p.id, discountBps: pick([1500, 2000, 2500, 3000]) })) },
    },
  });

  await db.coupon.createMany({
    data: [
      { code: "WELCOME10", description: "10% off your first order (max €20)", type: "PERCENT", value: 1000, maxDiscount: 2000, perUserLimit: 1 },
      { code: "FREESHIP", description: "Free standard shipping, orders over €20", type: "FREE_SHIPPING", value: 0, minSubtotal: 2000, perUserLimit: 3 },
      { code: "SAVE5", description: "€5 off orders over €40", type: "FIXED", value: 500, minSubtotal: 4000, perUserLimit: 2 },
      { code: "TECHNOVA15", description: "15% off TechNova Europe", type: "PERCENT", value: 1500, sellerId: sellerIds.technova.id, perUserLimit: 1 },
    ],
  });

  await db.banner.createMany({
    data: Object.entries(BANNERS).flatMap(([locale, banners]) =>
      banners.map(([title, subtitle, ctaLabel], i) => ({ locale, title, subtitle, ctaLabel, href: BANNER_LINKS[i].href, theme: BANNER_LINKS[i].theme, sortOrder: i })),
    ),
  });

  // ── Fraud-review examples for the admin console ─────────────────────────────
  await db.riskEvent.createMany({
    data: [
      { type: "BRUTE_FORCE", score: 78, details: { ipHash: "3f9a…", accounts: 9, window: "15m" } },
      { type: "COUPON_ABUSE", score: 62, userId: customers[3].id, details: { couponCode: "WELCOME10", linkedAccounts: 4 } },
      { type: "SELLER_ABUSE", score: 50, sellerId: sellerIds.pixelgifts.id, details: { reason: "suspicious_discount", discountPct: 88 } },
    ],
  });

  await db.platformSetting.create({ data: { key: "platform", value: { requireProductApproval: false, defaultCommissionBps: 1000, maintenanceMode: false } } });

  const counts = { products: products.length, orders: orderSeq, reviews: await db.review.count() };
  console.log(`✅ Seeded ${counts.products} products, ${counts.orders} orders, ${counts.reviews} verified reviews.`);
  console.log(`
  Demo accounts (local development only):
    Admin     admin@sabaky.test      / Admin#Sabaky2026
    Seller    technova@sabaky.test   / Seller#Sabaky2026   (also: atelier@, lumen@, pureglow@ …)
    Pending   nordic@sabaky.test     / Seller#Sabaky2026   (awaiting verification)
    Customer  ana@sabaky.test        / Customer#Sabaky2026
  Coupons: WELCOME10 · FREESHIP · SAVE5 · TECHNOVA15
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

