"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/primitives";
import { NumInput } from "@/components/ui/num-input";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function QuoteSettingsEditor({ profile, submitLabel = "Enregistrer", onSaved, footerExtra }: {
  profile: Profile; submitLabel?: string; onSaved?: () => void; footerExtra?: React.ReactNode;
}) {
  const [tva, setTva] = useState<number | null>(profile.tva);
  const [validite, setValidite] = useState<number | null>(profile.validite_jours);
  const [conditions, setConditions] = useState(profile.conditions);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (tva == null || tva < 0 || tva > 100) er.tva = "Entre 0 et 100 %.";
    if (validite == null || validite < 1 || !Number.isInteger(validite)) er.validite = "Nombre de jours entier, au moins 1.";
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    const { error } = await createClient().from("profiles").update({ tva, validite_jours: validite, conditions: conditions.trim() }).eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error("Enregistrement impossible. Réessayez.");
    if (!onSaved) toast.success("Réglages enregistrés");
    onSaved?.();
  }

  return (
    <form onSubmit={save} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="TVA" error={errors.tva} hint="18 % au Sénégal. Mettez 0 si vous n'êtes pas assujetti.">
          <NumInput value={tva} onChange={setTva} suffix="%" invalid={!!errors.tva} />
        </Field>
        <Field label="Validité du devis" error={errors.validite} hint="Date limite imprimée sur le devis.">
          <NumInput value={validite} onChange={setValidite} suffix="jours" invalid={!!errors.validite} />
        </Field>
        <Field label="Conditions affichées sur le devis" className="sm:col-span-2" hint="Acompte, délais, garantie…">
          <Textarea value={conditions} onChange={(e) => setConditions(e.target.value)} rows={4} />
        </Field>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {footerExtra}
        <Button type="submit" loading={saving} className="w-full sm:w-auto">{submitLabel}</Button>
      </div>
    </form>
  );
}
