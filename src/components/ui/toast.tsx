"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

type Toast = { id: number; tone: "success" | "error"; message: string };
const ToastContext = createContext<(tone: Toast["tone"], message: string) => void>(() => {});

/** Lightweight, accessible toasts (aria-live) — no popups that block the page. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { t } = useI18n();
  const push = useCallback((tone: Toast["tone"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-2), { id, tone, message }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-slide-up items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-[var(--shadow-pop)]",
              toast.tone === "success" ? "bg-ink-900" : "bg-berry-600",
            )}
          >
            {toast.tone === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-300" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            <span className="flex-1">{t(toast.message)}</span>
            <button onClick={() => setToasts((all) => all.filter((x) => x.id !== toast.id))} aria-label={t("common.close")} className="opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
