"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, BatteryCharging, Check, Download, Home, Plus, Receipt, Save, SunMedium, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, ChoiceCards, Field, Input, NativeSelect, Notice } from "@/components/ui/primitives";
import { NumInput } from "@/components/ui/num-input";
import { SizingExplain, SizingKpis } from "@/components/quote/sizing-summary";
import { LinesEditor, TotalsBox } from "@/components/quote/lines-editor";
import {
  DEFAULT_TECH, buildLines, computeConsumption, computeSavings, computeTotals, missingPrices, num, panelLabel, size,
  type Appliance, type CatalogEntry, type Mode, type QuoteLine, type SizingInput,
} from "@/lib/calc/engine";
import { APPLIANCE_PRESETS, presetToAppliance } from "@/lib/calc/presets";
import { addDays, formatDecimal, formatFCFA, formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { downloadQuotePdf } from "@/lib/quote/pdf-actions";
import { cn } from "@/lib/utils";
import type { CatalogItem, Profile, QuoteInputs, QuoteRow } from "@/lib/types";

const STEPS = ["Client", "Installation", "Consommation", "Devis"];

const toEntry = (c: CatalogItem): CatalogEntry => ({ id: c.id, model: c.model, power: c.power == null ? null : Number(c.power), price: c.price == null ? null : Number(c.price) });

interface State {
  client: { name: string; phone: string; city: string };
  mode: Mode;
  consumptionKind: "appareils" | "facture";
  appliances: Appliance[];
  kwhMois: number | null;
  nuitPct: number | null;
  pointeKw: number | null;
  couverture: number | null;
  joursRes: number | null;
  panelId: string | null;
  batteryId: string | null;
  remise: number | null;
  tarifKwh: number | null;
}

function initialState(source: QuoteRow | null, panels: CatalogEntry[], batteries: CatalogEntry[]): State {
  const i = source?.inputs;
  const pick = (id: string | null | undefined, list: CatalogEntry[]) => (id && list.some((x) => x.id === id) ? id : list[0]?.id ?? null);
  return {
    client: { name: source?.client_name ?? "", phone: source?.client_phone ?? "", city: source?.client_city ?? "" },
    mode: source?.mode ?? "hybride",
    consumptionKind: i?.consumptionKind ?? "appareils",
    appliances: i?.appliances ?? [],
    kwhMois: i?.kwhMois ?? null,
    nuitPct: i?.nuitPct ?? 40,
    pointeKw: i?.pointeKw ?? null,
    couverture: i?.couverture ?? 100,
    joursRes: i?.joursRes ?? 0,
    panelId: pick(i?.panelId, panels),
    batteryId: pick(i?.batteryId, batteries),
    remise: source?.remise_pct ?? 0,
    tarifKwh: i?.tarifKwh ?? null,
  };
}

/** Signature des entrées qui déterminent les lignes automatiques. */
const sigOf = (s: State) => JSON.stringify([s.mode, s.consumptionKind, s.appliances, s.kwhMois, s.nuitPct, s.pointeKw, s.couverture, s.joursRes, s.panelId, s.batteryId]);

export function QuoteWizard({ profile, catalog, source, editing }: { profile: Profile; catalog: CatalogItem[]; source: QuoteRow | null; editing: boolean }) {
  const router = useRouter();
  const tech = useMemo(() => ({ ...DEFAULT_TECH, ...profile.tech }), [profile.tech]);
  const panels = useMemo(() => catalog.filter((c) => c.type === "panel").map(toEntry), [catalog]);
  const inverters = useMemo(() => catalog.filter((c) => c.type === "inverter").map(toEntry), [catalog]);
  const batteries = useMemo(() => catalog.filter((c) => c.type === "battery").map(toEntry), [catalog]);

  const [s, setS] = useState<State>(() => initialState(source, panels, batteries));
  const [step, setStep] = useState(source ? 3 : 0);
  const [lines, setLines] = useState<QuoteLine[]>(() => (source ? source.lines : []));
  const [linesSig, setLinesSig] = useState<string>(() => (source ? sigOf(initialState(source, panels, batteries)) : ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<"" | "draft" | "pdf">("");
  const topRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof State>(k: K, v: State[K]) => { setS((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  const panel = panels.find((p) => p.id === s.panelId) ?? panels[0] ?? null;
  const battery = batteries.find((b) => b.id === s.batteryId) ?? batteries[0] ?? null;

  const input: SizingInput = useMemo(() => ({
    mode: s.mode,
    consumption: s.consumptionKind === "appareils"
      ? { kind: "appareils", appliances: s.appliances }
      : { kind: "facture", kwhMois: s.kwhMois, nuitPct: s.nuitPct, pointeKw: s.pointeKw },
    couverture: s.couverture, joursRes: s.joursRes, panel, battery, inverters, tech,
  }), [s, panel, battery, inverters, tech]);

  const r = useMemo(() => size(input), [input]);
  const conso = useMemo(() => computeConsumption(input.consumption, tech), [input, tech]);
  const sig = sigOf(s);

  /** Régénère les lignes automatiques si les entrées ont changé (les lignes ajoutées à la main sont conservées). */
  function refreshLines() {
    if (sig === linesSig || !r.ok) return;
    const auto = buildLines(r, input, { structureParPanneau: profile.structure_par_panneau, cablesParKwc: profile.cables_par_kwc, poseParKwc: profile.pose_par_kwc, transport: profile.transport });
    setLines((prev) => [...auto, ...prev.filter((l) => l.source === "manual")]);
    if (linesSig) toast.info("Les quantités ont été recalculées", { description: "Vos lignes ajoutées à la main sont conservées." });
    setLinesSig(sig);
  }

  const totals = computeTotals(lines, s.remise, profile.tva);
  const savings = computeSavings(r, s.tarifKwh, totals.ttc);
  const missing = missingPrices(lines);
  const emptyLabels = lines.some((l) => !l.label.trim());
  const blockers = [...r.errors, ...(missing.length ? [`Prix manquant pour : ${missing.join(", ")}.`] : []), ...(emptyLabels ? ["Une ligne n'a pas de désignation."] : [])];
  const canPdf = r.ok && blockers.length === 0 && lines.length > 0;

  function validate(st: number): boolean {
    const er: Record<string, string> = {};
    if (st === 0) {
      if (!s.client.name.trim()) er.name = "Indiquez le nom du client : il apparaît sur le devis.";
      if (s.client.phone && s.client.phone.replace(/\D/g, "").length < 8) er.phone = "Numéro incomplet.";
    }
    if (st === 1) {
      if (!panel) er.panel = "Ajoutez un panneau dans votre catalogue.";
      if (s.mode !== "autonome" && !(num(s.couverture) > 0 && num(s.couverture) <= 100)) er.couverture = "Entre 1 et 100 %.";
      if (s.mode !== "reseau" && (num(s.joursRes) < 0 || num(s.joursRes) > 10)) er.joursRes = "Entre 0 et 10 jours.";
    }
    if (st === 2) {
      if (s.consumptionKind === "appareils") {
        if (!s.appliances.length) er.appliances = "Ajoutez au moins un appareil.";
        else if (conso.E <= 0) er.appliances = "Indiquez la puissance et les heures d'utilisation des appareils.";
      } else {
        if (!(num(s.kwhMois) > 0)) er.kwhMois = "Indiquez la consommation lue sur la facture.";
        if (s.mode !== "reseau" && !(num(s.pointeKw) > 0)) er.pointeKw = "Nécessaire pour choisir l'onduleur.";
      }
    }
    setErrors(er);
    if (Object.keys(er).length) {
      setTimeout(() => document.querySelector("[aria-invalid=true]")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return false;
    }
    return true;
  }

  const go = (n: number) => {
    if (n > step) { for (let i = step; i < n; i++) if (!validate(i)) { setStep(i); return; } }
    if (n === 3) refreshLines();
    setStep(n);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  async function save(withPdf: boolean) {
    for (let i = 0; i < 3; i++) if (!validate(i)) { setStep(i); return; }
    if (withPdf && !canPdf) return;
    if (emptyLabels) return toast.error("Une ligne n'a pas de désignation.");
    setSaving(withPdf ? "pdf" : "draft");
    const inputs: QuoteInputs = {
      consumptionKind: s.consumptionKind, appliances: s.appliances, kwhMois: s.kwhMois, nuitPct: s.nuitPct, pointeKw: s.pointeKw,
      couverture: s.mode === "autonome" ? 100 : s.couverture, joursRes: s.mode === "reseau" ? 0 : s.joursRes,
      panelId: panel?.id ?? null, batteryId: s.mode === "reseau" ? null : battery?.id ?? null, tarifKwh: s.tarifKwh, tech,
    };
    const result = {
      ...r, panelPower: panel?.power ?? 0, batteryPower: s.mode === "reseau" ? null : battery?.power ?? null,
      ecoMois: savings?.ecoMois ?? null, roiAnnees: savings?.roiAnnees ?? null,
    };
    const row = {
      client_name: s.client.name.trim(), client_phone: s.client.phone.trim(), client_city: s.client.city.trim(),
      mode: s.mode, inputs, result, lines: lines.map((l) => ({ ...l, label: l.label.trim() })),
      remise_pct: num(s.remise), tva_pct: num(profile.tva), total_ht: Math.round(totals.ht), total_ttc: Math.round(totals.ttc),
      kwc: r.kwc, valid_until: addDays(new Date(), num(profile.validite_jours) || 30).toISOString().slice(0, 10),
    };
    const supabase = createClient();
    const q = editing && source
      ? supabase.from("quotes").update(row).eq("id", source.id).select("*").single()
      : supabase.from("quotes").insert({ ...row, user_id: profile.id }).select("*").single();
    const { data, error } = await q;
    if (error || !data) {
      setSaving("");
      if (error?.message?.includes("SUBSCRIPTION_EXPIRED")) {
        toast.error("Votre essai est terminé", { description: "Activez votre abonnement pour créer de nouveaux devis." });
        router.push("/app/abonnement?bloque=1");
        return;
      }
      return toast.error("Le devis n'a pas pu être enregistré. Vérifiez votre connexion.");
    }
    const saved = data as QuoteRow;
    if (withPdf) {
      try {
        await downloadQuotePdf(saved, profile);
        toast.success(`Devis ${saved.number} enregistré`, { description: "Le PDF est téléchargé." });
      } catch {
        toast.error("Devis enregistré, mais le PDF n'a pas pu être généré.");
      }
    } else {
      toast.success(`Devis ${saved.number} enregistré`);
    }
    router.push(`/app/devis/${saved.id}`);
    router.refresh();
  }

  return (
    <div ref={topRef} className="scroll-mt-20">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href={source && editing ? `/app/devis/${source.id}` : "/app"} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />{editing ? `Devis ${source?.number}` : "Mes devis"}
          </Link>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight md:text-2xl">
            {editing ? "Modifier le devis" : source ? `Copie du devis ${source.number}` : "Nouveau devis"}
          </h1>
        </div>
      </div>

      {/* Étapes */}
      <ol className="mb-6 grid grid-cols-4 gap-1.5">
        {STEPS.map((t, i) => (
          <li key={t}>
            <button type="button" onClick={() => go(i)} className="group flex w-full flex-col gap-1.5 text-left">
              <span className={cn("h-1.5 rounded-full transition-colors duration-300 ease-out", i <= step ? "bg-primary" : "bg-border group-hover:bg-[#d4dbd0]")} />
              <span className={cn("flex items-center gap-1 truncate text-[12px] font-medium sm:text-[13px]", i === step ? "text-foreground" : "text-muted-foreground")}>
                {i < step && <Check className="size-3.5 shrink-0 text-primary" />}<span className="truncate">{t}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {/* La clé force le remontage : chaque étape entre avec un glissement court */}
      <div key={step} className="sd-step">
      {step === 0 && (
        <Card><CardContent className="space-y-4">
          <div>
            <h2 className="text-[16px] font-semibold">Pour qui est ce devis ?</h2>
            <p className="text-[13.5px] text-muted-foreground">Le téléphone sert aussi à l&apos;envoi par WhatsApp.</p>
          </div>
          <Field label="Nom du client" htmlFor="cn" error={errors.name}>
            <Input id="cn" autoFocus={!source} value={s.client.name} placeholder="Ex : M. Diop" onChange={(e) => { set("client", { ...s.client, name: e.target.value }); setErrors((x) => ({ ...x, name: "" })); }} invalid={!!errors.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Téléphone" htmlFor="cp" error={errors.phone} optional>
              <Input id="cp" type="tel" inputMode="tel" value={s.client.phone} placeholder="77 000 00 00" onChange={(e) => { set("client", { ...s.client, phone: e.target.value }); setErrors((x) => ({ ...x, phone: "" })); }} invalid={!!errors.phone} />
            </Field>
            <Field label="Ville / quartier" htmlFor="cc" optional>
              <Input id="cc" value={s.client.city} placeholder="Ex : Thiès" onChange={(e) => set("client", { ...s.client, city: e.target.value })} />
            </Field>
          </div>
        </CardContent></Card>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Card><CardContent>
            <h2 className="text-[16px] font-semibold">Type d&apos;installation</h2>
            <ChoiceCards
              name="mode" className="mt-4 md:grid-cols-3" value={s.mode} onChange={(v) => set("mode", v)}
              options={[
                { value: "autonome", title: "Autonome", desc: "Sans Senelec, tout au solaire, avec batteries.", icon: <SunMedium /> },
                { value: "hybride", title: "Hybride", desc: "Senelec + solaire, batteries de secours.", icon: <BatteryCharging /> },
                { value: "reseau", title: "Sans batterie", desc: "Réduire la facture en journée.", icon: <Zap /> },
              ]}
            />
          </CardContent></Card>
          <Card><CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Panneau" error={errors.panel}>
              <NativeSelect value={s.panelId ?? ""} onChange={(e) => set("panelId", e.target.value)}>
                {panels.map((p) => <option key={p.id} value={p.id}>{panelLabel(p)}</option>)}
              </NativeSelect>
            </Field>
            {s.mode !== "reseau" && (
              <Field label="Batterie">
                {batteries.length ? (
                  <NativeSelect value={s.batteryId ?? ""} onChange={(e) => set("batteryId", e.target.value)}>
                    {batteries.map((b) => <option key={b.id} value={b.id}>{/kwh/i.test(b.model) ? b.model : `${b.model} (${formatDecimal(num(b.power), 1)} kWh)`}</option>)}
                  </NativeSelect>
                ) : <p className="text-[13px] text-destructive">Ajoutez une batterie dans votre <Link href="/app/catalogue" className="underline">catalogue</Link>.</p>}
              </Field>
            )}
            {s.mode !== "autonome" && (
              <Field label="Part de la consommation couverte" error={errors.couverture} hint="100 % = tout ce que le client consomme.">
                <NumInput value={s.couverture} onChange={(v) => set("couverture", v)} suffix="%" invalid={!!errors.couverture} />
              </Field>
            )}
            {s.mode !== "reseau" && (
              <Field label="Jours de réserve sans soleil" error={errors.joursRes} hint="0 = batteries pour la nuit seulement.">
                <NumInput value={s.joursRes} onChange={(v) => set("joursRes", v)} suffix="jours" invalid={!!errors.joursRes} />
              </Field>
            )}
          </CardContent></Card>
        </div>
      )}

      {step === 2 && (
        <Card><CardContent>
          <h2 className="text-[16px] font-semibold">Consommation du client</h2>
          <ChoiceCards
            name="kind" className="mt-4 sm:grid-cols-2" value={s.consumptionKind} onChange={(v) => set("consumptionKind", v)}
            options={[
              { value: "appareils", title: "Liste des appareils", desc: "Le plus précis.", icon: <Home /> },
              { value: "facture", title: "Facture Senelec", desc: "kWh consommés par mois.", icon: <Receipt /> },
            ]}
          />
          {s.consumptionKind === "appareils" ? (
            <ApplianceEditor appliances={s.appliances} onChange={(a) => set("appliances", a)} error={errors.appliances} />
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Field label="Consommation par mois" error={errors.kwhMois} hint="Facture bimestrielle : divisez par 2.">
                <NumInput value={s.kwhMois} onChange={(v) => set("kwhMois", v)} suffix="kWh" invalid={!!errors.kwhMois} />
              </Field>
              <Field label="Part consommée la nuit" hint="40 % par défaut.">
                <NumInput value={s.nuitPct} onChange={(v) => set("nuitPct", v)} suffix="%" />
              </Field>
              <Field label="Puissance max en même temps" error={errors.pointeKw} hint="Puissance souscrite, ou somme des gros appareils." optional={s.mode === "reseau"}>
                <NumInput value={s.pointeKw} onChange={(v) => set("pointeKw", v)} suffix="kW" invalid={!!errors.pointeKw} />
              </Field>
            </div>
          )}
          {conso.E > 0 && (
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-muted px-4 py-3 text-[13.5px]">
              <span><span className="text-muted-foreground">Par jour :</span> <strong className="tabular">{formatDecimal(conso.E / 1000, 2)} kWh</strong></span>
              <span><span className="text-muted-foreground">Dont nuit :</span> <strong className="tabular">{formatDecimal(conso.En / 1000, 2)} kWh</strong></span>
              <span><span className="text-muted-foreground">Puissance max :</span> <strong className="tabular">{formatDecimal(conso.peak / 1000, 2)} kW</strong></span>
            </div>
          )}
        </CardContent></Card>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {!r.ok ? (
            <Card><CardContent className="space-y-3">
              {r.empty ? <p className="text-[14.5px] text-muted-foreground">Ajoutez la consommation du client pour voir le dimensionnement.</p> : null}
              {r.errors.map((e) => <Notice key={e} icon={<AlertTriangle />}>{e}</Notice>)}
              <Button variant="outline" onClick={() => go(2)}><ArrowLeft />Revenir à la consommation</Button>
            </CardContent></Card>
          ) : (
            <>
              <Card><CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[16px] font-semibold">Dimensionnement</h2>
                    <p className="text-[13.5px] text-muted-foreground">{s.client.name}{s.client.city ? ` · ${s.client.city}` : ""}</p>
                  </div>
                </div>
                <SizingKpis r={r} mode={s.mode} panelWc={num(panel?.power)} batteryKwh={battery?.power ?? null} />
                {[...r.errors, ...r.warnings].map((w) => <Notice key={w} tone="info" icon={<AlertTriangle />}>{w}</Notice>)}
                <SizingExplain r={r} mode={s.mode} tech={tech} panelWc={num(panel?.power)} batteryKwh={battery?.power ?? null} />
              </CardContent></Card>

              <Card><CardContent className="space-y-5">
                <div>
                  <h2 className="text-[16px] font-semibold">Devis</h2>
                  <p className="text-[13.5px] text-muted-foreground">Ajustez les quantités et les prix, ou ajoutez des lignes.</p>
                </div>
                {missing.length > 0 && (
                  <Notice icon={<AlertTriangle />}>
                    Prix manquant pour : <strong>{missing.join(", ")}</strong>. Saisissez-le ci-dessous ou dans votre{" "}
                    <Link href="/app/catalogue" className="font-semibold underline underline-offset-4">catalogue</Link>. Le PDF est bloqué en attendant.
                  </Notice>
                )}
                <LinesEditor lines={lines} onChange={setLines} />
                <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                  <Field label="Remise" hint="Appliquée sur le total HT.">
                    <NumInput value={s.remise} onChange={(v) => set("remise", v == null ? 0 : Math.min(100, Math.max(0, v)))} suffix="%" />
                  </Field>
                  <Field label="Prix du kWh Senelec du client" hint="Pour afficher l'économie estimée sur le devis." optional>
                    <NumInput value={s.tarifKwh} onChange={(v) => set("tarifKwh", v)} suffix="FCFA" placeholder="Ex : 117" />
                  </Field>
                </div>
                <TotalsBox ht={totals.ht} remise={totals.remise} remisePct={num(s.remise)} tva={totals.tva} tvaPct={num(profile.tva)} ttc={totals.ttc} />
                {savings && (
                  <Notice tone="ok" icon={<Check />}>
                    Économie estimée : <strong>{formatFCFA(savings.ecoMois)} par mois</strong>
                    {savings.roiAnnees ? <>, soit un retour sur investissement en environ {formatDecimal(savings.roiAnnees, 1)} ans</> : null}.
                  </Notice>
                )}
              </CardContent></Card>
            </>
          )}
        </div>
      )}

      </div>

      {/* Barre d'actions */}
      <div className="sticky bottom-[var(--bottom-nav,0px)] z-20 -mx-4 mt-6 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        {step < 3 ? (
          <div className="flex gap-2 md:justify-end">
            {step > 0 && <Button variant="outline" onClick={() => go(step - 1)} className="flex-1 md:flex-none"><ArrowLeft />Retour</Button>}
            <Button onClick={() => go(step + 1)} className="flex-[2] md:flex-none">{step === 2 ? "Voir le dimensionnement" : "Continuer"}<ArrowRight /></Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
            {!canPdf && r.ok && blockers.length > 0 && <p className="text-[12.5px] text-[#9a3412] md:mr-auto">PDF bloqué : {blockers[0]}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => save(false)} loading={saving === "draft"} disabled={!!saving || !r.ok} className="flex-1 md:flex-none"><Save />{editing ? "Enregistrer" : "Brouillon"}</Button>
              <Button onClick={() => save(true)} loading={saving === "pdf"} disabled={!!saving || !canPdf} className="flex-[2] md:flex-none"><Download />Enregistrer et télécharger le PDF</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ApplianceEditor({ appliances, onChange, error }: { appliances: Appliance[]; onChange: (a: Appliance[]) => void; error?: string }) {
  const upd = (i: number, patch: Partial<Appliance>) => onChange(appliances.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  return (
    <div className="mt-5">
      <p className="text-[13px] font-medium">Ajout rapide</p>
      <div className="-mx-1 mt-2 flex flex-wrap gap-1.5">
        {APPLIANCE_PRESETS.map((p, i) => (
          <button key={p[0]} type="button" onClick={() => onChange([...appliances, presetToAppliance(i)])}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-[#c5cec2] bg-card px-3 text-[13px] transition-[border-color,color,background-color,scale] duration-[160ms] ease-out hover:border-primary hover:text-primary active:scale-[0.97] active:bg-primary-soft">
            <Plus className="size-3.5" />{p[0]}
          </button>
        ))}
        <button type="button" onClick={() => onChange([...appliances, { name: "", w: null, q: 1, h: null, hn: 0 }])}
          className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-[#c5cec2] bg-card px-3 text-[13px] font-medium transition-[border-color,color,scale] duration-[160ms] ease-out hover:border-primary hover:text-primary active:scale-[0.97]">
          <Plus className="size-3.5" />Autre appareil
        </button>
      </div>
      <p className="mt-2 text-[12.5px] text-muted-foreground">Puissances indicatives : corrigez-les avec l&apos;étiquette de l&apos;appareil.</p>

      {error && <p className="mt-3 text-[13px] text-destructive" aria-invalid="true">{error}</p>}

      {appliances.length > 0 && (
        <>
          <div className="mt-5 hidden grid-cols-[1fr_96px_76px_88px_88px_40px] gap-2 px-1 pb-2 text-[12px] font-medium text-muted-foreground md:grid">
            <span>Appareil</span><span>Watts</span><span>Qté</span><span>h / jour</span><span>dont nuit</span><span />
          </div>
          <ul className="mt-4 space-y-2.5 md:mt-0 md:space-y-2">
            {appliances.map((a, i) => {
              const line = num(a.w) * num(a.q) * num(a.h);
              return (
                <li key={i} className="grid grid-cols-4 gap-2 rounded-xl border border-border p-3 md:grid-cols-[1fr_96px_76px_88px_88px_40px] md:items-center md:rounded-none md:border-0 md:p-0">
                  <div className="col-span-4 flex gap-2 md:col-span-1">
                    <Input value={a.name} placeholder="Appareil" onChange={(e) => upd(i, { name: e.target.value })} aria-label="Appareil" />
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive md:hidden" onClick={() => onChange(appliances.filter((_, j) => j !== i))} aria-label="Retirer"><Trash2 /></Button>
                  </div>
                  <Mini label="Watts"><NumInput value={a.w} onChange={(v) => upd(i, { w: v })} aria-label="Watts" /></Mini>
                  <Mini label="Qté"><NumInput value={a.q} onChange={(v) => upd(i, { q: v })} aria-label="Quantité" /></Mini>
                  <Mini label="h / jour"><NumInput value={a.h} onChange={(v) => upd(i, { h: v })} aria-label="Heures par jour" /></Mini>
                  <Mini label="dont nuit"><NumInput value={a.hn} onChange={(v) => upd(i, { hn: v })} aria-label="Dont heures de nuit" invalid={num(a.hn) > num(a.h)} /></Mini>
                  <Button type="button" variant="ghost" size="icon" className="hidden text-muted-foreground hover:text-destructive md:inline-flex" onClick={() => onChange(appliances.filter((_, j) => j !== i))} aria-label="Retirer"><Trash2 /></Button>
                  {line > 0 && <p className="col-span-4 text-[12px] text-muted-foreground md:hidden">{formatNumber(line)} Wh par jour</p>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-[11.5px] text-muted-foreground md:hidden">{label}</span>
      {children}
    </div>
  );
}
