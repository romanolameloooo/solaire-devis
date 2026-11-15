import { describe, expect, it } from "vitest";
import {
  DEFAULT_TECH, size, buildLines, computeTotals, computeSavings, missingPrices, computeConsumption,
  type SizingInput, type CatalogEntry, type Forfaits,
} from "./engine";

const panel: CatalogEntry = { id: "p", model: "Panneau monocristallin 550 Wc", power: 550, price: 100000 };
const battery: CatalogEntry = { id: "b", model: "Batterie lithium 48 V 5 kWh", power: 5, price: 800000 };
const inverters: CatalogEntry[] = [10, 3, 8, 5].map((kw) => ({ id: `i${kw}`, model: `Onduleur hybride ${kw} kW`, power: kw, price: 100000 * kw }));
const forfaits: Forfaits = { structureParPanneau: 15000, cablesParKwc: 50000, poseParKwc: null, transport: 25000 };

const base = (over: Partial<SizingInput> = {}): SizingInput => ({
  mode: "hybride",
  consumption: {
    kind: "appareils",
    appliances: [
      { name: "Réfrigérateur", w: 150, q: 1, h: 10, hn: 5 },
      { name: "Ampoule LED", w: 10, q: 6, h: 5, hn: 4 },
    ],
  },
  couverture: 100, joursRes: 0, panel, battery, inverters, tech: DEFAULT_TECH,
  ...over,
});

describe("consommation", () => {
  it("additionne puissance × quantité × heures et applique la simultanéité", () => {
    const c = computeConsumption(base().consumption, DEFAULT_TECH);
    expect(c.E).toBe(1800);
    expect(c.En).toBe(990);
    expect(c.peak).toBeCloseTo(168, 6); // (150 + 60) × 80 %
  });

  it("plafonne les heures de nuit aux heures d'utilisation", () => {
    const c = computeConsumption({ kind: "appareils", appliances: [{ name: "x", w: 100, q: 1, h: 2, hn: 5 }] }, DEFAULT_TECH);
    expect(c.En).toBe(200);
  });

  it("mode facture : kWh/mois → Wh/jour, part de nuit, pointe en kW", () => {
    const c = computeConsumption({ kind: "facture", kwhMois: 300, nuitPct: 40, pointeKw: 3 }, DEFAULT_TECH);
    expect(c.E).toBeCloseTo(10000, 6);
    expect(c.En).toBeCloseTo(4000, 6);
    expect(c.peak).toBe(3000);
  });
});

describe("dimensionnement", () => {
  it("hybride, petite maison", () => {
    const r = size(base());
    expect(r.ok).toBe(true);
    expect(r.pvNeedW).toBeCloseTo(1800 / 4.05, 6);
    expect(r.nPanels).toBe(1);
    expect(r.kwc).toBeCloseTo(0.55, 6);
    expect(r.battNeedWh).toBeCloseTo(990 / 0.855, 6);
    expect(r.nBatt).toBe(1);
    expect(r.invReqW).toBeCloseTo(550 / 1.3, 6); // > 168 × 1,25 = 210
    expect(r.inverter?.power).toBe(3);
    expect(r.nInv).toBe(1);
    expect(r.prodMois).toBeCloseTo(0.55 * 5.4 * 0.75 * 30, 6);
    expect(r.errors).toEqual([]);
  });

  it("autonome : couverture forcée à 100 % et jours de réserve", () => {
    const r = size(base({ mode: "autonome", couverture: 30, joursRes: 1, consumption: { kind: "facture", kwhMois: 300, nuitPct: 40, pointeKw: 3 } }));
    expect(r.cov).toBe(1);
    expect(r.nPanels).toBe(5); // 2469 W / 550
    expect(r.kwc).toBeCloseTo(2.75, 6);
    expect(r.battNeedWh).toBeCloseTo(14000 / 0.855, 6);
    expect(r.nBatt).toBe(4); // 16,37 kWh / 5
    expect(r.invReqW).toBeCloseTo(3750, 6); // 3 kW × 1,25
    expect(r.inverter?.power).toBe(5);
  });

  it("sans batterie : part couverte, onduleur = kWc / 1,2, pas de batterie", () => {
    const r = size(base({ mode: "reseau", couverture: 50, consumption: { kind: "facture", kwhMois: 300, nuitPct: 40, pointeKw: null } }));
    expect(r.errors).toEqual([]);
    expect(r.nPanels).toBe(3); // 1235 W / 550
    expect(r.nBatt).toBe(0);
    expect(r.battNeedWh).toBe(0);
    expect(r.invReqW).toBeCloseTo(1650 / 1.2, 6);
    expect(r.inverter?.power).toBe(3);
  });

  it("aucun onduleur assez gros : N × le plus gros, avec avertissement", () => {
    const r = size(base({ consumption: { kind: "facture", kwhMois: 300, nuitPct: 40, pointeKw: 20 } }));
    expect(r.invReqW).toBeCloseTo(25000, 6);
    expect(r.inverter?.power).toBe(10);
    expect(r.nInv).toBe(3);
    expect(r.warnings[0]).toMatch(/3 × Onduleur hybride 10 kW/);
  });

  it("mode facture sans puissance max : erreur explicite", () => {
    const r = size(base({ consumption: { kind: "facture", kwhMois: 300, nuitPct: 40, pointeKw: null } }));
    expect(r.errors[0]).toMatch(/puissance max/);
  });

  it("autonome sans consommation de nuit : avertissement", () => {
    const r = size(base({ mode: "autonome", consumption: { kind: "appareils", appliances: [{ name: "Pompe", w: 750, q: 1, h: 1, hn: 0 }] } }));
    expect(r.nBatt).toBe(0);
    expect(r.warnings.join(" ")).toMatch(/Aucune consommation la nuit/);
  });

  it("consommation vide : résultat vide", () => {
    const r = size(base({ consumption: { kind: "appareils", appliances: [] } }));
    expect(r.empty).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("panneau sans puissance : erreur", () => {
    const r = size(base({ panel: { ...panel, power: null } }));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/Wc/);
  });

  it("pas d'onduleur dans le catalogue : erreur", () => {
    const r = size(base({ inverters: [] }));
    expect(r.errors[0]).toMatch(/onduleur/);
  });

  it("un besoin pile égal à un multiple ne rajoute pas de panneau (arrondi flottant)", () => {
    // 4,05 kWh/jour → besoin exactement 1000 W → 2 panneaux de 500 Wc
    const r = size(base({ panel: { ...panel, power: 500 }, consumption: { kind: "appareils", appliances: [{ name: "x", w: 405, q: 1, h: 10, hn: 0 }] } }));
    expect(r.nPanels).toBe(2);
  });
});

describe("lignes et totaux", () => {
  it("génère les lignes, omet les forfaits non facturés, calcule les totaux", () => {
    const input = base();
    const r = size(input);
    const lines = buildLines(r, input, forfaits);
    expect(lines.map((l) => l.source)).toEqual(["panel", "inverter", "battery", "structure", "cables", "transport"]);
    expect(lines.find((l) => l.source === "cables")?.qty).toBeCloseTo(0.55, 6);
    const t = computeTotals(lines, 10, 18);
    expect(t.ht).toBeCloseTo(100000 + 300000 + 800000 + 15000 + 27500 + 25000, 6);
    expect(t.remise).toBeCloseTo(126750, 6);
    expect(t.tva).toBeCloseTo((1267500 - 126750) * 0.18, 6);
    expect(t.ttc).toBeCloseTo((1267500 - 126750) * 1.18, 6);
    expect(missingPrices(lines)).toEqual([]);
  });

  it("les totaux arrondis s'additionnent exactement", () => {
    const lines = [{ id: "a", source: "manual" as const, label: "x", qty: 1, unit: "u", unitPrice: 2443750 }];
    const t = computeTotals(lines, 5, 18);
    expect(t.remise).toBe(122188);
    expect(t.base).toBe(2321562);
    expect(t.ht - t.remise).toBe(t.base);
    expect(t.base + t.tva).toBe(t.ttc);
    expect(Number.isInteger(t.tva)).toBe(true);
  });

  it("matériel sans prix : la ligne reste et est signalée comme manquante", () => {
    const input = base({ battery: { ...battery, price: null } });
    const lines = buildLines(size(input), input, forfaits);
    expect(missingPrices(lines)).toEqual(["Batterie lithium 48 V 5 kWh"]);
  });

  it("sans batterie : aucune ligne batterie", () => {
    const input = base({ mode: "reseau" });
    const lines = buildLines(size(input), input, forfaits);
    expect(lines.some((l) => l.source === "battery")).toBe(false);
  });

  it("économie et retour sur investissement", () => {
    const r = size(base());
    const s = computeSavings(r, 100, 1_000_000)!;
    expect(s.ecoMois).toBeCloseTo(54 * 100, 6); // min(production 66,8 ; conso 54 kWh) × 100 FCFA
    expect(s.roiAnnees).toBeCloseTo(1_000_000 / 5400 / 12, 6);
    expect(computeSavings(r, null, 1)).toBeNull();
  });
});
