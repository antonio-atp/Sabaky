import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Minimal responsive table: horizontal scroll on small screens, sticky header. */
export function DataTable({ head, children, empty, className }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode; className?: string }) {
  return (
    <div className={cn("card overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-line bg-surface-muted/70 text-left text-xs uppercase tracking-wide text-fg-subtle">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function FilterTabs({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <div className="scrollbar-none mb-4 flex gap-1 overflow-x-auto">
      {items.map((i) => (
        <a
          key={i.key}
          href={i.href}
          aria-current={i.key === active ? "page" : undefined}
          className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium", i.key === active ? "bg-ink-900 text-white" : "bg-surface text-fg-muted ring-1 ring-line hover:text-fg")}
        >
          {i.label}
        </a>
      ))}
    </div>
  );
}
