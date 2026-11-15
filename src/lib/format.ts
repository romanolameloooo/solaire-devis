/**
 * Formats français, indépendants de Intl pour un rendu identique serveur / navigateur / PDF.
 * Les milliers sont séparés par une espace insécable à l'écran (pas de retour à la ligne au milieu
 * d'un montant) et par une espace simple dans le PDF (police standard).
 */
const NBSP = " ";

export function formatNumber(n: number, decimals = 0, sep = NBSP): string {
  if (!Number.isFinite(n)) return "0";
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [intRaw, dec] = fixed.split(".");
  const int = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  const out = dec ? `${int},${dec}` : int;
  return (neg && Number(fixed) !== 0 ? "-" : "") + out;
}

/** Nombre avec au plus `decimals` décimales, sans zéros inutiles (2,5 et non 2,50). */
export function formatDecimal(n: number, decimals = 2, sep = NBSP): string {
  const s = formatNumber(n, decimals, sep);
  return s.includes(",") ? s.replace(/,?0+$/, "") : s;
}

/** « 1 250 000 FCFA » */
export function formatFCFA(n: number, sep = NBSP): string {
  return `${formatNumber(Math.round(n), 0, sep)}${sep}FCFA`;
}

export const pdfMoney = (n: number) => formatFCFA(n, " ");

export function formatDate(d: string | Date): string {
  const x = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(x.getTime())) return "";
  const p = (v: number) => String(v).padStart(2, "0");
  return `${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()}`;
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export function formatDateShort(d: string | Date): string {
  const x = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(x.getTime())) return "";
  return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}

export function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400000);
}

/**
 * Numéro WhatsApp international, chiffres seulement (wa.me).
 * Un numéro local sénégalais à 9 chiffres (7X XXX XX XX) reçoit l'indicatif 221.
 */
export function waNumber(phone: string, defaultCountry = "221"): string {
  let d = (phone || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.length === 9 || d.length === 10) d = defaultCountry + d.replace(/^0/, "");
  return d.replace(/\D/g, "");
}

export function whatsappLink(phone: string, message: string): string {
  const n = waNumber(phone);
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

/** Nom de fichier sans accents ni caractères spéciaux. */
export function slugify(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
