import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { lineTotal, type QuoteLine, type Totals } from "@/lib/calc/engine";
import type { Mode } from "@/lib/calc/engine";
import { formatDate, formatDecimal, formatNumber, pdfMoney } from "@/lib/format";
import { MODE_LABEL } from "@/lib/types";

export interface PdfCompany {
  name: string;
  address: string;
  phone: string;
  email: string;
  ninea: string;
}

export interface PdfLogo {
  dataUrl: string;
  width: number;
  height: number;
}

export interface PdfQuote {
  number: string;
  date: string | Date;
  validUntil: string | Date | null;
  client: { name: string; phone: string; city: string };
  mode: Mode;
  kwc: number;
  lines: QuoteLine[];
  remisePct: number;
  tvaPct: number;
  totals: Totals;
  summary: {
    consoJourKwh: number;
    nPanels: number;
    panelWc: number;
    inverter: string | null;
    nInv: number;
    inverterKw: number | null;
    nBatt: number;
    batteryKwh: number | null;
    prodMoisKwh: number;
    ecoMois: number | null;
    roiAnnees: number | null;
  };
  conditions: string;
}

/**
 * La police standard Helvetica de jsPDF couvre le jeu Latin-1 / WinAnsi (é, è, à, ç, ô, «, », ×, •).
 * On remplace les rares caractères hors de ce jeu (espaces fines insécables, signe moins, etc.).
 */
export function pdfText(s: unknown): string {
  return String(s ?? "")
    .replace(/[    ]/g, " ")
    .replace(/[−‐‑]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/≈/g, "env.")
    // Supprime tout ce que la police standard ne sait pas dessiner (emoji, écritures non latines)
    .replace(/[^\u0000-ÿ€–—•ŒœŠšŸŽž]/g, "");
}

const INK: [number, number, number] = [23, 34, 28];
const MUTED: [number, number, number] = [95, 108, 100];
const GREEN: [number, number, number] = [14, 122, 74];
const LINE: [number, number, number] = [226, 230, 223];

const qtyText = (l: QuoteLine) =>
  l.unit === "kWc" ? `${formatDecimal(l.qty, 2, " ")} kWc` : l.unit === "forfait" ? "1 forfait" : formatDecimal(l.qty, 2, " ");

export function buildQuotePdf(company: PdfCompany, q: PdfQuote, logo?: PdfLogo | null): jsPDF {
  const d = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, H = 297, M = 16;
  const T = pdfText;
  d.setProperties({ title: `Devis ${q.number}`, subject: `Devis ${q.number} - ${q.client.name}`, author: company.name, creator: "SolaDevis" });

  /* -------- En-tête : logo + entreprise à gauche, DEVIS à droite */
  let y = 16;
  let leftY = y;
  if (logo) {
    try {
      const h = 16, w = Math.min(50, h * (logo.width / logo.height));
      const fmt = logo.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      d.addImage(logo.dataUrl, fmt, M, y, w, h);
      leftY = y + h + 5;
    } catch {
      /* logo illisible : on continue sans */
    }
  }
  d.setTextColor(...INK);
  d.setFont("helvetica", "bold");
  d.setFontSize(12);
  d.text(T(company.name || "Votre entreprise"), M, leftY + 1);
  d.setFont("helvetica", "normal");
  d.setFontSize(9);
  d.setTextColor(...MUTED);
  let ly = leftY + 6;
  [company.address, company.phone, company.email, company.ninea ? `NINEA / RC : ${company.ninea}` : ""]
    .filter(Boolean)
    .forEach((l) => { d.text(T(l), M, ly); ly += 4.3; });

  d.setTextColor(...GREEN);
  d.setFont("helvetica", "bold");
  d.setFontSize(24);
  d.text("DEVIS", W - M, y + 8, { align: "right" });
  d.setFontSize(10);
  d.setTextColor(...INK);
  d.text(T(q.number), W - M, y + 15, { align: "right" });
  d.setFont("helvetica", "normal");
  d.setFontSize(9);
  d.setTextColor(...MUTED);
  d.text(T(`Date : ${formatDate(q.date)}`), W - M, y + 20.5, { align: "right" });
  if (q.validUntil) d.text(T(`Valable jusqu'au : ${formatDate(q.validUntil)}`), W - M, y + 25, { align: "right" });

  /* -------- Bloc client */
  y = Math.max(ly, y + 30);
  const boxX = W / 2 + 4, boxW = W - M - boxX;
  const clientLines = [q.client.phone, q.client.city].filter(Boolean);
  const boxH = 13 + clientLines.length * 4.5;
  d.setFillColor(245, 246, 242);
  d.roundedRect(boxX, y, boxW, boxH, 2, 2, "F");
  d.setFontSize(7.5);
  d.setTextColor(...MUTED);
  d.text("CLIENT", boxX + 5, y + 5.5);
  d.setFont("helvetica", "bold");
  d.setFontSize(11);
  d.setTextColor(...INK);
  d.text(T(q.client.name || "-"), boxX + 5, y + 11, { maxWidth: boxW - 10 });
  d.setFont("helvetica", "normal");
  d.setFontSize(9);
  clientLines.forEach((l, i) => d.text(T(l), boxX + 5, y + 16 + i * 4.5));

  /* -------- Objet */
  y += boxH + 7.5;
  d.setFont("helvetica", "bold");
  d.setFontSize(10.5);
  d.setTextColor(...INK);
  d.text(T(`Objet : installation solaire de ${formatDecimal(q.kwc, 2, " ")} kWc - ${MODE_LABEL[q.mode]}`), M, y, { maxWidth: W - 2 * M });
  y += 4;

  /* -------- Tableau des lignes */
  autoTable(d, {
    startY: y,
    margin: { left: M, right: M, bottom: 22 },
    head: [["Désignation", "Qté", "Prix unitaire", "Total"]],
    body: q.lines.map((l) => [T(l.label), T(qtyText(l)), T(pdfMoney(l.unitPrice ?? 0)), T(pdfMoney(lineTotal(l)))]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, textColor: INK, lineColor: LINE, lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold", fontSize: 9, lineWidth: 0 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 24 },
      2: { halign: "right", cellWidth: 34 },
      3: { halign: "right", cellWidth: 36, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "head" && data.column.index > 0) data.cell.styles.halign = "right";
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((d as any).lastAutoTable?.finalY ?? y) + 6;

  /* -------- Totaux */
  const rows: [string, string, boolean][] = [["Total HT", pdfMoney(q.totals.ht), false]];
  if (q.totals.remise > 0) {
    rows.push([`Remise ${formatDecimal(q.remisePct, 1, " ")} %`, `- ${pdfMoney(q.totals.remise)}`, false]);
    rows.push(["Total HT après remise", pdfMoney(q.totals.base), false]);
  }
  rows.push([`TVA ${formatDecimal(q.tvaPct, 1, " ")} %`, pdfMoney(q.totals.tva), false]);
  const totH = rows.length * 5.5 + 14;
  if (y + totH > H - 24) { d.addPage(); y = 20; }
  const tx = W - M - 82;
  d.setFontSize(9.5);
  rows.forEach(([a, b]) => {
    d.setFont("helvetica", "normal");
    d.setTextColor(...MUTED);
    d.text(T(a), tx, y);
    d.setTextColor(...INK);
    d.text(T(b), W - M, y, { align: "right" });
    y += 5;
  });
  d.setFillColor(...GREEN);
  d.roundedRect(tx - 3, y - 2, W - M - tx + 3, 10, 1.5, 1.5, "F");
  d.setTextColor(255, 255, 255);
  d.setFont("helvetica", "bold");
  d.setFontSize(11);
  d.text("Total TTC", tx, y + 4.6);
  d.text(T(pdfMoney(q.totals.ttc)), W - M - 3, y + 4.6, { align: "right" });
  y += 14;

  /* -------- Votre installation */
  const s = q.summary;
  const tech = [
    `Consommation estimée : ${formatDecimal(s.consoJourKwh, 1, " ")} kWh par jour`,
    `Panneaux : ${s.nPanels} x ${formatNumber(s.panelWc, 0, " ")} Wc, soit ${formatDecimal(q.kwc, 2, " ")} kWc`,
    s.inverter ? `Onduleur : ${s.nInv > 1 ? `${s.nInv} x ` : ""}${formatDecimal(s.inverterKw ?? 0, 1, " ")} kW (${s.inverter})` : "",
    q.mode !== "reseau" && s.nBatt && s.batteryKwh ? `Stockage : ${s.nBatt} x ${formatDecimal(s.batteryKwh, 1, " ")} kWh, soit ${formatDecimal(s.nBatt * s.batteryKwh, 1, " ")} kWh` : "",
    `Production estimée : ${formatNumber(s.prodMoisKwh, 0, " ")} kWh par mois`,
    s.ecoMois != null ? `Économie estimée : ${pdfMoney(s.ecoMois)} par mois${s.roiAnnees ? `, retour sur investissement en environ ${formatDecimal(s.roiAnnees, 1, " ")} ans` : ""}` : "",
  ].filter(Boolean);
  const techH = 10 + tech.length * 4.6;
  if (y + techH > H - 24) { d.addPage(); y = 20; }
  d.setFillColor(255, 245, 223);
  d.roundedRect(M, y, W - 2 * M, techH, 2, 2, "F");
  d.setFillColor(242, 165, 22);
  d.rect(M, y, 1.2, techH, "F");
  d.setFont("helvetica", "bold");
  d.setFontSize(10);
  d.setTextColor(...INK);
  d.text("Votre installation", M + 6, y + 6.5);
  d.setFont("helvetica", "normal");
  d.setFontSize(9);
  tech.forEach((l, i) => d.text(T(`•  ${l}`), M + 6, y + 12 + i * 4.6, { maxWidth: W - 2 * M - 12 }));
  y += techH + 6;

  /* -------- Conditions (à gauche) + Bon pour accord (à droite) */
  const signW = 74, gap = 8, condW = W - 2 * M - signW - gap;
  const cond = q.conditions.trim() ? (d.setFontSize(8.6), d.splitTextToSize(T(q.conditions), condW) as string[]) : [];
  const blockH = Math.max(cond.length ? 8 + cond.length * 4 : 0, 31);
  if (y + blockH > H - 16) { d.addPage(); y = 20; }
  if (cond.length) {
    d.setFont("helvetica", "bold");
    d.setFontSize(9.5);
    d.setTextColor(...INK);
    d.text("Conditions", M, y + 3);
    d.setFont("helvetica", "normal");
    d.setFontSize(8.6);
    d.setTextColor(...MUTED);
    cond.forEach((l, i) => d.text(l, M, y + 8 + i * 4));
  }
  const sx = W - M - signW;
  d.setFont("helvetica", "bold");
  d.setFontSize(9.5);
  d.setTextColor(...INK);
  d.text("Bon pour accord", sx, y + 3);
  d.setFont("helvetica", "normal");
  d.setFontSize(7.8);
  d.setTextColor(...MUTED);
  d.text("Date, signature et cachet du client", sx, y + 7);
  d.setDrawColor(200, 206, 198);
  d.setLineWidth(0.25);
  d.roundedRect(sx, y + 9, signW, 22, 1.5, 1.5);

  /* -------- Pied de page discret sur chaque page */
  const pages = d.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    d.setPage(p);
    d.setDrawColor(...LINE);
    d.setLineWidth(0.2);
    d.line(M, H - 13, W - M, H - 13);
    d.setFont("helvetica", "normal");
    d.setFontSize(7.5);
    d.setTextColor(108, 118, 112);
    const foot = [company.name, company.phone, company.email, company.ninea ? `NINEA / RC ${company.ninea}` : ""].filter(Boolean).join("  ·  ");
    d.text(T(foot), M, H - 8.5, { maxWidth: W - 2 * M - 30 });
    d.text(T(`${q.number}  ·  Page ${p}/${pages}`), W - M, H - 8.5, { align: "right" });
  }
  return d;
}

/** Charge une image (URL publique) et la convertit en PNG data URL, avec ses dimensions. */
export async function loadLogo(url: string | null): Promise<PdfLogo | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const max = 600, k = Math.min(1, max / bmp.width);
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return { dataUrl: c.toDataURL("image/png"), width: c.width, height: c.height };
  } catch {
    return null;
  }
}
