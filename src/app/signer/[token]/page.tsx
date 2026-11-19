import type { Metadata } from "next";
import { LinkIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { RemoteSign, type RemoteData } from "./remote-sign";

export const metadata: Metadata = { title: "Signer votre devis", robots: { index: false, follow: false } };
// Jamais de cache : l'état (signé ou non) doit toujours être à jour
export const dynamic = "force-dynamic";

/**
 * Page publique de signature à distance. Sans compte : le jeton du lien est la seule clé.
 * Elle n'affiche que CE devis (la fonction get_quote_for_signature ne renvoie rien d'autre).
 */
export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_quote_for_signature", { p_token: token });
  const res = (data ?? { error: "invalid" }) as RemoteData | { error: "invalid" | "expired" };

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          {"error" in res ? <Brand href="/" /> : <span className="truncate text-[15px] font-semibold">{res.company.company_name || "Votre installateur"}</span>}
          <span className="text-[12px] text-muted-foreground">Signature sécurisée</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">
        {"error" in res ? (
          <div className="py-10 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive-soft text-destructive"><LinkIcon className="size-6" /></span>
            <h1 className="mt-5 text-2xl font-bold tracking-tight">{res.error === "expired" ? "Ce lien a expiré" : "Lien introuvable"}</h1>
            <p className="mt-2 text-[15px] text-muted-foreground">
              {res.error === "expired"
                ? "La date de validité de ce devis est dépassée. Demandez à votre installateur de vous envoyer un nouveau lien."
                : "Ce lien n'est pas valide ou a été remplacé par un plus récent. Vérifiez le dernier message de votre installateur."}
            </p>
          </div>
        ) : (
          <RemoteSign token={token} data={res} />
        )}
      </main>
    </div>
  );
}
