"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Star, X } from "lucide-react";
import Image from "next/image";
import { useI18n } from "@/i18n/client";
import { api, ApiClientError } from "@/lib/api-client";
import { uploadImage } from "@/lib/upload";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId, productTitle }: { productId: string; productTitle: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setFields({ rating: "validation.required" });
    setBusy(true);
    setError(null);
    try {
      await api(`/products/${productId}/reviews`, { body: { rating, title, body, images } });
      toast("success", "reviews.thanks");
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFields(err.fields ?? {});
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {t("reviews.write")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("reviews.writeFor", { title: productTitle.slice(0, 40) })}>
        <form onSubmit={submit} className="space-y-4">
          <FormError message={error} />
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("reviews.yourRating")}</p>
            <div className="flex gap-1" role="radiogroup" aria-label={t("reviews.yourRating")}>
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i}`} onClick={() => setRating(i)}>
                  <Star className={cn("h-8 w-8 transition", i <= rating ? "fill-sunrise-400 text-sunrise-400" : "text-line-strong")} />
                </button>
              ))}
            </div>
            {fields.rating && <p className="mt-1 text-xs text-berry-600">{t(fields.rating)}</p>}
          </div>
          <Field label={t("reviews.headline")} error={fields.title}>
            {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />}
          </Field>
          <Field label={t("reviews.body")} error={fields.body} required>
            {(p) => <Textarea {...p} value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000} required minLength={10} />}
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("reviews.photos")}</p>
            <div className="flex flex-wrap gap-2">
              {images.map((url) => (
                <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg">
                  <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                  <button type="button" onClick={() => setImages(images.filter((x) => x !== url))} className="absolute right-0.5 top-0.5 rounded-full bg-ink-900/70 p-0.5 text-white" aria-label={t("common.remove")}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 6 && (
                <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-line-strong text-fg-subtle hover:border-brand-500 hover:text-brand-600">
                  <ImagePlus className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setImages([...images, await uploadImage(file, "review")]);
                      } catch (err) {
                        toast("error", err instanceof ApiClientError ? err.message : "errors.INTERNAL");
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>
          <Button type="submit" className="w-full" loading={busy}>
            {t("reviews.submit")}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
