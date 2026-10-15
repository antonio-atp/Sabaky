import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Sabaky mark: a jade shopping bag whose body carries a flowing "S", with a
 * sunrise-amber spark — commerce, trust, and a daily "new find".
 */
export function LogoMark({ className }: { className?: string }) {
  // Unique gradient id per instance: duplicate SVG ids break rendering when one copy is display:none.
  const gradientId = `sbk-g-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="6" y1="10" x2="34" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1fc497" />
          <stop offset="1" stopColor="#0a705b" />
        </linearGradient>
      </defs>
      <path d="M14 12.5V10a6 6 0 0 1 12 0v2.5" fill="none" stroke="#0a705b" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="5" y="11" width="30" height="26" rx="8.5" fill={`url(#${gradientId})`} />
      <path
        d="M25.2 18.6c-1-1.6-2.9-2.5-5.1-2.5-3 0-5 1.5-5 3.6 0 4.8 10.5 2.6 10.5 7.7 0 2.2-2.2 3.7-5.3 3.7-2.4 0-4.4-1-5.4-2.7"
        fill="none"
        stroke="#fff"
        strokeWidth="3.1"
        strokeLinecap="round"
      />
      <circle cx="31.5" cy="12.5" r="3.4" fill="#ffb020" stroke="#fff" strokeWidth="1.6" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[1.6rem] leading-none font-extrabold tracking-[-0.045em] text-ink-900">
          sabaky<span className="text-sunrise-400">.</span>
        </span>
      )}
    </span>
  );
}
