"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { authRedirectBase } from "@/lib/env";
import { authErrorFr } from "@/lib/auth-errors";

/** Renvoie l'email de confirmation d'inscription (attente d'une minute entre deux envois). */
export function ResendConfirmation({ email, className }: { email: string; className?: string }) {
  const [wait, setWait] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function resend() {
    setLoading(true);
    const { error } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${authRedirectBase()}/auth/callback?next=/onboarding` },
    });
    setLoading(false);
    if (error) return toast.error(authErrorFr(error.message));
    toast.success("Email renvoyé", { description: "Regardez aussi dans vos spams." });
    setWait(60);
  }

  return (
    <Button type="button" variant="outline" className={className} onClick={resend} loading={loading} disabled={wait > 0 || !email}>
      {wait > 0 ? `Renvoyer l'email (${wait} s)` : "Renvoyer l'email de confirmation"}
    </Button>
  );
}
