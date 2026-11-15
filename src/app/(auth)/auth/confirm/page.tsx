"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, MailCheck } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";

/**
 * Page d'arrivée des liens envoyés par email (modèles Supabase avec {{ .TokenHash }}).
 *
 * Le lien n'est utilisé qu'au clic sur le bouton : les robots anti-spam qui ouvrent
 * automatiquement les liens des emails ne cliquent pas, ils ne peuvent donc plus le « consommer »
 * à la place de l'utilisateur. Fonctionne aussi si l'email est ouvert sur un autre appareil.
 */
function Confirm() {
  const params = useSearchParams();
  const tokenHash = params.get("token_hash");
  const type = (params.get("type") || "recovery") as EmailOtpType;
  const recovery = type === "recovery";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    if (!tokenHash) return;
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      setLoading(false);
      setError("Ce lien a expiré ou a déjà servi. Demandez-en un nouveau : il est valable 1 heure.");
      return;
    }
    window.location.replace(recovery ? "/update-password" : "/app");
  }

  if (!tokenHash) {
    return (
      <>
        <h1 className="text-2xl font-bold tracking-tight">Lien incomplet</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">Ce lien ne contient pas toutes les informations nécessaires. Demandez un nouvel email.</p>
        <Button asChild className="mt-6 w-full" size="lg"><Link href="/reset-password">Recevoir un nouveau lien</Link></Button>
      </>
    );
  }

  return (
    <div className="text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        {recovery ? <KeyRound className="size-6" /> : <MailCheck className="size-6" />}
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">{recovery ? "Nouveau mot de passe" : "Activez votre compte"}</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        {recovery ? "Cliquez ci-dessous pour choisir votre nouveau mot de passe." : "Cliquez ci-dessous pour confirmer votre adresse email."}
      </p>
      {error && <Notice className="mt-6 text-left">{error}</Notice>}
      {error ? (
        <Button asChild size="lg" className="mt-6 w-full"><Link href={recovery ? "/reset-password" : "/login"}>{recovery ? "Recevoir un nouveau lien" : "Se connecter"}</Link></Button>
      ) : (
        <Button size="lg" className="mt-6 w-full" onClick={go} loading={loading}>
          {recovery ? "Choisir mon nouveau mot de passe" : "Confirmer mon email"}
        </Button>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <Confirm />
    </Suspense>
  );
}
