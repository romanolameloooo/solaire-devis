import { PageHeader } from "@/components/app/page-header";
import { requireProfile } from "@/lib/data";
import { getAccess } from "@/lib/billing/access";
import { SettingsTabs } from "./settings-tabs";
import type { TeamMember } from "@/lib/types";
import type { InviteRow } from "@/components/settings/team-editor";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const { onglet } = await searchParams;
  const { supabase, user, profile, isOwner } = await requireProfile();
  const [{ data: members }, { data: invites }] = isOwner
    ? await Promise.all([
        supabase.from("team_members").select("*").order("created_at"),
        supabase.from("team_invites").select("id, email, created_at, accepted_at").order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  return (
    <>
      <PageHeader title="Paramètres" description={isOwner ? "Entreprise, équipe, devis, calcul et abonnement." : "Votre compte."} />
      <SettingsTabs profile={profile} access={getAccess(profile)} email={user.email ?? ""} initialTab={onglet}
        isOwner={isOwner} userId={user.id} members={(members ?? []) as TeamMember[]} invites={(invites ?? []) as InviteRow[]} />
    </>
  );
}
