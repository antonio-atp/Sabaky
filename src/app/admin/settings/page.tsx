import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { getPlatformSettings } from "@/server/services/settings";
import { flatCategories } from "@/server/services/catalog";
import { PageHeader } from "@/components/dashboard/data-table";
import { PlatformSettingsForm } from "@/components/admin/settings-form";
import { CategoryIcon } from "@/components/product/category-icon";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.nav.settings"), robots: { index: false } };
}

export default async function AdminSettingsPage() {
  const { t, locale } = await getI18n();
  const [settings, categories] = await Promise.all([getPlatformSettings(), flatCategories(locale)]);
  const roots = categories.filter((c) => !c.parentId);
  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.nav.settings")} />
      <PlatformSettingsForm initial={settings} />
      <section>
        <h2 className="mb-3 text-lg font-bold">{t("admin.categoryTree")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roots.map((r) => (
            <div key={r.id} className="card p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <CategoryIcon name={r.icon} className="h-4 w-4 text-brand-600" /> {r.name}
                <span className="ml-auto font-mono text-xs text-fg-subtle">/{r.slug}</span>
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-fg-muted">
                {categories
                  .filter((c) => c.parentId === r.id)
                  .map((c) => (
                    <li key={c.id}>
                      {c.name} <span className="font-mono text-fg-subtle">/{c.slug}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
