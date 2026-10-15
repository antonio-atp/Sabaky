import type { ReactNode } from "react";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import { SectionHeader } from "@/components/ui/misc";
import type { ProductCardDTO } from "@/shared/types";
import { cn } from "@/lib/utils";

export function ProductGrid({ products, className, priorityCount = 0 }: { products: ProductCardDTO[]; className?: string; priorityCount?: number }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5", className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Horizontal, swipeable rail on small screens; grid-like row on desktop. */
export function ProductRail({
  title,
  subtitle,
  action,
  icon,
  products,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  products: ProductCardDTO[];
  className?: string;
}) {
  if (!products.length) return null;
  return (
    <section className={className}>
      <SectionHeader title={title} subtitle={subtitle} action={action} icon={icon} />
      <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible">
        {products.slice(0, 10).map((p) => (
          <ProductCard key={p.id} product={p} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23%] lg:w-auto lg:[&:nth-child(n+6)]:hidden" />
        ))}
      </div>
    </section>
  );
}
