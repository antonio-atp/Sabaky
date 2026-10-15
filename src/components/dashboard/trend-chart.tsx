"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";

/**
 * Single-series daily trend (sales / GMV). One hue (brand), thin bars with a
 * 2px gap and 4px rounded data-ends anchored at the baseline, recessive grid,
 * per-bar hover tooltip with an oversized hit target, and a screen-reader
 * table view. Values are base-currency minor units.
 */
export function TrendChart({ data, label, height = 220 }: { data: { date: string; value: number }[]; label: string; height?: number }) {
  const { price, date } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const width = 720;
  const pad = { top: 12, right: 8, bottom: 26, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = niceCeil(max);
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(2, slot - 2); // 2px surface gap between adjacent bars
  const y = (v: number) => pad.top + innerH - (v / niceMax) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMax);
  const active = hover !== null ? data[hover] : null;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {ticks.map((tv) => (
          <g key={tv}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tv)} y2={y(tv)} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.left - 8} y={y(tv)} textAnchor="end" dominantBaseline="middle" className="fill-[var(--fg-subtle)] text-[10px]">
              {compactMoney(tv)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.left + i * slot + 1;
          const h = Math.max(0, pad.top + innerH - y(d.value));
          const r = Math.min(4, barW / 2, h);
          const top = pad.top + innerH - h;
          return (
            <g key={d.date}>
              {h > 0 && (
                <path
                  d={`M${x},${pad.top + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${pad.top + innerH} Z`}
                  className={hover === i ? "fill-brand-700" : "fill-brand-500"}
                />
              )}
              {/* Oversized, invisible hit target spanning the full column. */}
              <rect x={pad.left + i * slot} y={pad.top} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={-1} />
            </g>
          );
        })}
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="var(--line-strong)" strokeWidth={1} />
        {data.map((d, i) =>
          i % Math.ceil(data.length / 6) === 0 ? (
            <text key={d.date} x={pad.left + i * slot + slot / 2} y={height - 8} textAnchor="middle" className="fill-[var(--fg-subtle)] text-[10px]">
              {date(d.date, { day: "numeric", month: "short" })}
            </text>
          ) : null,
        )}
      </svg>
      {active && hover !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: `${((pad.left + hover * slot + slot / 2) / width) * 100}%` }}
        >
          <p className="text-white/70">{date(active.date, { weekday: "short", day: "numeric", month: "short" })}</p>
          <p className="font-semibold tabular">{price(active.value)}</p>
        </div>
      )}
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{price(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function niceCeil(v: number) {
  const exp = 10 ** Math.floor(Math.log10(v));
  const n = v / exp;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * exp;
}

function compactMoney(minor: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(minor / 100);
}
