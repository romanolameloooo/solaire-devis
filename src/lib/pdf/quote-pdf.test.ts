import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_TECH, buildLines, computeTotals, size, type SizingInput } from "@/lib/calc/engine";
import { buildQuotePdf } from "./quote-pdf";

describe("PDF du devis", () => {
  it("génère un A4 avec accents et montants", () => {
    const input: SizingInput = {
      mode: "hybride",
      consumption: { kind: "facture", kwhMois: 300, nuitPct: 40, pointeKw: 3 },
      couverture: 100, joursRes: 0,
      panel: { id: "p", model: "Panneau monocristallin 550 Wc", power: 550, price: 95000 },
      battery: { id: "b", model: "Batterie lithium 48 V 5 kWh", power: 5, price: 780000 },
      inverters: [{ id: "i", model: "Onduleur hybride 5 kW", power: 5, price: 650000 }],
      tech: DEFAULT_TECH,
    };
    const r = size(input);
    const lines = buildLines(r, input, { structureParPanneau: 18000, cablesParKwc: 45000, poseParKwc: 60000, transport: 35000 });
    lines.push({ id: "m", source: "manual", label: "Câblage spécial — tranchée 15 m (époxy)", qty: 1, unit: "u", unitPrice: 125000 });
    const totals = computeTotals(lines, 5, 18);
    const doc = buildQuotePdf(
      { name: "Soleil Énergie SARL", address: "Sacré-Cœur 3, Dakar", phone: "+221 77 000 00 00", email: "contact@soleil-energie.sn", ninea: "0012345 2G3" },
      {
        number: "DV-2026-0007", date: new Date("2026-11-15"), validUntil: new Date("2026-12-15"),
        client: { name: "M. Ndiaye Aïssatou", phone: "77 123 45 67", city: "Thiès" },
        mode: "hybride", kwc: r.kwc, lines, remisePct: 5, tvaPct: 18, totals,
        summary: {
          consoJourKwh: r.E / 1000, nPanels: r.nPanels, panelWc: 550, inverter: r.inverter?.model ?? null, nInv: r.nInv,
          inverterKw: r.inverter?.power ?? null, nBatt: r.nBatt, batteryKwh: 5, prodMoisKwh: r.prodMois, ecoMois: 34000, roiAnnees: 12.4,
        },
        conditions: "Acompte de 50 % à la commande, solde à la mise en service. Garantie du matériel selon fabricant. Délai d'installation : 10 jours ouvrés après réception de l'acompte.",
      },
    );
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(5000);
    const dir = path.resolve(process.cwd(), "test-output");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "devis-exemple.pdf"), Buffer.from(out));
    expect(doc.getNumberOfPages()).toBe(1);
  });
});

import { formatSignedAt, shortHash } from "./quote-pdf";

describe("PDF signé", () => {
  it("date et heure de signature en GMT, empreinte courte", () => {
    expect(formatSignedAt("2026-11-19T14:05:30Z")).toBe("19/11/2026 à 14:05");
    expect(shortHash("3f9a2c417b0e55d2aa00bb11cc22dd33ee44ff5566778899aabbccddeeff0011")).toBe("3F9A 2C41 7B0E 55D2");
  });

  it("ajoute la signature, la mention « signature électronique simple » et l'annexe", () => {
    const input: SizingInput = {
      mode: "hybride",
      consumption: { kind: "facture", kwhMois: 300, nuitPct: 40, pointeKw: 3 },
      couverture: 100, joursRes: 0,
      panel: { id: "p", model: "Panneau monocristallin 550 Wc", power: 550, price: 95000 },
      battery: { id: "b", model: "Batterie lithium 48 V 5 kWh", power: 5, price: 780000 },
      inverters: [{ id: "i", model: "Onduleur hybride 5 kW", power: 5, price: 650000 }],
      tech: DEFAULT_TECH,
    };
    const r = size(input);
    const lines = buildLines(r, input, { structureParPanneau: 18000, cablesParKwc: 45000, poseParKwc: 60000, transport: 35000 });
    // Signature d'exemple : un trait dessiné dans un PNG 1x1 agrandi suffit pour vérifier la mise en page
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    const doc = buildQuotePdf(
      { name: "Soleil Énergie SARL", address: "Dakar", phone: "+221 77 000 00 00", email: "contact@exemple.sn", ninea: "" },
      {
        number: "DV-2026-0042", date: new Date("2026-11-19"), validUntil: new Date("2026-12-19"),
        client: { name: "Moussa Diop", phone: "77 123 45 67", city: "Thiès" }, mode: "hybride", kwc: r.kwc, lines,
        remisePct: 0, tvaPct: 18, totals: computeTotals(lines, 0, 18),
        summary: { consoJourKwh: r.E / 1000, nPanels: r.nPanels, panelWc: 550, inverter: r.inverter?.model ?? null, nInv: r.nInv, inverterKw: 5, nBatt: r.nBatt, batteryKwh: 5, prodMoisKwh: r.prodMois, ecoMois: null, roiAnnees: null },
        conditions: "Acompte de 50 % à la commande.",
        signature: { image: png, name: "Moussa Diop", signedAt: "2026-11-19T14:05:00Z", hash: "3f9a2c417b0e55d2aa00bb11cc22dd33ee44ff5566778899aabbccddeeff0011", method: "onsite" },
      },
      null,
      {
        visit: { address: "Route de Mbour", roof: "dalle", surfaceM2: 40, orientation: "Sud", shading: true, shadingNote: "Manguier à l'ouest", distanceM: 12, notes: "Accès par l'escalier" },
        photos: [1, 2, 3].map((i) => ({ dataUrl: jpeg, width: 1600, height: 1200, caption: ["Toit", "Compteur", "Tableau électrique"][i - 1] })),
      },
    );
    const out = Buffer.from(doc.output("arraybuffer"));
    const dir = path.resolve(process.cwd(), "test-output");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "devis-signe.pdf"), out);
    // Devis (1 page) + annexe : infos + 1 photo, puis 2 photos
    expect(doc.getNumberOfPages()).toBe(3);
  });
});
