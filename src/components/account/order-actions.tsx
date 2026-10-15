"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";

export function CancelOrderButton({ number }: { number: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { loading, error, run } = useFormSubmit();
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t("orders.cancel")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("orders.cancelTitle")}>
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">{t("orders.cancelText")}</p>
          <FormError message={error} />
          <Field label={t("orders.reasonOptional")}>{(p) => <Textarea {...p} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />}</Field>
          <Button
            variant="danger"
            className="w-full"
            loading={loading}
            onClick={async () => {
              if (await run(() => api(`/orders/${number}/cancel`, { body: { reason } }))) {
                toast("success", "orders.cancelled");
                setOpen(false);
                router.refresh();
              }
            }}
          >
            {t("orders.confirmCancel")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function ReturnItemButton({ number, item }: { number: string; item: { id: string; title: string; quantity: number } }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ reason: "damaged", quantity: 1, details: "" });
  const { loading, error, fields, run } = useFormSubmit();
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {t("orders.return")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("orders.returnTitle")}>
        <div className="space-y-4">
          <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
          <FormError message={error} />
          <Field label={t("orders.returnReason")} error={fields.reason}>
            {(p) => (
              <Select {...p} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                {["damaged", "wrong_item", "not_as_described", "no_longer_needed", "other"].map((r) => (
                  <option key={r} value={r}>
                    {t(`orders.returnReasons.${r}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("orders.quantity")} error={fields.quantity}>
            {(p) => <Input {...p} type="number" min={1} max={item.quantity} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, Math.min(item.quantity, Number(e.target.value))) })} />}
          </Field>
          <Field label={t("orders.details")} error={fields.details}>
            {(p) => <Textarea {...p} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} maxLength={1000} rows={3} />}
          </Field>
          <p className="text-xs text-fg-subtle">{t("orders.returnPolicy")}</p>
          <Button
            className="w-full"
            loading={loading}
            onClick={async () => {
              if (await run(() => api(`/orders/${number}/returns`, { body: { orderItemId: item.id, ...form } }))) {
                toast("success", "orders.returnRequested");
                setOpen(false);
                router.refresh();
              }
            }}
          >
            {t("orders.submitReturn")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function DisputeButton({ number }: { number: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ reason: "not_received", details: "" });
  const { loading, error, fields, run } = useFormSubmit();
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {t("orders.problem")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("orders.disputeTitle")}>
        <div className="space-y-4">
          <FormError message={error} />
          <Field label={t("orders.returnReason")}>
            {(p) => (
              <Select {...p} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                {["not_received", "not_as_described", "refund_issue", "other"].map((r) => (
                  <option key={r} value={r}>
                    {t(`orders.disputeReasons.${r}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("orders.details")} error={fields.details} required>
            {(p) => <Textarea {...p} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} minLength={10} maxLength={2000} rows={4} />}
          </Field>
          <Button
            className="w-full"
            loading={loading}
            onClick={async () => {
              if (await run(() => api(`/orders/${number}/disputes`, { body: form }))) {
                toast("success", "orders.disputeOpened");
                setOpen(false);
              }
            }}
          >
            {t("orders.submitDispute")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
