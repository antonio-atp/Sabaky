import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/session";
import { listUsers } from "@/server/services/admin";
import { DataTable, FilterTabs, PageHeader, Td } from "@/components/dashboard/data-table";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { qs } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.nav.users"), robots: { index: false } };
}

const ROLES = ["CUSTOMER", "SELLER", "ADMIN"] as const;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string }> }) {
  const sp = await searchParams;
  const role = ROLES.includes(sp.role as (typeof ROLES)[number]) ? sp.role : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { t, date } = await getI18n();
  const me = await getCurrentUser();
  const users = await listUsers({ q: sp.q?.slice(0, 80), role, page });

  return (
    <div>
      <PageHeader title={t("admin.nav.users")} subtitle={t("admin.totalCount", { count: users.total })} />
      <form className="mb-3">
        <input name="q" defaultValue={sp.q} placeholder={t("admin.searchUsers")} className="h-10 w-full max-w-sm rounded-xl border border-line-strong bg-surface px-3.5 text-sm" />
      </form>
      <FilterTabs active={role ?? "all"} items={[{ key: "all", label: t("common.all"), href: "/admin/users" }, ...ROLES.map((r) => ({ key: r, label: t(`roles.${r}`), href: `/admin/users?role=${r}` }))]} />
      <DataTable head={[t("admin.table.user"), t("admin.table.roles"), t("admin.table.status"), t("admin.table.orders"), t("admin.table.joined"), t("admin.table.lastLogin"), ""]}>
        {users.items.map((u) => (
          <tr key={u.id}>
            <Td>
              <p className="font-medium">{u.name}</p>
              <p className="text-xs text-fg-muted">
                {u.email} {!u.emailVerifiedAt && <span className="text-sunrise-600">· {t("admin.unverified")}</span>}
              </p>
            </Td>
            <Td>
              <div className="flex flex-wrap gap-1">
                {u.roles.map((r) => (
                  <Badge key={r} tone={r === "ADMIN" ? "dark" : r === "SELLER" ? "brand" : "neutral"}>
                    {t(`roles.${r}`)}
                  </Badge>
                ))}
              </div>
            </Td>
            <Td>
              <Badge tone={u.status === "ACTIVE" ? "success" : u.status === "SUSPENDED" ? "danger" : "neutral"}>{t(`userStatus.${u.status}`)}</Badge>
            </Td>
            <Td className="tabular">{u._count.orders}</Td>
            <Td className="text-xs text-fg-muted">{date(u.createdAt)}</Td>
            <Td className="text-xs text-fg-muted">{u.lastLoginAt ? date(u.lastLoginAt) : "—"}</Td>
            <Td>
              {u.id !== me?.id && u.status !== "DELETED" && (
                <div className="flex justify-end gap-1">
                  {u.status === "ACTIVE" ? (
                    <ActionButton endpoint={`/admin/users/${u.id}`} body={{ action: "suspend" }} label={t("admin.suspend")} variant="danger" notePrompt={t("admin.reasonPrompt")} noteField="reason" />
                  ) : (
                    <ActionButton endpoint={`/admin/users/${u.id}`} body={{ action: "reactivate", reason: null }} label={t("admin.reactivate")} />
                  )}
                  <ActionButton endpoint={`/admin/users/${u.id}`} body={{ action: "force_logout", reason: null }} label={t("admin.forceLogout")} variant="ghost" />
                </div>
              )}
            </Td>
          </tr>
        ))}
      </DataTable>
      <div className="mt-5">
        <Pagination page={page} pageCount={users.pageCount} hrefFor={(p) => `/admin/users${qs({ q: sp.q, role, page: p })}`} labels={{ previous: t("common.previous"), next: t("common.next"), page: t("common.pagination") }} />
      </div>
    </div>
  );
}
