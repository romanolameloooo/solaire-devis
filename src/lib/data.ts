import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

/**
 * Utilisateur connecté, son rôle et l'entreprise à laquelle il appartient.
 * `profile` est la fiche de l'ENTREPRISE (celle du propriétaire), y compris pour un technicien.
 * Redirige vers /login si personne n'est connecté.
 */
export const requireProfile = cache(async (allowNotOnboarded: boolean = false) => {
  const supabase = await createClient();
  // getClaims vérifie la signature du jeton localement (clés asymétriques) : pas d'appel réseau en plus
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const user = { id: claims.sub, email: (claims.email as string | undefined) ?? null };

  const { data: member } = await supabase.from("team_members").select("company_id, role").eq("user_id", user.id).maybeSingle<{ company_id: string; role: Role }>();
  if (!member) redirect("/login?erreur=equipe");
  const role = member.role;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", member.company_id).single<Profile>();
  if (!profile) redirect("/login?erreur=profil");
  // L'onboarding (prix, entreprise) ne concerne que le propriétaire
  if (role === "owner" && !profile.onboarded && !allowNotOnboarded) redirect("/onboarding");
  return { supabase, user, profile, role, companyId: member.company_id, isOwner: role === "owner" };
});

/** Réservé au propriétaire : redirige un technicien vers ses devis. */
export async function requireOwner() {
  const ctx = await requireProfile();
  if (!ctx.isOwner) redirect("/app");
  return ctx;
}
