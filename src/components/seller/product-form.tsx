"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { api, ApiClientError } from "@/lib/api-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { uploadImage } from "@/lib/upload";
import { parseMajorToMinor } from "@/shared/money";

export interface ProductFormValue {
  id?: string;
  title: string;
  description: string;
  categoryId: string;
  brandName: string;
  condition: "NEW" | "REFURBISHED" | "USED";
  highlights: string[];
  specifications: { label: string; value: string }[];
  images: { url: string; alt: string }[];
  variants: { id?: string; sku: string; name: string; color: string; colorHex: string; size: string; price: string; compareAtPrice: string; stock: string; isActive: boolean }[];
  shippingCost: string;
  freeShipping: boolean;
  deliveryDaysMin: string;
  deliveryDaysMax: string;
}

const blankVariant = (i: number) => ({ sku: `SKU-${Date.now().toString(36).toUpperCase()}-${i}`, name: "Default", color: "", colorHex: "#0f1f1b", size: "", price: "", compareAtPrice: "", stock: "0", isActive: true });

export const emptyProduct = (categoryId: string): ProductFormValue => ({
  title: "",
  description: "",
  categoryId,
  brandName: "",
  condition: "NEW",
  highlights: [""],
  specifications: [{ label: "", value: "" }],
  images: [],
  variants: [blankVariant(1)],
  shippingCost: "3.99",
  freeShipping: false,
  deliveryDaysMin: "3",
  deliveryDaysMax: "7",
});

/**
 * Product editor. Money is typed in major units and converted to integer
 * minor units before hitting the API; the server re-validates everything.
 */
export function ProductForm({ initial, categories }: { initial: ProductFormValue; categories: { id: string; name: string; parentId: string | null }[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const { loading, error, fields, run, setFields } = useFormSubmit();

  const patchVariant = (i: number, patch: Partial<ProductFormValue["variants"][number]>) => setV({ ...v, variants: v.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  async function submit(publish: boolean) {
    const variants = v.variants.map((x) => ({
      id: x.id,
      sku: x.sku.trim(),
      name: x.name.trim() || [x.color, x.size].filter(Boolean).join(" / ") || "Default",
      color: x.color || null,
      colorHex: x.color ? x.colorHex : null,
      size: x.size || null,
      price: parseMajorToMinor(x.price),
      compareAtPrice: x.compareAtPrice ? parseMajorToMinor(x.compareAtPrice) : null,
      stock: Number.parseInt(x.stock || "0", 10),
      isActive: x.isActive,
    }));
    if (variants.some((x) => x.price == null || x.price <= 0)) return setFields({ variants: "validation.price" });
    const body = {
      title: v.title,
      description: v.description,
      categoryId: v.categoryId,
      brandName: v.brandName || null,
      condition: v.condition,
      highlights: v.highlights.map((h) => h.trim()).filter(Boolean),
      specifications: v.specifications.filter((s) => s.label.trim() && s.value.trim()),
      images: v.images.map((img) => ({ ...img, alt: img.alt || v.title })),
      variants,
      shippingCost: parseMajorToMinor(v.shippingCost) ?? 0,
      freeShipping: v.freeShipping,
      deliveryDaysMin: Number(v.deliveryDaysMin),
      deliveryDaysMax: Number(v.deliveryDaysMax),
      publish,
    };
    const res = await run(() => (v.id ? api(`/seller/products/${v.id}`, { method: "PATCH", body }) : api("/seller/products", { body })));
    if (res) {
      toast("success", "common.saved");
      router.push("/seller/products");
      router.refresh();
    }
  }

  const roots = categories.filter((c) => !c.parentId);

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit(true);
      }}
    >
      <FormError message={error} />

      <section className="card space-y-4 p-5">
        <h2 className="text-base font-bold">{t("productForm.basics")}</h2>
        <Field label={t("productForm.title")} error={fields.title} required>
          {(p) => <Input {...p} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={160} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("productForm.category")} error={fields.categoryId} required>
            {(p) => (
              <Select {...p} value={v.categoryId} onChange={(e) => setV({ ...v, categoryId: e.target.value })}>
                {roots.map((r) => (
                  <optgroup key={r.id} label={r.name}>
                    <option value={r.id}>{r.name}</option>
                    {categories
                      .filter((c) => c.parentId === r.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("product.brand")} error={fields.brandName}>
            {(p) => <Input {...p} value={v.brandName} onChange={(e) => setV({ ...v, brandName: e.target.value })} maxLength={60} />}
          </Field>
          <Field label={t("product.conditionLabel")}>
            {(p) => (
              <Select {...p} value={v.condition} onChange={(e) => setV({ ...v, condition: e.target.value as ProductFormValue["condition"] })}>
                {(["NEW", "REFURBISHED", "USED"] as const).map((c) => (
                  <option key={c} value={c}>
                    {t(`product.condition.${c}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label={t("product.description")} error={fields.description} required>
          {(p) => <Textarea {...p} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} rows={6} maxLength={10000} />}
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium">{t("productForm.highlights")}</p>
          <div className="space-y-2">
            {v.highlights.map((h, i) => (
              <div key={i} className="flex gap-2">
                <Input value={h} maxLength={160} aria-label={`${t("productForm.highlights")} ${i + 1}`} onChange={(e) => setV({ ...v, highlights: v.highlights.map((x, j) => (j === i ? e.target.value : x)) })} />
                <Button variant="ghost" size="icon" onClick={() => setV({ ...v, highlights: v.highlights.filter((_, j) => j !== i) })} aria-label={t("common.remove")}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {v.highlights.length < 8 && (
              <Button variant="ghost" size="sm" onClick={() => setV({ ...v, highlights: [...v.highlights, ""] })}>
                <Plus className="h-4 w-4" /> {t("productForm.addHighlight")}
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-base font-bold">{t("productForm.images")}</h2>
          <p className="text-xs text-fg-muted">{t("productForm.imagesHint")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {v.images.map((img, i) => (
            <div key={img.url} className="relative h-24 w-24 overflow-hidden rounded-xl bg-surface-sunken ring-1 ring-line">
              <Image src={img.url} alt={img.alt} fill sizes="96px" className="object-cover" />
              {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-ink-900/80 px-1.5 text-[10px] font-semibold text-white">{t("productForm.cover")}</span>}
              <button type="button" onClick={() => setV({ ...v, images: v.images.filter((_, j) => j !== i) })} className="absolute right-1 top-1 rounded-full bg-ink-900/70 p-1 text-white" aria-label={t("common.remove")}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {v.images.length < 10 && (
            <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line-strong text-fg-subtle hover:border-brand-500 hover:text-brand-600">
              {uploading ? <span className="text-xs">…</span> : <ImagePlus className="h-6 w-6" />}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={async (e) => {
                  const files = [...(e.target.files ?? [])].slice(0, 10 - v.images.length);
                  setUploading(true);
                  const added: { url: string; alt: string }[] = [];
                  for (const file of files) {
                    try {
                      added.push({ url: await uploadImage(file, "product"), alt: v.title });
                    } catch (err) {
                      toast("error", err instanceof ApiClientError ? err.message : "errors.INTERNAL");
                    }
                  }
                  setV((cur) => ({ ...cur, images: [...cur.images, ...added] }));
                  setUploading(false);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        {fields.images && <p className="text-xs text-berry-600">{t(fields.images)}</p>}
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-base font-bold">{t("productForm.variants")}</h2>
          <p className="text-xs text-fg-muted">{t("productForm.variantsHint")}</p>
        </div>
        {fields.variants && <p className="text-xs text-berry-600">{t(fields.variants)}</p>}
        <div className="space-y-3">
          {v.variants.map((x, i) => (
            <div key={x.id ?? i} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-4 lg:grid-cols-8">
              <Input className="lg:col-span-2" value={x.sku} onChange={(e) => patchVariant(i, { sku: e.target.value })} placeholder="SKU" aria-label="SKU" />
              <Input value={x.color} onChange={(e) => patchVariant(i, { color: e.target.value })} placeholder={t("product.color")} aria-label={t("product.color")} />
              <input type="color" value={x.colorHex} onChange={(e) => patchVariant(i, { colorHex: e.target.value })} className="h-11 w-full rounded-xl border border-line-strong" aria-label={t("productForm.colorSwatch")} />
              <Input value={x.size} onChange={(e) => patchVariant(i, { size: e.target.value })} placeholder={t("product.size")} aria-label={t("product.size")} />
              <Input inputMode="decimal" value={x.price} onChange={(e) => patchVariant(i, { price: e.target.value })} placeholder={t("productForm.price")} aria-label={t("productForm.price")} />
              <Input inputMode="decimal" value={x.compareAtPrice} onChange={(e) => patchVariant(i, { compareAtPrice: e.target.value })} placeholder={t("productForm.compareAt")} aria-label={t("productForm.compareAt")} />
              <div className="flex gap-2">
                <Input inputMode="numeric" value={x.stock} onChange={(e) => patchVariant(i, { stock: e.target.value.replace(/\D/g, "") })} placeholder={t("seller.table.stock")} aria-label={t("seller.table.stock")} />
                {v.variants.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setV({ ...v, variants: v.variants.filter((_, j) => j !== i) })} aria-label={t("common.remove")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setV({ ...v, variants: [...v.variants, blankVariant(v.variants.length + 1)] })}>
            <Plus className="h-4 w-4" /> {t("productForm.addVariant")}
          </Button>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-base font-bold">{t("product.specifications")}</h2>
        {v.specifications.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
            <Input value={s.label} placeholder={t("productForm.specLabel")} aria-label={t("productForm.specLabel")} onChange={(e) => setV({ ...v, specifications: v.specifications.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
            <Input value={s.value} placeholder={t("productForm.specValue")} aria-label={t("productForm.specValue")} onChange={(e) => setV({ ...v, specifications: v.specifications.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
            <Button variant="ghost" size="icon" onClick={() => setV({ ...v, specifications: v.specifications.filter((_, j) => j !== i) })} aria-label={t("common.remove")}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setV({ ...v, specifications: [...v.specifications, { label: "", value: "" }] })}>
          <Plus className="h-4 w-4" /> {t("productForm.addSpec")}
        </Button>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-base font-bold">{t("productForm.shipping")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("productForm.shippingCost")} error={fields.shippingCost}>
            {(p) => <Input {...p} inputMode="decimal" value={v.shippingCost} disabled={v.freeShipping} onChange={(e) => setV({ ...v, shippingCost: e.target.value })} />}
          </Field>
          <Field label={t("productForm.deliveryMin")} error={fields.deliveryDaysMin}>
            {(p) => <Input {...p} inputMode="numeric" value={v.deliveryDaysMin} onChange={(e) => setV({ ...v, deliveryDaysMin: e.target.value.replace(/\D/g, "") })} />}
          </Field>
          <Field label={t("productForm.deliveryMax")} error={fields.deliveryDaysMax}>
            {(p) => <Input {...p} inputMode="numeric" value={v.deliveryDaysMax} onChange={(e) => setV({ ...v, deliveryDaysMax: e.target.value.replace(/\D/g, "") })} />}
          </Field>
        </div>
        <Checkbox checked={v.freeShipping} onChange={(e) => setV({ ...v, freeShipping: e.target.checked })} label={t("product.freeShipping")} />
      </section>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-line bg-surface/95 p-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <Button variant="outline" onClick={() => submit(false)} loading={loading}>
          {t("productForm.saveDraft")}
        </Button>
        <Button type="submit" loading={loading}>
          {t("productForm.publish")}
        </Button>
      </div>
    </form>
  );
}
