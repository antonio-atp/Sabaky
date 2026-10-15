"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, FormError } from "@/components/ui/form";
import { Badge, EmptyState } from "@/components/ui/misc";
import { AddressFields, emptyAddress, type AddressDraft } from "./address-fields";

export interface SavedAddress extends AddressDraft {
  id: string;
  isDefault: boolean;
}

export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const { t, country } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);
  const [draft, setDraft] = useState<AddressDraft>(emptyAddress(country));
  const [isDefault, setIsDefault] = useState(false);
  const { loading, error, fields, run } = useFormSubmit();

  function open(target: SavedAddress | "new") {
    setEditing(target);
    setDraft(target === "new" ? emptyAddress(country) : target);
    setIsDefault(target !== "new" && target.isDefault);
  }

  async function save() {
    const body = { ...draft, label: draft.label || null, line2: draft.line2 || null, region: draft.region || null, phone: draft.phone || null, isDefault };
    const ok = await run(() => (editing === "new" ? api("/account/addresses", { body }) : api(`/account/addresses/${(editing as SavedAddress).id}`, { method: "PATCH", body })));
    if (ok) {
      toast("success", "common.saved");
      setEditing(null);
      router.refresh();
    }
  }

  async function remove(a: SavedAddress) {
    if (!confirm(t("address.confirmDelete"))) return;
    await api(`/account/addresses/${a.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => open("new")}>
        <Plus className="h-4 w-4" /> {t("address.add")}
      </Button>
      {addresses.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="card flex flex-col p-5 text-sm">
              <div className="mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-600" aria-hidden />
                <span className="font-semibold">{a.label || a.fullName}</span>
                {a.isDefault && (
                  <Badge tone="brand">
                    <Star className="h-3 w-3" aria-hidden /> {t("address.default")}
                  </Badge>
                )}
              </div>
              <address className="flex-1 not-italic leading-relaxed text-fg-muted">
                {a.fullName}
                <br />
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.postalCode} {a.city} {a.region ? `, ${a.region}` : ""} · {a.countryCode}
                {a.phone && (
                  <>
                    <br />
                    {a.phone}
                  </>
                )}
              </address>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => open(a)}>
                  <Pencil className="h-3.5 w-3.5" /> {t("common.edit")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(a)}>
                  <Trash2 className="h-3.5 w-3.5" /> {t("common.remove")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<MapPin className="h-6 w-6" />} title={t("address.none")} />
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? t("address.add") : t("address.edit")}>
        <div className="space-y-4">
          <FormError message={error} />
          <AddressFields value={draft} onChange={setDraft} errors={fields} />
          <Checkbox checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} label={t("address.makeDefault")} />
          <Button className="w-full" loading={loading} onClick={save}>
            {t("common.save")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
