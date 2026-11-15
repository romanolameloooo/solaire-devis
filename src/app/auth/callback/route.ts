import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Retour des liens envoyés par email (confirmation d'inscription, mot de passe oublié). */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Adresse officielle du site : sur Netlify, l'URL de la requête porte l'adresse interne du déploiement,
  // ce qui enverrait l'utilisateur (et sa session) sur une autre adresse que celle du site.
  const base = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") || "/app";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/app";

  // Lien « à ancre » (#access_token=…) : le serveur ne voit pas l'ancre. On passe directement à la page
  // demandée ; le navigateur conserve l'ancre et AuthHashHandler y ouvre la session.
  if (!code && !tokenHash) return NextResponse.redirect(`${base}${next}`);

  const supabase = await createClient();
  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;

  if (ok) {
    // Méthode de connexion inscrite dans le jeton : « recovery » = lien de mot de passe oublié
    const { data } = await supabase.auth.getClaims();
    const amr = (data?.claims?.amr as { method?: string }[] | undefined) ?? [];
    const recovery = type === "recovery" || amr.some((m) => m.method === "recovery");
    return NextResponse.redirect(`${base}${recovery ? "/update-password" : next}`);
  }
  return NextResponse.redirect(`${base}/login?erreur=lien`);
}
