import { ProductGridSkeleton } from "@/components/product/product-grid";
import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="container-page space-y-8 py-6" aria-busy="true">
      <Skeleton className="h-[220px] w-full rounded-3xl sm:h-[300px]" />
      <div className="flex gap-3">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-20 shrink-0 rounded-2xl" />
        ))}
      </div>
      <ProductGridSkeleton />
    </div>
  );
}
