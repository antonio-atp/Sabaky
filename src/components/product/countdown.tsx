"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0"));
}

export function Countdown({ endsAt, className }: { endsAt: string; className?: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start ticking only on the client (avoids hydration mismatch)
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const [h, m, s] = now === null ? ["--", "--", "--"] : parts(new Date(endsAt).getTime() - now);
  return (
    <span className={className} role="timer" aria-label={t("deals.endsIn")}>
      <span className="mr-1.5 text-xs font-medium opacity-80">{t("deals.endsIn")}</span>
      {[h, m, s].map((v, i) => (
        <span key={i} className="inline-flex items-center">
          <span className="inline-grid min-w-7 place-items-center rounded-md bg-ink-900 px-1 py-0.5 text-xs font-bold text-white tabular">{v}</span>
          {i < 2 && <span className="px-0.5 font-bold">:</span>}
        </span>
      ))}
    </span>
  );
}
