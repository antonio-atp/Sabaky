"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Check, CreditCard, Lock, Pencil, Smartphone, Wallet } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api, ApiClientError } from "@/lib/api-client";
import { useShop } from "@/components/providers/shop-provider";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/form";
import { AddressFields, emptyAddress, type AddressDraft } from "@/components/account/address-fields";
import { OrderSummary } from "@/components/cart/order-summary";
import { COUNTRIES, isCountry } from "@/shared/config/countries";
import type { CartDTO } from "@/shared/types";
import type { DeliveryMethodCode, PaymentMethodCode } from "@/shared/constants";
import { cn } from "@/lib/utils";

interface SavedAddress {
  id: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string;
  countryCode: string;
  phone: string | null;
  isDefault: boolean;
}

interface Quote {
  cart: CartDTO;
  deliveryOptions: { method: DeliveryMethodCode; shipping: number; deliveryDaysMin: number; deliveryDaysMax: number }[];
}

const STEPS = ["contact", "address", "delivery", "payment", "review"] as const;
type Step = (typeof STEPS)[number];

const PAYMENT_ICONS: Record<PaymentMethodCode, typeof CreditCard> = {
  CARD: CreditCard,
  PAYPAL: Wallet,
  APPLE_PAY: Smartphone,
  GOOGLE_PAY: Smartphone,
  BANK_TRANSFER: Building2,
};

export function CheckoutFlow({
  initialCart,
  contact: initialContact,
  addresses,
  testMode,
}: {
  initialCart: CartDTO;
  contact: { email: string; fullName: string; phone: string };
  addresses: SavedAddress[];
  testMode: boolean;
}) {
  const { t, price, date, country } = useI18n();
  const router = useRouter();
  const { refreshCartCount } = useShop();

  const [step, setStep] = useState<Step>("contact");
  const [contact, setContact] = useState(initialContact);
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressMode, setAddressMode] = useState<"saved" | "new">(defaultAddress ? "saved" : "new");
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? "");
  const [address, setAddress] = useState<AddressDraft>(emptyAddress(country, initialContact.fullName));
  const [saveAddress, setSaveAddress] = useState(true);
  const [delivery, setDelivery] = useState<DeliveryMethodCode>("STANDARD");
  const [payment, setPayment] = useState<PaymentMethodCode>("CARD");
  const [testToken, setTestToken] = useState("tok_test_success");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const [now] = useState(() => Date.now());

  const destination = addressMode === "saved" ? addresses.find((a) => a.id === addressId)?.countryCode : address.countryCode;

  const loadQuote = useCallback(async () => {
    try {
      setQuote(await api<Quote>("/checkout/quote", { body: { countryCode: destination, deliveryMethod: delivery } }));
    } catch {
      /* keep previous quote */
    }
  }, [destination, delivery]);

  useEffect(() => {
    let cancelled = false;
    api<Quote>("/checkout/quote", { body: { countryCode: destination, deliveryMethod: delivery } })
      .then((q) => !cancelled && setQuote(q))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [destination, delivery]);

  const cart = quote?.cart ?? initialCart;
  const stepIndex = STEPS.indexOf(step);

  function validateContact() {
    const errs: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errs["contact.email"] = "validation.email";
    if (contact.fullName.trim().length < 2) errs["contact.fullName"] = "validation.required";
    setFields(errs);
    return !Object.keys(errs).length;
  }

  function validateAddress() {
    if (addressMode === "saved") return !!addressId;
    const errs: Record<string, string> = {};
    for (const k of ["fullName", "line1", "city", "postalCode", "countryCode"] as const) if (!address[k].trim()) errs[`address.${k}`] = "validation.required";
    if (address.postalCode && !/^[A-Za-z0-9 -]{3,10}$/.test(address.postalCode)) errs["address.postalCode"] = "validation.postalCode";
    setFields(errs);
    return !Object.keys(errs).length;
  }

  function next() {
    setError(null);
    if (step === "contact" && !validateContact()) return;
    if (step === "address" && !validateAddress()) return;
    setStep(STEPS[stepIndex + 1]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function placeOrder() {
    if (!acceptTerms) return setFields({ acceptTerms: "validation.acceptTerms" });
    setPlacing(true);
    setError(null);
    try {
      const result = await api<{ status: string; orderNumber: string; redirectUrl?: string }>("/checkout", {
        body: {
          contact: { email: contact.email, fullName: contact.fullName, phone: contact.phone || null },
          ...(addressMode === "saved"
            ? { addressId }
            : { address: { ...address, label: address.label || null, line2: address.line2 || null, region: address.region || null, phone: address.phone || null }, saveAddress }),
          deliveryMethod: delivery,
          paymentMethod: payment,
          // In production this token comes from the provider's SDK (Stripe Elements / wallet sheet).
          paymentToken: testMode ? testToken : undefined,
          idempotencyKey: idempotencyKey.current,
          acceptTerms: true,
        },
      });
      await refreshCartCount();
      if (result.redirectUrl) window.location.assign(result.redirectUrl);
      else router.replace(`/checkout/confirmation/${result.orderNumber}`);
    } catch (e) {
      idempotencyKey.current = crypto.randomUUID(); // a failed attempt must not block a retry
      if (e instanceof ApiClientError) {
        setError(e.message);
        setFields(e.fields ?? {});
        if (e.code === "OUT_OF_STOCK") void loadQuote();
      } else setError("errors.INTERNAL");
    } finally {
      setPlacing(false);
    }
  }

  const selectedAddress = addressMode === "saved" ? addresses.find((a) => a.id === addressId) : null;
  const addressSummary = selectedAddress
    ? `${selectedAddress.fullName}, ${selectedAddress.line1}, ${selectedAddress.postalCode} ${selectedAddress.city}, ${selectedAddress.countryCode}`
    : `${address.fullName}, ${address.line1}, ${address.postalCode} ${address.city}, ${address.countryCode}`;
  const deliveryOption = quote?.deliveryOptions.find((o) => o.method === delivery);
  const eta = (d: number) => date(new Date(now + d * 86_400_000), { day: "numeric", month: "short" });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        <div className="mb-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("checkout.title")}</h1>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s} className={cn("h-1.5 flex-1 rounded-full", i <= stepIndex ? "bg-brand-600" : "bg-surface-sunken")} />
            ))}
          </div>
        </div>
        <FormError message={error} />

        <CheckoutSection current={step} onEdit={setStep} editLabel={t("common.edit")} id="contact" title={t("checkout.steps.contact")} summary={`${contact.fullName} · ${contact.email}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("auth.name")} error={fields["contact.fullName"]} required>
              {(p) => <Input {...p} autoComplete="name" value={contact.fullName} onChange={(e) => setContact({ ...contact, fullName: e.target.value })} />}
            </Field>
            <Field label={t("auth.email")} error={fields["contact.email"]} required hint={t("checkout.emailHint")}>
              {(p) => <Input {...p} type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />}
            </Field>
            <Field label={t("address.phone")} error={fields["contact.phone"]} hint={t("address.phoneHint")}>
              {(p) => <Input {...p} type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />}
            </Field>
          </div>
          <Button className="mt-5" onClick={next}>
            {t("checkout.continue")}
          </Button>
        </CheckoutSection>

        <CheckoutSection current={step} onEdit={setStep} editLabel={t("common.edit")} id="address" title={t("checkout.steps.address")} summary={addressSummary}>
          {addresses.length > 0 && (
            <div className="mb-4 space-y-2">
              {addresses.map((a) => (
                <label key={a.id} className={cn("flex cursor-pointer gap-3 rounded-xl border p-3 text-sm", addressMode === "saved" && addressId === a.id ? "border-brand-500 bg-brand-50/60" : "border-line")}>
                  <input
                    type="radio"
                    name="address"
                    className="mt-1 accent-brand-600"
                    checked={addressMode === "saved" && addressId === a.id}
                    onChange={() => {
                      setAddressMode("saved");
                      setAddressId(a.id);
                    }}
                  />
                  <span>
                    <span className="font-semibold">{a.label ?? a.fullName}</span>
                    <span className="block text-fg-muted">
                      {a.fullName}, {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}, {a.postalCode} {a.city}, {isCountry(a.countryCode) ? COUNTRIES[a.countryCode].name : a.countryCode}
                    </span>
                  </span>
                </label>
              ))}
              <label className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium", addressMode === "new" ? "border-brand-500 bg-brand-50/60" : "border-line")}>
                <input type="radio" name="address" className="accent-brand-600" checked={addressMode === "new"} onChange={() => setAddressMode("new")} />
                {t("checkout.newAddress")}
              </label>
            </div>
          )}
          {addressMode === "new" && (
            <div className="space-y-4">
              <AddressFields value={address} onChange={setAddress} errors={fields} prefix="address." showLabel={false} />
              <Checkbox checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} label={t("checkout.saveAddress")} />
            </div>
          )}
          <Button className="mt-5" onClick={next}>
            {t("checkout.continue")}
          </Button>
        </CheckoutSection>

        <CheckoutSection current={step} onEdit={setStep} editLabel={t("common.edit")} id="delivery" title={t("checkout.steps.delivery")} summary={`${t(`checkout.delivery.${delivery}`)} · ${deliveryOption ? price(deliveryOption.shipping) : ""}`}>
          <div className="space-y-2">
            {(quote?.deliveryOptions ?? []).map((o) => (
              <label key={o.method} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm", delivery === o.method ? "border-brand-500 bg-brand-50/60" : "border-line")}>
                <input type="radio" name="delivery" className="accent-brand-600" checked={delivery === o.method} onChange={() => setDelivery(o.method)} />
                <span className="flex-1">
                  <span className="font-semibold">{t(`checkout.delivery.${o.method}`)}</span>
                  <span className="block text-fg-muted">
                    {t("checkout.arrives", { from: eta(o.deliveryDaysMin), to: eta(o.deliveryDaysMax) })} · {t(`checkout.deliveryHint.${o.method}`)}
                  </span>
                </span>
                <span className="font-semibold tabular">{o.shipping === 0 ? t("cart.free") : price(o.shipping)}</span>
              </label>
            ))}
            {!quote && <div className="skeleton h-20" />}
          </div>
          <Button className="mt-5" onClick={next}>
            {t("checkout.continue")}
          </Button>
        </CheckoutSection>

        <CheckoutSection current={step} onEdit={setStep} editLabel={t("common.edit")} id="payment" title={t("checkout.steps.payment")} summary={t(`checkout.payment.${payment}`)}>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(PAYMENT_ICONS) as PaymentMethodCode[]).map((m) => {
              const Icon = PAYMENT_ICONS[m];
              return (
                <label key={m} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-medium", payment === m ? "border-brand-500 bg-brand-50/60" : "border-line")}>
                  <input type="radio" name="payment" className="accent-brand-600" checked={payment === m} onChange={() => setPayment(m)} />
                  <Icon className="h-5 w-5 text-fg-muted" aria-hidden />
                  {t(`checkout.payment.${m}`)}
                </label>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl bg-surface-muted p-4 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Lock className="h-4 w-4 text-brand-600" aria-hidden /> {t("checkout.paymentSecure")}
            </p>
            <p className="mt-1 text-xs text-fg-muted">{t(`checkout.paymentInfo.${payment}`)}</p>
            {testMode && payment !== "BANK_TRANSFER" && (
              <div className="mt-3 rounded-lg border border-dashed border-sunrise-400 bg-sunrise-50 p-3">
                <p className="text-xs font-semibold text-sunrise-600">{t("checkout.testMode")}</p>
                <select value={testToken} onChange={(e) => setTestToken(e.target.value)} className="mt-2 h-9 w-full rounded-lg border border-line-strong bg-surface px-2 text-sm" aria-label={t("checkout.testScenario")}>
                  <option value="tok_test_success">{t("checkout.testSuccess")}</option>
                  <option value="tok_test_declined">{t("checkout.testDeclined")}</option>
                </select>
              </div>
            )}
          </div>
          <Button className="mt-5" onClick={next}>
            {t("checkout.reviewOrder")}
          </Button>
        </CheckoutSection>

        <CheckoutSection current={step} onEdit={setStep} editLabel={t("common.edit")} id="review" title={t("checkout.steps.review")} summary="">
          <div className="space-y-4">
            {cart.groups.map((g) => (
              <div key={g.sellerId} className="rounded-xl border border-line">
                <p className="border-b border-line px-4 py-2 text-xs font-semibold text-fg-muted">
                  {t("checkout.shippedBy", { seller: g.sellerName })} · {t("checkout.arrives", { from: eta(g.deliveryDaysMin), to: eta(g.deliveryDaysMax) })}
                </p>
                <ul className="divide-y divide-line">
                  {cart.lines
                    .filter((l) => l.seller.id === g.sellerId)
                    .map((l) => (
                      <li key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                          {l.image && <Image src={l.image.url} alt="" fill sizes="48px" className="object-cover" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1">{l.title}</span>
                          <span className="text-xs text-fg-subtle">
                            {l.variantName} · × {l.quantity}
                          </span>
                        </span>
                        <span className="font-semibold tabular">{price(l.lineTotal)}</span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
            <dl className="grid gap-2 rounded-xl bg-surface-muted p-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-fg-subtle">{t("checkout.steps.address")}</dt>
                <dd className="mt-0.5">{addressSummary}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">{t("checkout.steps.delivery")}</dt>
                <dd className="mt-0.5">{t(`checkout.delivery.${delivery}`)}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">{t("checkout.steps.payment")}</dt>
                <dd className="mt-0.5">{t(`checkout.payment.${payment}`)}</dd>
              </div>
            </dl>
            <Checkbox
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              label={
                <>
                  {t("checkout.acceptPrefix")}{" "}
                  <Link href="/legal/terms" target="_blank" className="font-medium text-brand-700 underline">
                    {t("footer.terms")}
                  </Link>
                  . {t("checkout.withdrawalNote")}
                </>
              }
            />
            {fields.acceptTerms && <p className="text-xs text-berry-600">{t(fields.acceptTerms)}</p>}
            <Button size="lg" className="w-full" onClick={placeOrder} loading={placing}>
              <Lock className="h-4 w-4" /> {t("checkout.placeOrder", { total: price(cart.totals.total) })}
            </Button>
          </div>
        </CheckoutSection>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="card space-y-4 p-5">
          <h2 className="text-base font-bold">{t("cart.summary")}</h2>
          <ul className="space-y-3">
            {cart.lines.slice(0, 4).map((l) => (
              <li key={l.id} className="flex items-center gap-3 text-sm">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                  {l.image && <Image src={l.image.url} alt="" fill sizes="48px" className="object-cover" />}
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink-900 px-1 text-[10px] font-bold text-white">{l.quantity}</span>
                </span>
                <span className="line-clamp-2 flex-1 text-xs">{l.title}</span>
                <span className="text-xs font-semibold tabular">{price(l.lineTotal)}</span>
              </li>
            ))}
            {cart.lines.length > 4 && <li className="text-xs text-fg-subtle">{t("checkout.moreItems", { count: cart.lines.length - 4 })}</li>}
          </ul>
          <OrderSummary totals={cart.totals} itemCount={cart.itemCount} shippingLabel={t(`checkout.delivery.${delivery}`)} />
        </div>
      </aside>
    </div>
  );
}

/** Module-level component (never define components inside render — inputs would remount on each keystroke). */
function CheckoutSection({
  id,
  title,
  summary,
  current,
  onEdit,
  editLabel,
  children,
}: {
  id: Step;
  title: string;
  summary: React.ReactNode;
  current: Step;
  onEdit: (step: Step) => void;
  editLabel: string;
  children: React.ReactNode;
}) {
  const i = STEPS.indexOf(id);
  const stepIndex = STEPS.indexOf(current);
  const done = i < stepIndex;
  const active = id === current;
  return (
    <section className={cn("card overflow-hidden", active && "ring-2 ring-brand-500/30")} aria-current={active ? "step" : undefined}>
      <header className="flex items-center gap-3 px-5 py-4">
        <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold", done ? "bg-brand-600 text-white" : active ? "bg-ink-900 text-white" : "bg-surface-sunken text-fg-subtle")}>
          {done ? <Check className="h-4 w-4" /> : i + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={cn("text-base font-semibold", !active && !done && "text-fg-subtle")}>{title}</h2>
          {done && <p className="truncate text-sm text-fg-muted">{summary}</p>}
        </div>
        {done && (
          <button onClick={() => onEdit(id)} className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            <Pencil className="h-3.5 w-3.5" /> {editLabel}
          </button>
        )}
      </header>
      {active && <div className="border-t border-line px-5 py-5">{children}</div>}
    </section>
  );
}
