"use client";
import { computeTotals } from "@/lib/calc/engine";
import { logoPublicUrl } from "@/lib/env";
import { formatDate, formatDecimal, formatFCFA, slugify, whatsappLink } from "@/lib/format";
import type { PdfAnnex, PdfQuote } from "@/lib/pdf/quote-pdf";
import { createClient } from "@/lib/supabase/client";
import type { Profile, QuotePhoto, QuoteRow } from "@/lib/types";

/** Champs de l'entreprise utilisés par le PDF (fiche complète dans l'app, extrait sur la page de signature publique). */
export type PdfProfile = Pick<Profile, "company_name" | "address" | "phone" | "company_email" | "ninea" | "logo_path" | "conditions">;
export interface PdfOptions { annex?: boolean }

export function rowToPdfQuote(row: QuoteRow, profile: PdfProfile): PdfQuote {
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
    signature: row.signed_at && row.signature_image
      ? { image: row.signature_image, name: row.signer_name ?? row.client_name, signedAt: row.signed_at, hash: row.signature_hash ?? "", method: row.signature_method ?? null }
      : null,
  };
}

export const pdfFileName = (row: QuoteRow) =>
  `Devis-${row.number}-${slugify(row.client_name) || "client"}${row.signed_at ? "-signe" : ""}.pdf`;

/** Visite + photos du devis pour l'annexe du PDF (photos lues dans le stockage privé via des liens temporaires). */
async function loadAnnex(row: QuoteRow): Promise<PdfAnnex> {
  const { loadPhoto } = await import("@/lib/pdf/quote-pdf");
  const supabase = createClient();
  const { data } = await supabase.from("quote_photos").select("*").eq("quote_id", row.id).order("created_at");
  const rows = (data ?? []) as QuotePhoto[];
  let photos: PdfAnnex["photos"] = [];
  if (rows.length) {
    const { data: signed } = await supabase.storage.from("quote-photos").createSignedUrls(rows.map((r) => r.path), 600);
    const loaded = await Promise.all(rows.map((r, i) => (signed?.[i]?.signedUrl ? loadPhoto(signed[i].signedUrl!, r.caption) : Promise.resolve(null))));
    photos = loaded.filter((p): p is NonNullable<typeof p> => !!p);
  }
  return { visit: row.visit ?? {}, photos };
}

async function makePdf(row: QuoteRow, profile: PdfProfile, opts: PdfOptions = {}) {
  const { buildQuotePdf, loadLogo } = await import("@/lib/pdf/quote-pdf");
  const [logo, annex] = await Promise.all([
    loadLogo(logoPublicUrl(profile.logo_path, profile.logo_path ? new Date().getTime() : undefined)),
    opts.annex ? loadAnnex(row) : Promise.resolve(null),
  ]);
  return buildQuotePdf(
    { name: profile.company_name, address: profile.address, phone: profile.phone, email: profile.company_email, ninea: profile.ninea },
    rowToPdfQuote(row, profile),
    logo,
    annex,
  );
}

export async function downloadQuotePdf(row: QuoteRow, profile: PdfProfile, opts: PdfOptions = {}) {
  const doc = await makePdf(row, profile, opts);
  doc.save(pdfFileName(row));
}

/** Ouvre le PDF dans un nouvel onglet avec la boîte d'impression. */
export async function printQuotePdf(row: QuoteRow, profile: PdfProfile, opts: PdfOptions = {}) {
  // L'onglet est ouvert tout de suite (pendant le clic), sinon le navigateur le bloque
  const w = window.open("", "_blank");
  const doc = await makePdf(row, profile, opts);
  doc.autoPrint();
  const url = doc.output("bloburl") as unknown as string;
  if (w) w.location.href = url;
  else window.location.href = url;
}

/** Partage natif du PDF (WhatsApp, e-mail…) quand le téléphone le permet. */
export async function shareQuotePdf(row: QuoteRow, profile: PdfProfile, opts: PdfOptions = {}): Promise<"shared" | "unsupported" | "cancelled"> {
  const doc = await makePdf(row, profile, opts);
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

export function whatsappMessage(row: QuoteRow, profile: Pick<PdfProfile, "company_name" | "phone">) {
  const name = row.client_name ? ` ${row.client_name}` : "";
  return [
    `Bonjour${name},`,
    "",
    row.signed_at
      ? `Voici votre devis ${row.number} signé le ${formatDate(row.signed_at)}, pour une installation solaire de ${formatDecimal(row.kwc, 2)} kWc.`
      : `Voici votre devis ${row.number} pour une installation solaire de ${formatDecimal(row.kwc, 2)} kWc.`,
    `Montant total : ${formatFCFA(row.total_ttc)} TTC.`,
    "Le devis détaillé en PDF est joint à ce message.",
    "",
    "Je reste disponible pour toute question.",
    profile.company_name ? `${profile.company_name}${profile.phone ? ` - ${profile.phone}` : ""}` : "",
  ].filter((l, i, a) => l !== "" || (a[i - 1] ?? "") !== "").join("\n").trim();
}

export function whatsappUrl(row: QuoteRow, profile: Pick<PdfProfile, "company_name" | "phone">) {
  return whatsappLink(row.client_phone, whatsappMessage(row, profile));
}

/** Message WhatsApp pour envoyer le lien de signature à distance. */
export function signLinkMessage(row: QuoteRow, profile: Pick<PdfProfile, "company_name">, link: string, expiresAt: string) {
  return [
    `Bonjour${row.client_name ? ` ${row.client_name}` : ""},`,
    "",
    `Voici votre devis ${row.number} (${formatFCFA(row.total_ttc)} TTC) pour votre installation solaire.`,
    "Vous pouvez le consulter et le signer depuis votre téléphone, sans créer de compte :",
    link,
    "",
    `Ce lien est valable jusqu'au ${formatDate(expiresAt)}.`,
    ...(profile.company_name ? [profile.company_name] : []),
  ].join("\n");
}
