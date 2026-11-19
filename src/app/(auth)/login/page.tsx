"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Notice } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { authErrorFr, isEmail } from "@/lib/auth-errors";
import { Turnstile, useAntiSpam } from "@/components/anti-spam";
import { ResendConfirmation } from "@/components/resend-confirmation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const erreur = params.get("erreur");
  const [error, setError] = useState(
    erreur === "lien" ? "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau."
    : erreur === "equipe" ? "Votre compte n'est rattaché à aucune entreprise : vous avez peut-être été retiré de l'équipe. Contactez votre responsable."
    : "",
  );
  // Compte sans entreprise : on ferme la session pour éviter une boucle de redirection
  useEffect(() => { if (erreur === "equipe") createClient().auth.signOut(); }, [erreur]);
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const spam = useAntiSpam();
  const [unconfirmed, setUnconfirmed] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fe: typeof fieldErr = {};
    if (!isEmail(email)) fe.email = "Adresse email invalide.";
    if (!password) fe.password = "Saisissez votre mot de passe.";
    setFieldErr(fe);
    if (Object.keys(fe).length) return;
    if (spam.captchaMissing()) return setError("Cochez la vérification anti-robot ci-dessous.");
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password, options: { captchaToken: spam.captchaToken ?? undefined } });
    if (error) {
      setLoading(false);
      setUnconfirmed(/not confirmed/i.test(error.message));
      return setError(authErrorFr(error.message));
    }
    router.replace(safeNext);
    router.refresh();
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Bon retour</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Connectez-vous pour retrouver vos devis.</p>
      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        {error && <Notice>{error}</Notice>}
        {unconfirmed && <ResendConfirmation email={email.trim()} className="w-full" />}
        <Field label="Email" htmlFor="email" error={fieldErr.email}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!fieldErr.email} />
        </Field>
        <div className="relative">
          <Field label="Mot de passe" htmlFor="password" error={fieldErr.password}>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!fieldErr.password} />
          </Field>
          <Link href="/reset-password" className="absolute right-0 top-0 text-[13px] leading-none text-primary hover:underline">Mot de passe oublié ?</Link>
        </div>
        {spam.trap}
        <Turnstile onToken={spam.setCaptchaToken} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>Se connecter</Button>
      </form>
      <p className="mt-6 text-center text-[14px] text-muted-foreground">
        Pas encore de compte ? <Link href="/signup" className="font-medium text-primary hover:underline">Essai gratuit 15 jours</Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
