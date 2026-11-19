"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Eraser, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Notice } from "@/components/ui/primitives";
import { SignaturePad, type SignaturePadHandle } from "@/components/quote/signature-pad";
import { formatDate, formatFCFA } from "@/lib/format";
import { lineTotal, type QuoteLine } from "@/lib/calc/engine";
import { cn } from "@/lib/utils";

export interface SignSummary {
  number: string;
  companyName: string;
  clientName: string;
  totalTtc: number;
  lines: QuoteLine[];
  validUntil: string | null;
  conditions?: string;
}

export const SIGNATURE_DISCLAIMER =
  "Signature électronique simple : en signant, vous donnez votre accord sur ce devis. Votre nom, la date, l'heure et une empreinte numérique du devis sont enregistrés.";

/** Récapitulatif + nom + case d'accord + signature au doigt. Plein écran, ou intégré à une page (`inline`). */
export function SignForm({ summary, onSubmit, onCancel, inline, submitting, error }: {
  summary: SignSummary;
  onSubmit: (p: { name: string; image: string }) => void;
  onCancel?: () => void;
  inline?: boolean;
  submitting?: boolean;
  error?: string;
}) {
  const pad = useRef<SignaturePadHandle>(null);
  const [name, setName] = useState(summary.clientName);
  const [accepted, setAccepted] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [tried, setTried] = useState(false);
  const nameOk = name.trim().length >= 2;
  const ready = nameOk && accepted && !empty;

  function submit() {
    setTried(true);
    if (!ready || pad.current?.isEmpty()) { if (pad.current?.isEmpty()) setEmpty(true); return; }
    onSubmit({ name: name.trim(), image: pad.current!.toDataURL() });
  }

  return (
    <div className={cn("space-y-5", inline ? "" : "mx-auto w-full max-w-xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4")}>
      {!inline && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted-foreground">{summary.companyName} · Devis {summary.number}</p>
          {onCancel && <button onClick={onCancel} className="grid size-11 place-items-center rounded-full text-muted-foreground active:bg-muted" aria-label="Fermer"><X className="size-6" /></button>}
        </div>
      )}

      <div className="rounded-2xl bg-[#17221c] p-5 text-white">
        <p className="text-[13px] text-white/70">Montant total</p>
        <p className="mt-0.5 text-[30px] font-bold leading-tight tracking-tight tabular">{formatFCFA(summary.totalTtc)}</p>
        <p className="text-[13px] text-white/70">TTC{summary.validUntil ? ` · offre valable jusqu'au ${formatDate(summary.validUntil)}` : ""}</p>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold">Matériel et prestations</p>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {summary.lines.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-[14px]">
              <span className="min-w-0"><span className="font-medium">{l.label}</span>{l.unit !== "forfait" && <span className="text-muted-foreground"> × {String(l.qty).replace(".", ",")}{l.unit === "kWc" ? " kWc" : ""}</span>}</span>
              <span className="shrink-0 tabular">{formatFCFA(lineTotal(l))}</span>
            </li>
          ))}
        </ul>
      </div>

      <Field label="Nom et prénom du signataire" htmlFor="sig-name" error={tried && !nameOk ? "Indiquez votre nom." : null}>
        <Input id="sig-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="h-12 text-[16px]" invalid={tried && !nameOk} />
      </Field>

      <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors", accepted ? "border-primary bg-primary-soft" : tried ? "border-destructive bg-destructive-soft" : "border-[#c9d0c5] bg-card")}>
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 size-6 shrink-0 accent-[#0e7a4a]" />
        <span className="text-[15px] font-semibold leading-snug">J&apos;accepte ce devis et les conditions{summary.conditions ? " indiquées ci-dessous" : ""}</span>
      </label>
      {summary.conditions && <p className="-mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{summary.conditions}</p>}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[14px] font-semibold">Signez ici avec le doigt</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => pad.current?.clear()}><Eraser />Effacer</Button>
        </div>
        <SignaturePad ref={pad} onChange={setEmpty} />
        {tried && empty && <p className="mt-1.5 text-[13px] text-destructive">La signature est vide.</p>}
      </div>

      {error && <Notice>{error}</Notice>}

      <Button type="button" size="lg" className="h-14 w-full text-[16px]" onClick={submit} loading={submitting} disabled={submitting}>
        <Check className="!size-5" />Valider la signature
      </Button>
      <p className="text-[12px] leading-relaxed text-muted-foreground">{SIGNATURE_DISCLAIMER}</p>
    </div>
  );
}

/** Écran plein écran pour faire signer le client sur le téléphone du technicien. */
export function SignSheet(props: Parameters<typeof SignForm>[0] & { open: boolean }) {
  const { open, ...rest } = props;
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Signature du client" className="sd-step fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-background">
      <SignForm {...rest} />
    </div>
  );
}
