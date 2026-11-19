import Link from "next/link";
import { Check, ExternalLink, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Notice } from "@/components/ui/primitives";
import { PageHeader } from "@/components/app/page-header";
import { PlanSummary } from "@/components/app/plan-summary";
import { requireProfile } from "@/lib/data";
import { getAccess } from "@/lib/billing/access";
import { getPaymentProvider } from "@/lib/billing/provider";
import { PRICE_LABEL, SUPPORT_WHATSAPP } from "@/lib/env";
import { whatsappLink } from "@/lib/format";

export const metadata = { title: "Abonnement" };

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ bloque?: string }> }) {
  const { bloque } = await searchParams;
  const { user, profile, isOwner } = await requireProfile();
  const access = getAccess(profile);
  if (!isOwner) {
    return (
      <>
        <PageHeader title="Abonnement" />
        <Card><CardContent className="space-y-4">
          <PlanSummary access={access} />
          <p className="text-[14.5px] text-muted-foreground">L&apos;abonnement de {profile.company_name || "votre entreprise"} est géré par son responsable. {access.status === "expired" ? "Prévenez-le pour qu'il le réactive : en attendant, vous pouvez consulter vos devis mais pas en créer de nouveaux." : ""}</p>
          <Button asChild variant="outline"><Link href="/app">Retour à mes devis</Link></Button>
        </CardContent></Card>
      </>
    );
  }
  const checkout = await getPaymentProvider().getCheckoutUrl({ userId: profile.id, email: user.email ?? null, companyName: profile.company_name });
  const support = SUPPORT_WHATSAPP
    ? whatsappLink(SUPPORT_WHATSAPP, `Bonjour, j'ai payé mon abonnement SolaDevis. Mon compte : ${user.email}`)
    : null;

  return (
    <>
      <PageHeader title={access.status === "active" ? "Mon abonnement" : "Activer mon abonnement"} />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {(bloque || access.status === "expired") && access.status !== "active" && (
            <Notice icon={<Lock />}>
              {access.status === "expired"
                ? "Votre période d'essai est terminée. La création de nouveaux devis est bloquée, mais vous pouvez toujours consulter, modifier et télécharger vos devis existants."
                : "Activez votre abonnement pour continuer."}
            </Notice>
          )}
          <Card><CardContent className="space-y-4">
            <PlanSummary access={access} />
            {access.status !== "active" && (
              <ol className="space-y-3 text-[14.5px]">
                <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-bold text-primary">1</span>Payez votre abonnement avec le lien ci-dessous.</li>
                <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-bold text-primary">2</span>Dans le champ « Email de votre compte SolaDevis », indiquez <strong className="font-semibold">{user.email}</strong>.</li>
                <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-bold text-primary">3</span>Votre abonnement est activé sous 24 h. Vos devis existants restent accessibles en attendant.</li>
              </ol>
            )}
          </CardContent></Card>
        </div>

        <Card className="h-fit"><CardContent>
          <p className="text-[13px] font-medium text-muted-foreground">SolaDevis Pro</p>
          <p className="mt-1 text-3xl font-bold tracking-tight tabular">{PRICE_LABEL}</p>
          <ul className="mt-5 space-y-2.5 text-[14px]">
            {["Devis illimités", "PDF avec votre logo", "Catalogue de prix personnel", "Envoi par WhatsApp"].map((t) => (
              <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{t}</li>
            ))}
          </ul>
          {access.status !== "active" && (
            checkout ? (
              <Button asChild size="lg" className="mt-6 w-full"><a href={checkout} target="_blank" rel="noopener noreferrer">Payer mon abonnement <ExternalLink /></a></Button>
            ) : (
              <p className="mt-6 rounded-lg bg-muted px-3 py-2.5 text-[13px] text-muted-foreground">Le lien de paiement n&apos;est pas encore configuré. Contactez-nous pour activer votre compte.</p>
            )
          )}
          {support && (
            <Button asChild variant="outline" className="mt-2 w-full"><a href={support} target="_blank" rel="noopener noreferrer">J&apos;ai payé : prévenir sur WhatsApp</a></Button>
          )}
          <Button asChild variant="ghost" className="mt-2 w-full"><Link href="/app">Retour à mes devis</Link></Button>
        </CardContent></Card>
      </div>
    </>
  );
}
