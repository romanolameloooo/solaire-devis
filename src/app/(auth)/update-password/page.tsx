"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Notice } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { authErrorFr } from "@/lib/auth-errors";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<{ pw?: string; pw2?: string }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fe: typeof err = {};
    if (pw.length < 8) fe.pw = "8 caractères minimum.";
    if (pw2 !== pw) fe.pw2 = "Les deux mots de passe ne sont pas identiques.";
    setErr(fe);
    if (Object.keys(fe).length) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setLoading(false);
      return setFormError("Le lien a expiré. Demandez un nouveau lien depuis « Mot de passe oublié ».");
    }
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return setFormError(authErrorFr(error.message));
    toast.success("Mot de passe modifié");
    router.replace("/app");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Nouveau mot de passe</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Choisissez un mot de passe d&apos;au moins 8 caractères.</p>
      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        {formError && <Notice>{formError}</Notice>}
        <Field label="Nouveau mot de passe" htmlFor="pw" error={err.pw}>
          <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} invalid={!!err.pw} />
        </Field>
        <Field label="Confirmez le mot de passe" htmlFor="pw2" error={err.pw2}>
          <Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} invalid={!!err.pw2} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>Enregistrer</Button>
      </form>
    </>
  );
}
