"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { COOKIE } from "@/lib/cookies";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/form";

type Consent = { analytics: boolean; marketing: boolean; personalization: boolean };
const OPEN_EVENT = "sabaky:open-cookie-settings";

/**
 * GDPR / ePrivacy cookie consent. Non-essential categories are OFF until the
 * visitor opts in; "Reject" is as prominent as "Accept". Choices are logged
 * server-side in the consent ledger and can be changed at any time.
 */
export function CookieConsent() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [customise, setCustomise] = useState(false);
  const [choice, setChoice] = useState<Consent>({ analytics: false, marketing: false, personalization: false });

  useEffect(() => {
    const has = document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE.consent}=`));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser-only value after mount
    if (!has) setVisible(true);
    const open = () => {
      setCustomise(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  async function save(consent: Consent) {
    setVisible(false);
    await api("/consent", { body: consent }).catch(() => {});
  }

  if (!visible) return null;
  return (
    <div role="dialog" aria-labelledby="cookie-title" className="fixed inset-x-3 bottom-[76px] z-50 animate-slide-up md:inset-x-auto md:bottom-6 md:left-6 md:max-w-md">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-pop)]">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sunrise-50 text-sunrise-600">
            <Cookie className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 id="cookie-title" className="text-sm font-semibold">
              {t("cookies.title")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted">
              {t("cookies.body")}{" "}
              <Link href="/legal/cookies" className="font-medium text-brand-700 underline">
                {t("cookies.learnMore")}
              </Link>
            </p>
          </div>
        </div>
        {customise && (
          <div className="mt-4 space-y-2.5 rounded-xl bg-surface-muted p-3">
            <Checkbox label={t("cookies.essential")} checked disabled readOnly />
            <Checkbox label={t("cookies.personalization")} checked={choice.personalization} onChange={(e) => setChoice({ ...choice, personalization: e.target.checked })} />
            <Checkbox label={t("cookies.analytics")} checked={choice.analytics} onChange={(e) => setChoice({ ...choice, analytics: e.target.checked })} />
            <Checkbox label={t("cookies.marketing")} checked={choice.marketing} onChange={(e) => setChoice({ ...choice, marketing: e.target.checked })} />
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => save({ analytics: false, marketing: false, personalization: false })}>
            {t("cookies.reject")}
          </Button>
          <Button size="sm" onClick={() => save({ analytics: true, marketing: true, personalization: true })}>
            {t("cookies.accept")}
          </Button>
          {customise ? (
            <Button variant="secondary" size="sm" className="col-span-2" onClick={() => save(choice)}>
              {t("cookies.saveChoices")}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="col-span-2" onClick={() => setCustomise(true)}>
              {t("cookies.customise")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsLink() {
  const { t } = useI18n();
  return (
    <button onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className="text-sm text-fg-muted hover:text-brand-700">
      {t("footer.cookieSettings")}
    </button>
  );
}
