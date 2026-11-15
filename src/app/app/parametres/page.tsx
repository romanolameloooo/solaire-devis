import { PageHeader } from "@/components/app/page-header";
import { requireProfile } from "@/lib/data";
import { getAccess } from "@/lib/billing/access";
import { SettingsTabs } from "./settings-tabs";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const { onglet } = await searchParams;
  const { user, profile } = await requireProfile();
  return (
    <>
      <PageHeader title="Paramètres" description="Entreprise, devis, calcul et abonnement." />
      <SettingsTabs profile={profile} access={getAccess(profile)} email={user.email ?? ""} initialTab={onglet} />
    </>
  );
}
