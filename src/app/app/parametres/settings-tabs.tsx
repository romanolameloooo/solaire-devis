"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { CompanyEditor } from "@/components/settings/company-editor";
import { QuoteSettingsEditor } from "@/components/settings/quote-settings-editor";
import { TechEditor } from "@/components/settings/tech-editor";
import { PlanSummary } from "@/components/app/plan-summary";
import { TeamEditor, type InviteRow } from "@/components/settings/team-editor";
import { cn } from "@/lib/utils";
import type { Access } from "@/lib/billing/access";
import type { Profile, TeamMember } from "@/lib/types";

const OWNER_TABS = [
  { id: "entreprise", label: "Entreprise" },
  { id: "equipe", label: "Équipe" },
  { id: "devis", label: "Devis" },
  { id: "calcul", label: "Calcul" },
  { id: "abonnement", label: "Abonnement" },
] as const;
type Tab = (typeof OWNER_TABS)[number]["id"] | "compte";

export function SettingsTabs({ profile, access, email, initialTab, isOwner, userId, members, invites }: {
  profile: Profile; access: Access; email: string; initialTab?: string;
  isOwner: boolean; userId: string; members: TeamMember[]; invites: InviteRow[];
}) {
  const TABS: readonly { id: Tab; label: string }[] = isOwner ? OWNER_TABS : [{ id: "compte", label: "Mon compte" }];
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === initialTab) ? (initialTab as Tab) : TABS[0].id);

  return (
    <div className="space-y-5">
      <div role="tablist" className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("relative h-11 shrink-0 px-3 text-[14px] font-medium transition-colors duration-150",
              tab === t.id ? "text-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary" : "text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "entreprise" && (
        <Card>
          <CardHeader><CardTitle>Votre entreprise</CardTitle><CardDescription>Ces informations apparaissent en haut de chaque devis PDF.</CardDescription></CardHeader>
          <CardContent><CompanyEditor profile={profile} onSaved={undefined} /></CardContent>
        </Card>
      )}
      {tab === "equipe" && (
        <Card>
          <CardHeader><CardTitle>Équipe</CardTitle><CardDescription>Vos techniciens font les visites, les devis et les signatures sur le terrain. Vous voyez tous les devis de l&apos;entreprise ; chaque technicien voit les siens.</CardDescription></CardHeader>
          <CardContent><TeamEditor members={members} invites={invites} currentUserId={userId} /></CardContent>
        </Card>
      )}
      {tab === "compte" && (
        <Card>
          <CardHeader><CardTitle>Mon compte</CardTitle><CardDescription>Technicien chez {profile.company_name || "votre entreprise"}.</CardDescription></CardHeader>
          <CardContent className="space-y-2 text-[14px]">
            <p><span className="text-muted-foreground">Email :</span> {email}</p>
            <p className="text-[13px] text-muted-foreground">Les prix, les réglages de l&apos;entreprise et l&apos;abonnement sont gérés par le responsable.</p>
          </CardContent>
        </Card>
      )}
      {tab === "devis" && (
        <Card>
          <CardHeader><CardTitle>Réglages des devis</CardTitle><CardDescription>Appliqués aux nouveaux devis.</CardDescription></CardHeader>
          <CardContent><QuoteSettingsEditor profile={profile} /></CardContent>
        </Card>
      )}
      {tab === "calcul" && (
        <Card>
          <CardHeader><CardTitle>Réglages techniques</CardTitle><CardDescription>Valeurs prudentes pour le Sénégal. Modifiez-les selon vos habitudes.</CardDescription></CardHeader>
          <CardContent><TechEditor profile={profile} /></CardContent>
        </Card>
      )}
      {tab === "abonnement" && (
        <Card>
          <CardHeader><CardTitle>Abonnement</CardTitle><CardDescription>Compte : {email}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <PlanSummary access={access} />
            <Button asChild><Link href="/app/abonnement">{access.status === "active" ? "Voir mon abonnement" : "Activer mon abonnement"}</Link></Button>
          </CardContent>
        </Card>
      )}
      <p className="text-[12.5px] text-muted-foreground">
        Mot de passe : <Link href="/reset-password" className="underline">recevoir un lien pour le changer</Link>.
      </p>
    </div>
  );
}
