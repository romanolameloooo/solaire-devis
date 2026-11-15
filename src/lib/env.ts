/** Variables d'environnement publiques (lisibles dans le navigateur). */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const PAYMENT_LINK = process.env.NEXT_PUBLIC_PAYMENT_LINK || "";
/** Tarif affiché sur la landing et l'écran d'abonnement, ex. « 15 000 FCFA / mois » */
export const PRICE_LABEL = process.env.NEXT_PUBLIC_PRICE_LABEL || "15 000 FCFA / mois";
export const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "";

export const isSupabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export function logoPublicUrl(path: string | null | undefined, version?: string | number) {
  if (!path || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/logos/${path}${version ? `?v=${version}` : ""}`;
}
