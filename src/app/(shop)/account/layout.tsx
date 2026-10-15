import { requireUser } from "@/server/auth/guards";
import { AccountNav } from "@/components/account/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/account");
  return (
    <div className="container-page grid gap-6 py-6 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-40 lg:self-start">
        <AccountNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
