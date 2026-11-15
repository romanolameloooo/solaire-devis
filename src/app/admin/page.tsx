import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";
import { getAccess } from "@/lib/billing/access";
import type { Profile } from "@/lib/types";
import { AdminTable, type AdminRow } from "./admin-table";

export const metadata = { title: "Administration", robots: { index: false } };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) notFound();

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Brand href="/app" />
        <h1 className="mt-8 text-2xl font-bold tracking-tight">Administration</h1>
        <p className="mt-3 text-[15px] text-muted-foreground">
          La clé <code className="rounded bg-muted px-1.5 py-0.5 text-[13px]">SUPABASE_SERVICE_ROLE_KEY</code> n&apos;est pas configurée.
          Ajoutez-la dans <code className="rounded bg-muted px-1.5 py-0.5 text-[13px]">.env.local</code> (ou dans Netlify), puis redémarrez le site.
          Voir l&apos;étape 4 du README.
        </p>
      </main>
    );
  }

  const db = createAdminClient();
  const [{ data: profiles }, { data: quotes }] = await Promise.all([
    db.from("profiles").select("id, email, company_name, phone, plan, trial_ends_at, subscription_ends_at, created_at, onboarded").order("created_at", { ascending: false }),
    db.from("quotes").select("user_id"),
  ]);
  const counts = new Map<string, number>();
  (quotes ?? []).forEach((q: { user_id: string }) => counts.set(q.user_id, (counts.get(q.user_id) ?? 0) + 1));

  const rows: AdminRow[] = ((profiles ?? []) as Profile[]).map((p) => ({
    id: p.id, email: p.email ?? "", company: p.company_name, phone: p.phone, createdAt: p.created_at,
    plan: p.plan, access: getAccess(p), quotes: counts.get(p.id) ?? 0, onboarded: p.onboarded,
  }));
  const stats = {
    total: rows.length,
    trial: rows.filter((r) => r.access.status === "trial").length,
    active: rows.filter((r) => r.access.status === "active").length,
    expired: rows.filter((r) => r.access.status === "expired").length,
  };

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Brand href="/app" />
          <Link href="/app" className="inline-flex items-center gap-1.5 text-[13.5px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Retour à l&apos;app</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="mt-1 text-[14.5px] text-muted-foreground">Comptes installateurs et abonnements.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[["Comptes", stats.total], ["En essai", stats.trial], ["Actifs", stats.active], ["Expirés", stats.expired]].map(([l, v]) => (
            <div key={l} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <p className="text-[12.5px] text-muted-foreground">{l}</p>
              <p className="mt-1 text-2xl font-bold tabular">{v}</p>
            </div>
          ))}
        </div>
        <AdminTable rows={rows} />
      </main>
    </div>
  );
}
