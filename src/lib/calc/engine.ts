/**
 * Moteur de dimensionnement et de chiffrage SolaDevis.
 * Fonctions pures, sans dépendance à React ni à Supabase : testées dans engine.test.ts.
 * Toutes les puissances internes sont en W / Wh. Les réglages sont en pourcentage (75 = 75 %).
 */

export type Mode = "autonome" | "hybride" | "reseau";

export interface TechSettings {
  /** Heures de plein soleil par jour */
  psh: number;
  /** Rendement global du système (%) */
  pr: number;
  /** Profondeur de décharge batterie (%) */
  dod: number;
  /** Rendement batterie (%) */
  eff: number;
  /** Marge de puissance onduleur (%) */
  marge: number;
  /** Appareils allumés en même temps (%) */
  simult: number;
}

export const DEFAULT_TECH: TechSettings = { psh: 5.4, pr: 75, dod: 90, eff: 95, marge: 25, simult: 80 };

export interface Appliance {
  name: string;
  /** Puissance unitaire (W) */
  w: number | null;
  /** Quantité */
  q: number | null;
  /** Heures d'utilisation par jour */
  h: number | null;
  /** Dont heures de nuit */
  hn: number | null;
}

export type Consumption =
  | { kind: "appareils"; appliances: Appliance[] }
  | { kind: "facture"; kwhMois: number | null; nuitPct: number | null; pointeKw: number | null };

export interface CatalogEntry {
  id: string;
  model: string;
  /** Wc pour un panneau, kW pour un onduleur, kWh pour une batterie */
  power: number | null;
  /** Prix unitaire (FCFA). null = pas encore renseigné */
  price: number | null;
}

export interface Forfaits {
  structureParPanneau: number | null;
  cablesParKwc: number | null;
  poseParKwc: number | null;
  transport: number | null;
}

export interface SizingInput {
  mode: Mode;
  consumption: Consumption;
  /** Part de la conso couverte par le solaire (%), ignorée en autonome */
  couverture: number | null;
  /** Jours de réserve sans soleil, ignorés en « sans batterie » */
  joursRes: number | null;
  panel: CatalogEntry | null;
  battery: CatalogEntry | null;
  inverters: CatalogEntry[];
  tech: TechSettings;
}

export interface SizingResult {
  ok: boolean;
  empty: boolean;
  errors: string[];
  warnings: string[];
  /** Consommation par jour (Wh) */
  E: number;
  /** Consommation de nuit par jour (Wh) */
  En: number;
  /** Puissance max simultanée (W) */
  peak: number;
  /** Part couverte (0..1) */
  cov: number;
  /** Puissance crête nécessaire (W) avant arrondi */
  pvNeedW: number;
  nPanels: number;
  kwc: number;
  battNeedWh: number;
  nBatt: number;
  invReqW: number;
  inverter: CatalogEntry | null;
  nInv: number;
  /** Production estimée par mois (kWh) */
  prodMois: number;
}

/** Convertit une saisie en nombre (vide ou invalide = 0). */
export const num = (v: unknown): number => {
  if (v === "" || v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Vrai si la valeur est un nombre strictement positif. */
export const has = (v: unknown): boolean => num(v) > 0;

function emptyResult(): SizingResult {
  return {
    ok: false, empty: false, errors: [], warnings: [],
    E: 0, En: 0, peak: 0, cov: 0, pvNeedW: 0, nPanels: 0, kwc: 0,
    battNeedWh: 0, nBatt: 0, invReqW: 0, inverter: null, nInv: 0, prodMois: 0,
  };
}

/** Consommation : E (Wh/jour), En (Wh de nuit), puissance max (W). */
export function computeConsumption(c: Consumption, tech: TechSettings) {
  let E = 0, En = 0, peak = 0;
  if (c.kind === "appareils") {
    for (const a of c.appliances) {
      const w = num(a.w), q = num(a.q), h = num(a.h), hn = Math.min(num(a.hn), h);
      E += w * q * h;
      En += w * q * hn;
      peak += w * q;
    }
    peak *= num(tech.simult) / 100;
  } else {
    E = (num(c.kwhMois) * 1000) / 30;
    En = (E * num(c.nuitPct)) / 100;
    peak = num(c.pointeKw) * 1000;
  }
  return { E, En, peak };
}

export function size(input: SizingInput): SizingResult {
  const r = emptyResult();
  const t = input.tech;
  const { E, En, peak } = computeConsumption(input.consumption, t);
  Object.assign(r, { E, En, peak });

  if (input.consumption.kind === "facture" && E > 0 && peak <= 0 && input.mode !== "reseau") {
    r.errors.push("Indiquez la puissance max utilisée en même temps (kW) pour choisir l'onduleur.");
  }
  if (E <= 0) { r.empty = true; return r; }
  if (!has(t.psh) || !has(t.pr)) {
    r.errors.push("Réglages techniques incomplets (heures de plein soleil, rendement).");
    return r;
  }

  const cov = input.mode === "autonome" ? 1 : Math.max(0, Math.min(num(input.couverture), 100)) / 100;
  r.cov = cov;
  const panel = input.panel;
  if (!panel || !has(panel.power)) {
    r.errors.push("Indiquez la puissance (Wc) du panneau dans le catalogue.");
    return r;
  }
  const yieldFactor = num(t.psh) * (num(t.pr) / 100);
  r.pvNeedW = (E * cov) / yieldFactor;
  r.nPanels = Math.max(1, Math.ceil(round6(r.pvNeedW / num(panel.power))));
  r.kwc = (r.nPanels * num(panel.power)) / 1000;

  if (input.mode !== "reseau") {
    const denom = (num(t.dod) / 100) * (num(t.eff) / 100);
    r.battNeedWh = denom > 0 ? (En + Math.max(0, num(input.joursRes)) * E) / denom : 0;
    if (r.battNeedWh > 0) {
      const b = input.battery;
      if (!b || !has(b.power)) r.errors.push("Indiquez la capacité (kWh) de la batterie dans le catalogue.");
      else r.nBatt = Math.ceil(round6(r.battNeedWh / (num(b.power) * 1000)));
    }
    if (input.mode === "autonome" && En === 0) {
      r.warnings.push("Aucune consommation la nuit : pas de batterie calculée. Vérifiez la colonne « dont nuit ».");
    }
  }

  r.invReqW = input.mode === "reseau"
    ? (r.kwc * 1000) / 1.2
    : Math.max(peak * (1 + num(t.marge) / 100), (r.kwc * 1000) / 1.3);

  const invs = input.inverters.filter((x) => has(x.power)).sort((a, b) => num(a.power) - num(b.power));
  if (!invs.length) {
    r.errors.push("Ajoutez au moins un onduleur avec sa puissance (kW) dans le catalogue.");
  } else {
    const fit = invs.find((x) => num(x.power) * 1000 >= r.invReqW - 1e-9);
    if (fit) { r.inverter = fit; r.nInv = 1; }
    else {
      const big = invs[invs.length - 1];
      r.inverter = big;
      r.nInv = Math.ceil(round6(r.invReqW / (num(big.power) * 1000)));
      r.warnings.push(`Aucun onduleur assez puissant seul : ${r.nInv} × ${big.model} en parallèle. Vérifiez que ce modèle accepte la mise en parallèle.`);
    }
  }

  r.prodMois = r.kwc * yieldFactor * 30;
  r.ok = true;
  return r;
}

/** Évite qu'un 2,0000000001 dû aux flottants donne 3 après Math.ceil. */
function round6(x: number) { return Math.round(x * 1e6) / 1e6; }

/* ---------------------------------------------------------------- Lignes du devis */

export type LineSource = "panel" | "inverter" | "battery" | "structure" | "cables" | "pose" | "transport" | "manual";

export interface QuoteLine {
  id: string;
  source: LineSource;
  label: string;
  qty: number;
  /** "u", "kWc" ou "forfait" */
  unit: string;
  /** null = prix manquant (bloque le PDF) */
  unitPrice: number | null;
}

let seq = 0;
const lid = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * Génère les lignes du devis à partir du dimensionnement.
 * Le matériel sans prix reste dans la liste avec unitPrice = null (le PDF est bloqué).
 * Les forfaits sans prix sont omis : l'installateur ne les facture pas.
 */
export function buildLines(r: SizingResult, input: SizingInput, f: Forfaits): QuoteLine[] {
  if (!r.ok) return [];
  const lines: QuoteLine[] = [];
  const mat = (source: LineSource, item: CatalogEntry | null, qty: number, label: string) => {
    if (!item || qty <= 0) return;
    lines.push({ id: lid(), source, label, qty, unit: "u", unitPrice: has(item.price) ? num(item.price) : null });
  };
  const forfait = (source: LineSource, label: string, qty: number, unit: string, pu: number | null) => {
    if (qty <= 0 || !has(pu)) return;
    lines.push({ id: lid(), source, label, qty, unit, unitPrice: num(pu) });
  };
  if (input.panel) mat("panel", input.panel, r.nPanels, panelLabel(input.panel));
  if (r.inverter) mat("inverter", r.inverter, r.nInv, r.inverter.model);
  if (input.mode !== "reseau" && input.battery && r.nBatt) mat("battery", input.battery, r.nBatt, input.battery.model);
  forfait("structure", "Structure de fixation", r.nPanels, "u", f.structureParPanneau);
  forfait("cables", "Câbles, protections et coffret", round2(r.kwc), "kWc", f.cablesParKwc);
  forfait("pose", "Installation et mise en service", round2(r.kwc), "kWc", f.poseParKwc);
  forfait("transport", "Transport / déplacement", 1, "forfait", f.transport);
  return lines;
}

export function newManualLine(): QuoteLine {
  return { id: lid(), source: "manual", label: "", qty: 1, unit: "u", unitPrice: null };
}

export function panelLabel(p: { model: string; power: number | null }) {
  return /wc/i.test(p.model || "") ? p.model : `${p.model || "Panneau"} (${num(p.power)} Wc)`;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Lignes qui empêchent la génération du PDF (prix ou libellé manquant). */
export function missingPrices(lines: QuoteLine[]): string[] {
  return lines
    .filter((l) => num(l.qty) > 0 && (l.unitPrice === null || !(l.unitPrice >= 0) || Number.isNaN(l.unitPrice)))
    .map((l) => l.label || "Ligne sans désignation");
}

export interface Totals {
  ht: number;
  remise: number;
  base: number;
  tva: number;
  ttc: number;
}

/** Total d'une ligne, arrondi au franc. */
export const lineTotal = (l: Pick<QuoteLine, "qty" | "unitPrice">) => Math.round(num(l.qty) * num(l.unitPrice));

/**
 * Totaux arrondis au franc à chaque étape, pour que les montants imprimés s'additionnent exactement
 * (HT − remise = base ; base + TVA = TTC).
 */
export function computeTotals(lines: QuoteLine[], remisePct: number | null, tvaPct: number | null): Totals {
  const ht = lines.reduce((s, l) => s + lineTotal(l), 0);
  const remise = Math.round((ht * Math.max(0, Math.min(num(remisePct), 100))) / 100);
  const base = ht - remise;
  const tva = Math.round((base * num(tvaPct)) / 100);
  return { ht, remise, base, tva, ttc: base + tva };
}

/** Économie mensuelle (FCFA) : énergie solaire réellement consommée × prix du kWh. */
export function computeSavings(r: SizingResult, tarifKwh: number | null, ttc: number) {
  if (!r.ok || !has(tarifKwh)) return null;
  const used = Math.min(r.prodMois, (r.E * 30 * r.cov) / 1000);
  const ecoMois = used * num(tarifKwh);
  const roiAnnees = ecoMois > 0 && ttc > 0 ? ttc / ecoMois / 12 : null;
  return { ecoMois, roiAnnees };
}
