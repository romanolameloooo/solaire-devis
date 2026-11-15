"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/primitives";
import { CompanyEditor } from "@/components/settings/company-editor";
import { CatalogEditor } from "@/components/settings/catalog-editor";
import { QuoteSettingsEditor } from "@/components/settings/quote-settings-editor";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CatalogItem, Profile } from "@/lib/types";

const STEPS = [
  { title: "Votre entreprise", desc: "Ces informations apparaissent en haut de chaque devis." },
  { title: "Vos prix", desc: "Saisissez vos prix de vente. Rien n'est pré-rempli : ce sont vos prix, pas les nôtres." },
  { title: "Vos devis", desc: "TVA, durée de validité et conditions imprimées sur le devis." },
];

export function OnboardingFlow({ profile: initial, items }: { profile: Profile; items: CatalogItem[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(initial);

  const next = () => { setStep((s) => s + 1); window.scrollTo({ top: 0 }); };
  const back = (
    <Button type="button" variant="ghost" onClick={() => { setStep((s) => s - 1); window.scrollTo({ top: 0 }); }} className="w-full sm:w-auto">Retour</Button>
  );

  async function finish() {
    const { error } = await createClient().from("profiles").update({ onboarded: true }).eq("id", profile.id);
    if (error) return toast.error("Impossible de terminer. Réessayez.");
    toast.success("Votre compte est prêt", { description: "Créez votre premier devis." });
    router.replace("/app/devis/nouveau");
    router.refresh();
  }

  return (
    <div className="min-h-dvh pb-16">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Brand href="/onboarding" />
          <span className="text-[13px] text-muted-foreground">Étape {step + 1} sur 3</span>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-2">
              <span className={cn("h-1.5 rounded-full transition-colors duration-300 ease-out", i <= step ? "bg-primary" : "bg-border")} />
              <span className={cn("flex items-center gap-1.5 text-[12.5px] font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>
                {i < step && <Check className="size-3.5 text-primary" />}
                <span className="truncate">{s.title}</span>
              </span>
            </li>
          ))}
        </ol>
        <div key={step} className="sd-step">
        <h1 className="mt-8 text-2xl font-bold tracking-tight">{STEPS[step].title}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{STEPS[step].desc}</p>

        <div className="mt-6">
          {step === 0 && (
            <Card><CardContent>
              <CompanyEditor profile={profile} submitLabel="Continuer" onSaved={(p) => { setProfile({ ...profile, ...p }); next(); }} />
            </CardContent></Card>
          )}
          {step === 1 && (
            <CatalogEditor profile={profile} items={items} submitLabel="Continuer" onSaved={() => { router.refresh(); next(); }} footerExtra={back} />
          )}
          {step === 2 && (
            <Card><CardContent>
              <QuoteSettingsEditor profile={profile} submitLabel="Terminer" onSaved={finish} footerExtra={back} />
            </CardContent></Card>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
