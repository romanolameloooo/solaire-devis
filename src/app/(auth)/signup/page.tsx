"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Notice } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { authErrorFr, isEmail } from "@/lib/auth-errors";
import { Turnstile, useAntiSpam } from "@/components/anti-spam";

type Errors = Partial<Record<"company" | "email" | "phone" | "password", string>>;

export default function SignupPage() {
  const router = useRouter();
  const [f, setF] = useState({ company: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const spam = useAntiSpam();

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF({ ...f, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Errors = {};
    if (!f.company.trim()) er.company = "Indiquez le nom de votre entreprise.";
    if (!isEmail(f.email)) er.email = "Adresse email invalide.";
    if (f.phone.replace(/\D/g, "").length < 8) er.phone = "Numéro de téléphone incomplet.";
    if (f.password.length < 8) er.password = "8 caractères minimum.";
    setErrors(er);
    if (Object.keys(er).length) return;
    // Robot détecté : on affiche le même écran qu'un succès, sans rien créer
    if (spam.isBot()) return setSentTo(f.email.trim());
    if (spam.captchaMissing()) return setFormError("Cochez la vérification anti-robot ci-dessous.");

    setLoading(true);
    setFormError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: {
        data: { company_name: f.company.trim(), phone: f.phone.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        captchaToken: spam.captchaToken ?? undefined,
      },
    });
    setLoading(false);
    if (error) return setFormError(authErrorFr(error.message));
    // Email déjà utilisé : Supabase renvoie un utilisateur sans identité
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return setFormError(authErrorFr("already registered"));
    }
    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
    } else {
      setSentTo(f.email.trim());
    }
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary"><MailCheck className="size-6" /></span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Vérifiez votre boîte mail</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Un lien de confirmation a été envoyé à <strong className="text-foreground">{sentTo}</strong>. Cliquez dessus pour activer votre compte.
        </p>
        <p className="mt-6 text-[13px] text-muted-foreground">Rien reçu ? Regardez dans les spams, ou <button className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => setSentTo("")}>corrigez l&apos;adresse</button>.</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Créer votre compte</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">15 jours d&apos;essai gratuit, sans moyen de paiement.</p>
      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        {formError && <Notice>{formError}</Notice>}
        <Field label="Nom de l'entreprise" htmlFor="company" error={errors.company}>
          <Input id="company" autoComplete="organization" placeholder="Ex : Soleil Énergie SARL" value={f.company} onChange={set("company")} invalid={!!errors.company} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="vous@entreprise.sn" value={f.email} onChange={set("email")} invalid={!!errors.email} />
        </Field>
        <Field label="Téléphone" htmlFor="phone" error={errors.phone}>
          <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+221 77 000 00 00" value={f.phone} onChange={set("phone")} invalid={!!errors.phone} />
        </Field>
        <Field label="Mot de passe" htmlFor="password" error={errors.password} hint="8 caractères minimum.">
          <div className="relative">
            <Input id="password" type={show ? "text" : "password"} autoComplete="new-password" value={f.password} onChange={set("password")} invalid={!!errors.password} className="pr-11" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        {spam.trap}
        <Turnstile onToken={spam.setCaptchaToken} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>Créer mon compte</Button>
        <p className="text-center text-[12.5px] leading-snug text-muted-foreground">
          En créant un compte, vous acceptez les <Link href="/cgu" className="underline underline-offset-2 hover:text-foreground">conditions d&apos;utilisation</Link> et
          la <Link href="/confidentialite" className="underline underline-offset-2 hover:text-foreground">politique de confidentialité</Link>.
        </p>
      </form>
      <p className="mt-6 text-center text-[14px] text-muted-foreground">
        Déjà un compte ? <Link href="/login" className="font-medium text-primary hover:underline">Se connecter</Link>
      </p>
    </>
  );
}
