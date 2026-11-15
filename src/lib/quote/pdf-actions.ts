"use client";
import { computeTotals } from "@/lib/calc/engine";
import { logoPublicUrl } from "@/lib/env";
import { formatDecimal, formatFCFA, slugify, whatsappLink } from "@/lib/format";
import type { PdfQuote } from "@/lib/pdf/quote-pdf";
import type { Profile, QuoteRow } from "@/lib/types";

export function rowToPdfQuote(row: QuoteRow, profile: Profile): PdfQuote {
  const r = row.result;
  return {
    number: row.number,
    date: row.created_at,
    validUntil: row.valid_until,
    client: { name: row.client_name, phone: row.client_phone, city: row.client_city },
    mode: row.mode,
    kwc: row.kwc,
    lines: row.lines,
    remisePct: row.remise_pct,
    tvaPct: row.tva_pct,
    totals: computeTotals(row.lines, row.remise_pct, row.tva_pct),
    summary: {
      consoJourKwh: (r.E ?? 0) / 1000,
      nPanels: r.nPanels ?? 0,
      panelWc: r.panelPower ?? 0,
      inverter: r.inverter?.model ?? null,
      nInv: r.nInv ?? 0,
      inverterKw: r.inverter?.power ?? null,
      nBatt: r.nBatt ?? 0,
      batteryKwh: r.batteryPower ?? null,
      prodMoisKwh: r.prodMois ?? 0,
      ecoMois: r.ecoMois ?? null,
      roiAnnees: r.roiAnnees ?? null,
    },
    conditions: profile.conditions || "",
  };
}

export const pdfFileName = (row: QuoteRow) => `Devis-${row.number}-${slugify(row.client_name) || "client"}.pdf`;

async function makePdf(row: QuoteRow, profile: Profile) {
  const { buildQuotePdf, loadLogo } = await import("@/lib/pdf/quote-pdf");
  const logo = await loadLogo(logoPublicUrl(profile.logo_path, profile.logo_path ? new Date().getTime() : undefined));
  return buildQuotePdf(
    { name: profile.company_name, address: profile.address, phone: profile.phone, email: profile.company_email, ninea: profile.ninea },
    rowToPdfQuote(row, profile),
    logo,
  );
}

export async function downloadQuotePdf(row: QuoteRow, profile: Profile) {
  const doc = await makePdf(row, profile);
  doc.save(pdfFileName(row));
}

/** Partage natif du PDF (WhatsApp, e-mail…) quand le téléphone le permet. */
export async function shareQuotePdf(row: QuoteRow, profile: Profile): Promise<"shared" | "unsupported" | "cancelled"> {
  const doc = await makePdf(row, profile);
  const file = new File([doc.output("blob")], pdfFileName(row), { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return "unsupported";
  try {
    await nav.share({ files: [file], title: `Devis ${row.number}`, text: whatsappMessage(row, profile) });
    return "shared";
  } catch {
    return "cancelled";
  }
}

export function whatsappMessage(row: QuoteRow, profile: Profile) {
  const name = row.client_name ? ` ${row.client_name}` : "";
  return [
    `Bonjour${name},`,
    "",
    `Voici votre devis ${row.number} pour une installation solaire de ${formatDecimal(row.kwc, 2)} kWc.`,
    `Montant total : ${formatFCFA(row.total_ttc)} TTC.`,
    "Le devis détaillé en PDF est joint à ce message.",
    "",
    "Je reste disponible pour toute question.",
    profile.company_name ? `${profile.company_name}${profile.phone ? ` - ${profile.phone}` : ""}` : "",
  ].filter((l, i, a) => l !== "" || (a[i - 1] ?? "") !== "").join("\n").trim();
}

export function whatsappUrl(row: QuoteRow, profile: Profile) {
  return whatsappLink(row.client_phone, whatsappMessage(row, profile));
}
