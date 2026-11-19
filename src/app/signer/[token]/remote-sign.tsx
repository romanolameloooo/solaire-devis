"use client";
import { useState } from "react";
import { BadgeCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SignForm, SIGNATURE_DISCLAIMER } from "@/components/quote/sign-sheet";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { formatSignedAt, shortHash } from "@/lib/pdf/quote-pdf";
import { downloadQuotePdf, type PdfProfile } from "@/lib/quote/pdf-actions";
import type { QuoteRow } from "@/lib/types";

export interface RemoteData {
  quote: Pick<QuoteRow, "number" | "created_at" | "valid_until" | "client_name" | "client_phone" | "client_city" | "mode" | "kwc" | "lines" | "remise_pct" | "tva_pct" | "total_ht" | "total_ttc" | "result" | "status" | "signed_at" | "signer_name" | "signature_image" | "signature_hash" | "signature_method"> & { expires_at: string | null };
  company: PdfProfile;
}

const MESSAGES: Record<string, string> = {
  EXPIRED_TOKEN: "Ce lien a expiré. Demandez un nouveau lien à votre installateur.",
  ALREADY_SIGNED: "Ce devis a déjà été signé.",
  INVALID_TOKEN: "Ce lien n'est plus valide. Vérifiez le dernier message de votre installateur.",
  INVALID_SIGNATURE: "La signature est trop petite ou illisible : recommencez.",
  INVALID_NAME: "Indiquez votre nom.",
  NOT_ACCEPTED: "Cochez la case « J'accepte ce devis ».",
};

export function RemoteSign({ token, data: initial }: { token: string; data: RemoteData }) {
  const [data, setData] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const q = data.quote;
  const signed = !!q.signed_at;

  async function submit({ name, image }: { name: string; image: string }) {
    setSubmitting(true);
    setError("");
    const supabase = createClient();
    const { data: res, error: e } = await supabase.rpc("sign_quote_remote", { p_token: token, p_name: name, p_image: image, p_accept: true });
    setSubmitting(false);
    if (e) {
      const key = Object.keys(MESSAGES).find((k) => e.message.includes(k));
      setError(key ? MESSAGES[key] : navigator.onLine === false ? "Pas de connexion. Vérifiez votre réseau puis appuyez de nouveau sur « Valider »." : "La signature n'a pas pu être enregistrée. Réessayez.");
      return;
    }
    const r = res as { signed_at: string; signature_hash: string };
    setData({ ...data, quote: { ...q, signed_at: r.signed_at, signature_hash: r.signature_hash, signer_name: name, signature_image: image, signature_method: "remote", status: "accepted" } });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function download() {
    setDownloading(true);
    try {
      await downloadQuotePdf({ ...q, id: "", user_id: "", inputs: {} as QuoteRow["inputs"], updated_at: q.created_at } as QuoteRow, data.company);
    } catch {
      toast.error("Le PDF n'a pas pu être généré.");
    } finally {
      setDownloading(false);
    }
  }

  if (signed) {
    return (
      <div className="space-y-5 py-4 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary"><BadgeCheck className="size-8" /></span>
        <h1 className="text-2xl font-bold tracking-tight">Devis signé, merci !</h1>
        <p className="text-[15px] text-muted-foreground">
          {q.signer_name} a accepté le devis {q.number} le {formatSignedAt(q.signed_at!)} (GMT). {data.company.company_name || "Votre installateur"} est prévenu.
        </p>
        <Button size="lg" className="h-14 w-full text-[16px]" onClick={download} loading={downloading}><Download className="!size-5" />Télécharger le devis signé (PDF)</Button>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          {SIGNATURE_DISCLAIMER}{q.signature_hash ? ` Référence de l'empreinte : ${shortHash(q.signature_hash)}.` : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Votre devis {q.number}</h1>
        <p className="mt-1 text-[14.5px] text-muted-foreground">
          De {data.company.company_name || "votre installateur"}, pour {q.client_name}{q.client_city ? ` (${q.client_city})` : ""}.
          {q.expires_at ? ` Vous pouvez signer jusqu'au ${formatDate(q.expires_at)}.` : ""}
        </p>
        <Button variant="link" className="mt-1 h-auto px-0" onClick={download} disabled={downloading}><Download />Voir le devis complet (PDF)</Button>
      </div>
      <SignForm
        inline
        summary={{ number: q.number, companyName: data.company.company_name, clientName: q.client_name, totalTtc: Number(q.total_ttc), lines: q.lines, validUntil: q.valid_until, conditions: data.company.conditions }}
        onSubmit={submit}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}
