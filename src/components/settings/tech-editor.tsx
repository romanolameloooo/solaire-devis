"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/primitives";
import { NumInput } from "@/components/ui/num-input";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TECH, type TechSettings } from "@/lib/calc/engine";
import type { Profile } from "@/lib/types";

const FIELDS: { k: keyof TechSettings; label: string; suffix: string; hint: string; min: number; max: number }[] = [
  { k: "psh", label: "Heures de plein soleil par jour", suffix: "h", hint: "5,4 = Dakar en saison la plus faible. Moyenne annuelle au Sénégal : environ 5,8.", min: 1, max: 9 },
  { k: "pr", label: "Rendement global du système", suffix: "%", hint: "Pertes dues à la chaleur, la poussière, les câbles et l'onduleur.", min: 40, max: 100 },
  { k: "dod", label: "Profondeur de décharge batterie", suffix: "%", hint: "Lithium : 90 %. Plomb ou gel : 50 %.", min: 10, max: 100 },
  { k: "eff", label: "Rendement batterie", suffix: "%", hint: "Énergie restituée par rapport à l'énergie stockée.", min: 50, max: 100 },
  { k: "marge", label: "Marge de puissance onduleur", suffix: "%", hint: "Ajoutée à la puissance max pour absorber les démarrages.", min: 0, max: 200 },
  { k: "simult", label: "Appareils allumés en même temps", suffix: "%", hint: "Part de la puissance totale utilisée au même moment.", min: 10, max: 100 },
];

export function TechEditor({ profile }: { profile: Profile }) {
  const [t, setT] = useState<Record<keyof TechSettings, number | null>>({ ...DEFAULT_TECH, ...profile.tech });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    FIELDS.forEach((f) => {
      const v = t[f.k];
      if (v == null || v < f.min || v > f.max) er[f.k] = `Entre ${String(f.min).replace(".", ",")} et ${f.max} ${f.suffix}.`;
    });
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    const { error } = await createClient().from("profiles").update({ tech: t }).eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error("Enregistrement impossible. Réessayez.");
    toast.success("Réglages techniques enregistrés", { description: "Ils s'appliquent à vos prochains devis." });
  }

  return (
    <form onSubmit={save} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <Field key={f.k} label={f.label} hint={f.hint} error={errors[f.k]}>
            <NumInput value={t[f.k]} onChange={(v) => setT({ ...t, [f.k]: v })} suffix={f.suffix} invalid={!!errors[f.k]} />
          </Field>
        ))}
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => setT({ ...DEFAULT_TECH })}><RotateCcw />Valeurs par défaut</Button>
        <Button type="submit" loading={saving} className="w-full sm:w-auto">Enregistrer</Button>
      </div>
    </form>
  );
}
