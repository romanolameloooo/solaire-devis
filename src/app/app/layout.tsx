import type { Metadata } from "next";
import { requireProfile } from "@/lib/data";
import { getAccess } from "@/lib/billing/access";
import { isAdminEmail } from "@/lib/supabase/admin";
import { logoPublicUrl } from "@/lib/env";
import { AppShell } from "@/components/app/app-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile, isOwner } = await requireProfile();
  const access = getAccess(profile);
  const { count: unread } = isOwner
    ? await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)
    : { count: 0 };
  return (
    <AppShell
      company={profile.company_name || "Mon entreprise"}
      email={user.email ?? ""}
      logoUrl={logoPublicUrl(profile.logo_path)}
      access={access}
      isAdmin={isAdminEmail(user.email)}
      isOwner={isOwner}
      unread={unread ?? 0}
    >
      {children}
    </AppShell>
  );
}
