import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Utilisateur connecté + profil. Redirige vers /login si absent. */
export const requireProfile = cache(async (allowNotOnboarded: boolean = false) => {
  const supabase = await createClient();
  // getClaims vérifie la signature du jeton localement (clés asymétriques) : pas d'appel réseau en plus
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const user = { id: claims.sub, email: (claims.email as string | undefined) ?? null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) redirect("/login?erreur=profil");
  if (!profile.onboarded && !allowNotOnboarded) redirect("/onboarding");
  return { supabase, user, profile };
});
