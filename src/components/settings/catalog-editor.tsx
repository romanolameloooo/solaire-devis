"use client";
import { useMemo, useState } from "react";
import { AlertCircle, BatteryCharging, Plus, PlugZap, SunMedium, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Field, Input, Notice } from "@/components/ui/primitives";
import { NumInput } from "@/components/ui/num-input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CatalogItem, CatalogType, Profile } from "@/lib/types";

type Row = Omit<CatalogItem, "user_id" | "id"> & { id: string; isNew?: boolean };
type ForfaitFields = Pick<Profile, "structure_par_panneau" | "cables_par_kwc" | "pose_par_kwc" | "transport">;

const SECTIONS: { type: CatalogType; title: string; desc: string; unit: string; powerLabel: string; placeholder: string; icon: React.ReactNode }[] = [
  { type: "panel", title: "Panneaux", desc: "Le panneau choisi dans un devis donne le nombre de modules.", unit: "Wc", powerLabel: "Puissance", placeholder: "Ex : Panneau 550 Wc", icon: <SunMedium /> },
  { type: "inverter", title: "Onduleurs", desc: "Mettez toutes les tailles que vous vendez : la bonne est choisie automatiquement.", unit: "kW", powerLabel: "Puissance", placeholder: "Ex : Onduleur hybride 5 kW", icon: <PlugZap /> },
  { type: "battery", title: "Batteries", desc: "La batterie est choisie dans chaque devis.", unit: "kWh", powerLabel: "Capacité", placeholder: "Ex : Batterie lithium 5 kWh", icon: <BatteryCharging /> },
];

let tmp = 0;

function omit<T extends object, K extends keyof T>(o: T, ...keys: K[]): Omit<T, K> {
  const c = { ...o };
  keys.forEach((k) => delete c[k]);
  return c;
}

export function CatalogEditor({ profile, items, submitLabel = "Enregistrer le catalogue", onSaved, footerExtra }: {
  profile: Profile;
  items: CatalogItem[];
  submitLabel?: string;
  onSaved?: () => void;
  footerExtra?: React.ReactNode;
}) {
  const [rows, setRows] = useState<Row[]>(() => items.map((i) => omit(i, "user_id")));
  const [initialIds] = useState(() => new Set(items.map((i) => i.id)));
  const [forfaits, setForfaits] = useState<ForfaitFields>({
    structure_par_panneau: profile.structure_par_panneau, cables_par_kwc: profile.cables_par_kwc,
    pose_par_kwc: profile.pose_par_kwc, transport: profile.transport,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const missing = useMemo(() => rows.filter((r) => r.price == null).length, [rows]);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
    setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[`${id}.${k}`]); return n; });
  };
  const add = (type: CatalogType) => {
    const pos = Math.max(-1, ...rows.filter((r) => r.type === type).map((r) => r.position)) + 1;
    setRows((rs) => [...rs, { id: `new-${tmp++}`, isNew: true, type, model: "", power: null, price: null, position: pos }]);
    setDirty(true);
  };
  const remove = (id: string, type: CatalogType) => {
    if (type !== "battery" && rows.filter((r) => r.type === type).length <= 1) {
      return toast.error(type === "panel" ? "Gardez au moins un panneau." : "Gardez au moins un onduleur.");
    }
    setRows((rs) => rs.filter((r) => r.id !== id));
    setDirty(true);
  };
  const setF = (k: keyof ForfaitFields) => (v: number | null) => { setForfaits({ ...forfaits, [k]: v }); setDirty(true); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    for (const r of rows) {
      if (!r.model.trim()) er[`${r.id}.model`] = "Nom du modèle obligatoire.";
      if (!(r.power && r.power > 0)) er[`${r.id}.power`] = "Valeur obligatoire.";
      if (r.price != null && r.price < 0) er[`${r.id}.price`] = "Prix invalide.";
    }
    setErrors(er);
    if (Object.keys(er).length) {
      toast.error("Quelques champs sont à compléter.");
      document.querySelector("[aria-invalid=true]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    try {
      const keep = new Set(rows.filter((r) => !r.isNew).map((r) => r.id));
      const toDelete = [...initialIds].filter((id) => !keep.has(id));
      if (toDelete.length) {
        const { error } = await supabase.from("catalog_items").delete().in("id", toDelete);
        if (error) throw error;
      }
      const existing = rows.filter((r) => !r.isNew).map((r) => ({ ...omit(r, "isNew"), model: r.model.trim(), user_id: profile.id }));
      if (existing.length) {
        const { error } = await supabase.from("catalog_items").upsert(existing);
        if (error) throw error;
      }
      const created = rows.filter((r) => r.isNew).map((r) => ({ ...omit(r, "isNew", "id"), model: r.model.trim(), user_id: profile.id }));
      if (created.length) {
        const { data, error } = await supabase.from("catalog_items").insert(created).select("*");
        if (error) throw error;
        // Remplace les identifiants temporaires
        const newOnes = (data as CatalogItem[]).map((i) => omit(i, "user_id"));
        setRows((rs) => [...rs.filter((r) => !r.isNew), ...newOnes]);
        newOnes.forEach((n) => initialIds.add(n.id));
      }
      toDelete.forEach((id) => initialIds.delete(id));
      const { error: e2 } = await supabase.from("profiles").update(forfaits).eq("id", profile.id);
      if (e2) throw e2;
      setDirty(false);
      if (!onSaved) toast.success("Catalogue enregistré");
      onSaved?.();
    } catch {
      toast.error("Enregistrement impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      {missing > 0 && (
        <Notice tone="info" icon={<AlertCircle />}>
          {missing} prix {missing > 1 ? "sont" : "est"} encore vide{missing > 1 ? "s" : ""}. Vous pouvez faire un dimensionnement, mais le PDF sera bloqué tant qu&apos;un prix utilisé manque.
        </Notice>
      )}

      {SECTIONS.map((s) => {
        const list = rows.filter((r) => r.type === s.type).sort((a, b) => a.position - b.position);
        return (
          <Card key={s.type}>
            <CardContent>
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sun-soft text-[#8a5a00] [&_svg]:size-[18px]">{s.icon}</span>
                <div>
                  <h2 className="text-[15px] font-semibold">{s.title}</h2>
                  <p className="text-[13px] text-muted-foreground">{s.desc}</p>
                </div>
              </div>

              <div className="mt-5 hidden grid-cols-[1fr_130px_190px_40px] gap-3 px-1 text-[12px] font-medium text-muted-foreground md:grid">
                <span>Modèle</span><span>{s.powerLabel} ({s.unit})</span><span>Prix unitaire (FCFA)</span><span />
              </div>
              <div className="mt-3 space-y-3 md:mt-2 md:space-y-2">
                {list.length === 0 && <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[13.5px] text-muted-foreground">Aucun élément. Ajoutez-en un ci-dessous.</p>}
                {list.map((r) => (
                  <div key={r.id} className="grid grid-cols-2 gap-2.5 rounded-xl border border-border p-3 md:grid-cols-[1fr_130px_190px_40px] md:items-start md:gap-3 md:rounded-none md:border-0 md:p-0">
                    <div className="col-span-2 flex gap-2 md:col-span-1">
                      <div className="flex-1">
                        <label className="mb-1 block text-[12px] text-muted-foreground md:sr-only">Modèle</label>
                        <Input value={r.model} placeholder={s.placeholder} onChange={(e) => update(r.id, { model: e.target.value })} invalid={!!errors[`${r.id}.model`]} />
                        {errors[`${r.id}.model`] && <p className="mt-1 text-[12px] text-destructive">{errors[`${r.id}.model`]}</p>}
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="mt-5 shrink-0 text-muted-foreground hover:text-destructive md:hidden" onClick={() => remove(r.id, s.type)} aria-label="Supprimer"><Trash2 /></Button>
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] text-muted-foreground md:sr-only">{s.powerLabel}</label>
                      <NumInput value={r.power} onChange={(v) => update(r.id, { power: v })} suffix={s.unit} invalid={!!errors[`${r.id}.power`]} />
                      {errors[`${r.id}.power`] && <p className="mt-1 text-[12px] text-destructive">{errors[`${r.id}.power`]}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] text-muted-foreground md:sr-only">Prix unitaire</label>
                      <NumInput value={r.price} onChange={(v) => update(r.id, { price: v })} grouped placeholder="Votre prix" suffix="FCFA"
                        className={cn(r.price == null && "border-sun/60 bg-sun-soft/50")} invalid={!!errors[`${r.id}.price`]} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="hidden text-muted-foreground hover:text-destructive md:inline-flex" onClick={() => remove(r.id, s.type)} aria-label="Supprimer"><Trash2 /></Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => add(s.type)}><Plus />Ajouter</Button>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardContent>
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sun-soft text-[#8a5a00]"><Wrench className="size-[18px]" /></span>
            <div>
              <h2 className="text-[15px] font-semibold">Forfaits et pose</h2>
              <p className="text-[13px] text-muted-foreground">Laissez vide ce que vous ne facturez pas : la ligne n&apos;apparaîtra pas sur le devis.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Structure de fixation" hint="Prix par panneau"><NumInput value={forfaits.structure_par_panneau} onChange={setF("structure_par_panneau")} grouped suffix="FCFA" placeholder="Non facturé" /></Field>
            <Field label="Câbles, protections, coffret" hint="Prix par kWc installé"><NumInput value={forfaits.cables_par_kwc} onChange={setF("cables_par_kwc")} grouped suffix="FCFA" placeholder="Non facturé" /></Field>
            <Field label="Installation et mise en service" hint="Prix par kWc installé"><NumInput value={forfaits.pose_par_kwc} onChange={setF("pose_par_kwc")} grouped suffix="FCFA" placeholder="Non facturé" /></Field>
            <Field label="Transport / déplacement" hint="Forfait par chantier"><NumInput value={forfaits.transport} onChange={setF("transport")} grouped suffix="FCFA" placeholder="Non facturé" /></Field>
          </div>
        </CardContent>
      </Card>

      <div className={cn("sticky bottom-[var(--bottom-nav,0px)] z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:flex-row sm:justify-end md:static md:mx-0 md:border-0 md:bg-transparent md:p-0", !dirty && !footerExtra && "md:flex")}>
        {footerExtra}
        <Button type="submit" loading={saving} className="w-full sm:w-auto">{submitLabel}</Button>
      </div>
    </form>
  );
}
