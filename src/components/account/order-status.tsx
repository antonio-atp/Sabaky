"use client";

import { Check, CreditCard, Home, PackageCheck, PackageOpen, Receipt, Truck, Warehouse } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { ORDER_TIMELINE } from "@/shared/constants";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  PENDING_PAYMENT: "bg-sunrise-50 text-sunrise-600",
  PAYMENT_CONFIRMED: "bg-brand-50 text-brand-700",
  PROCESSING: "bg-brand-50 text-brand-700",
  SHIPPED: "bg-brand-100 text-brand-800",
  IN_TRANSIT: "bg-brand-100 text-brand-800",
  OUT_FOR_DELIVERY: "bg-brand-100 text-brand-800",
  DELIVERED: "bg-brand-600 text-white",
  CANCELLED: "bg-surface-sunken text-fg-muted",
  REFUNDED: "bg-berry-50 text-berry-700",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[status] ?? "bg-surface-sunken text-fg-muted")}>{t(`orderStatus.${status}`)}</span>;
}

const ICONS = [Receipt, CreditCard, Warehouse, PackageOpen, Truck, Home, PackageCheck];

/** Order placed → Payment confirmed → Processing → Shipped → In transit → Out for delivery → Delivered */
export function OrderTimeline({ status, events }: { status: string; events: { status: string; createdAt: string }[] }) {
  const { t, date } = useI18n();
  const cancelled = status === "CANCELLED" || status === "REFUNDED";
  const current = ORDER_TIMELINE.indexOf(status as (typeof ORDER_TIMELINE)[number]);
  const reached = (i: number) => (cancelled ? events.some((e) => e.status === ORDER_TIMELINE[i]) : i <= current);

  return (
    <ol className="relative grid gap-4 sm:grid-cols-7 sm:gap-0">
      {ORDER_TIMELINE.map((s, i) => {
        const Icon = ICONS[i];
        const done = reached(i);
        const at = events.find((e) => e.status === s)?.createdAt;
        return (
          <li key={s} className="relative flex items-center gap-3 sm:flex-col sm:text-center">
            {i > 0 && <span className={cn("absolute hidden h-0.5 sm:block", done ? "bg-brand-500" : "bg-line")} style={{ left: "-50%", right: "50%", top: 18 }} aria-hidden />}
            <span className={cn("relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2", done ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-surface text-fg-subtle", i === current && !cancelled && "ring-4 ring-brand-500/20")}>
              {done && i < current ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>
            <span className="sm:mt-2">
              <span className={cn("block text-xs font-semibold", done ? "text-fg" : "text-fg-subtle")}>{t(`orderStatus.${s}`)}</span>
              {at && <span className="block text-[11px] text-fg-subtle">{date(at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
