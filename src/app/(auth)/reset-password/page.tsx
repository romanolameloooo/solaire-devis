"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Notice } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { authErrorFr, isEmail } from "@/lib/auth-errors";
import { Turnstile, useAntiSpam } from "@/components/anti-spam";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const spam = useAntiSpam();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(email)) return setErr("Adresse email invalide.");
    setErr("");
    if (spam.isBot()) return setSent(true);
    if (spam.captchaMissing()) return setFormError("Cochez la vérification anti-robot ci-dessous.");
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      captchaToken: spam.captchaToken ?? undefined,
    });
    setLoading(false);
    if (error) return setFormError(authErrorFr(error.message));
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary"><MailCheck className="size-6" /></span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Email envoyé</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Si un compte existe pour <strong className="text-foreground">{email}</strong>, vous allez recevoir un lien pour choisir un nouveau mot de passe.
        </p>
        <Button asChild variant="outline" className="mt-6"><Link href="/login">Retour à la connexion</Link></Button>
      </div>
    );
  }

  return (
    <>
      <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Connexion</Link>
      <h1 className="text-2xl font-bold tracking-tight">Mot de passe oublié</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Indiquez votre email, nous vous envoyons un lien pour en choisir un nouveau.</p>
      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        {formError && <Notice>{formError}</Notice>}
        <Field label="Email" htmlFor="email" error={err}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!err} />
        </Field>
        {spam.trap}
        <Turnstile onToken={spam.setCaptchaToken} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>Envoyer le lien</Button>
      </form>
    </>
  );
}
