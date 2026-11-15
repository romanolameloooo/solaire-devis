"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Récupère les liens d'email Supabase (mot de passe oublié, confirmation) quand ils arrivent
 * avec la session dans l'ancre de l'URL (#access_token=…), ou avec une erreur (#error=…).
 * Le serveur ne voit jamais cette partie de l'URL : seul le navigateur peut la traiter.
 */
export function AuthHashHandler() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash || !/(access_token|error_code|error)=/.test(hash)) return;
    const p = new URLSearchParams(hash);
    const clean = () => history.replaceState(null, "", window.location.pathname + window.location.search);

    if (p.get("error") || p.get("error_code")) {
      clean();
      window.location.replace("/login?erreur=lien");
      return;
    }
    const access_token = p.get("access_token");
    const refresh_token = p.get("refresh_token");
    if (!access_token || !refresh_token) return;
    const type = p.get("type");
    clean();
    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }: { error: unknown }) => {
        if (error) window.location.replace("/login?erreur=lien");
        else window.location.replace(type === "recovery" ? "/update-password" : "/app");
      });
  }, []);
  return null;
}
