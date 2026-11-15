"use client";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { NumInput } from "@/components/ui/num-input";
import { lineTotal, newManualLine, type QuoteLine } from "@/lib/calc/engine";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";

const unitLabel = (u: string) => (u === "kWc" ? "kWc" : u === "forfait" ? "forfait" : "u.");

export function LinesEditor({ lines, onChange }: { lines: QuoteLine[]; onChange: (l: QuoteLine[]) => void }) {
  const upd = (id: string, patch: Partial<QuoteLine>) => onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const del = (id: string) => onChange(lines.filter((l) => l.id !== id));

  return (
    <div>
      <div className="hidden grid-cols-[1fr_110px_150px_130px_40px] gap-3 px-1 pb-2 text-[12px] font-medium text-muted-foreground md:grid">
        <span>Désignation</span><span>Quantité</span><span>Prix unitaire</span><span className="text-right">Total</span><span />
      </div>
      <ul className="space-y-2.5 md:space-y-2">
        {lines.map((l) => {
          const missing = l.unitPrice == null;
          return (
            <li key={l.id} className={cn("grid grid-cols-2 gap-2.5 rounded-xl border p-3 md:grid-cols-[1fr_110px_150px_130px_40px] md:items-center md:gap-3 md:rounded-none md:border-0 md:p-0", missing ? "border-sun/50 bg-sun-soft/40 md:bg-transparent" : "border-border")}>
              <div className="col-span-2 flex items-start gap-2 md:col-span-1">
                <Input value={l.label} onChange={(e) => upd(l.id, { label: e.target.value })} placeholder="Désignation" aria-label="Désignation" invalid={!l.label.trim()} />
                <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive md:hidden" onClick={() => del(l.id)} aria-label="Supprimer la ligne"><Trash2 /></Button>
              </div>
              <div>
                <span className="mb-1 block text-[12px] text-muted-foreground md:hidden">Quantité</span>
                <NumInput value={l.qty} onChange={(v) => upd(l.id, { qty: v ?? 0 })} suffix={unitLabel(l.unit)} aria-label="Quantité" />
              </div>
              <div>
                <span className="mb-1 block text-[12px] text-muted-foreground md:hidden">Prix unitaire</span>
                <NumInput value={l.unitPrice} onChange={(v) => upd(l.id, { unitPrice: v })} grouped placeholder="Prix manquant" aria-label="Prix unitaire" invalid={missing} />
              </div>
              <div className="col-span-2 flex items-center justify-between md:col-span-1 md:block md:text-right">
                <span className="text-[12px] text-muted-foreground md:hidden">Total</span>
                <span className="text-[14.5px] font-semibold tabular">{missing ? "—" : formatFCFA(lineTotal(l))}</span>
              </div>
              <Button type="button" variant="ghost" size="icon" className="hidden text-muted-foreground hover:text-destructive md:inline-flex" onClick={() => del(l.id)} aria-label="Supprimer la ligne"><Trash2 /></Button>
            </li>
          );
        })}
      </ul>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => onChange([...lines, newManualLine()])}><Plus />Ajouter une ligne</Button>
    </div>
  );
}

export function TotalsBox({ ht, remise, remisePct, tva, tvaPct, ttc }: { ht: number; remise: number; remisePct: number; tva: number; tvaPct: number; ttc: number }) {
  const row = (a: React.ReactNode, b: string) => (
    <div className="flex items-center justify-between py-1.5 text-[14px]"><span className="text-muted-foreground">{a}</span><span className="tabular">{b}</span></div>
  );
  return (
    <div className="ml-auto w-full max-w-sm">
      {row("Total HT", formatFCFA(ht))}
      {remise > 0 && row(<>Remise {String(remisePct).replace(".", ",")} %</>, `− ${formatFCFA(remise)}`)}
      {row(<>TVA {String(tvaPct).replace(".", ",")} %</>, formatFCFA(tva))}
      <div className="mt-2 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-white">
        <span className="text-[14px] font-medium">Total TTC</span>
        <span className="text-[18px] font-bold tabular">{formatFCFA(ttc)}</span>
      </div>
    </div>
  );
}
