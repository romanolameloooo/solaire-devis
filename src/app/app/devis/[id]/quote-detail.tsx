"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Copy, Download, MessageCircle, Pencil, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Notice } from "@/components/ui/primitives";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/app/status-badge";
import { SizingExplain, SizingKpis } from "@/components/quote/sizing-summary";
import { TotalsBox } from "@/components/quote/lines-editor";
import { DEFAULT_TECH, computeTotals, lineTotal, missingPrices, num } from "@/lib/calc/engine";
import { formatDate, formatDecimal, formatFCFA } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { downloadQuotePdf, shareQuotePdf, whatsappUrl } from "@/lib/quote/pdf-actions";
import { cn } from "@/lib/utils";
import { MODE_LABEL, STATUS_LABEL, type Profile, type QuoteRow, type QuoteStatus } from "@/lib/types";

const STATUSES: QuoteStatus[] = ["draft", "sent", "accepted", "refused"];

export function QuoteDetail({ quote: initial, profile, canCreate }: { quote: QuoteRow; profile: Profile; canCreate: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [busy, setBusy] = useState<"" | "pdf" | "share" | "delete">("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const totals = computeTotals(q.lines, q.remise_pct, q.tva_pct);
  const missing = missingPrices(q.lines);
  const canPdf = missing.length === 0 && q.lines.length > 0;
  const r = q.result;
  const tech = { ...DEFAULT_TECH, ...q.inputs?.tech };

  async function setStatus(status: QuoteStatus) {
    if (status === q.status) return;
    const prev = q.status;
    setQ({ ...q, status });
    const { error } = await createClient().from("quotes").update({ status }).eq("id", q.id);
    if (error) { setQ({ ...q, status: prev }); return toast.error("Le statut n'a pas pu être changé."); }
    toast.success(`Statut : ${STATUS_LABEL[status]}`);
    router.refresh();
  }

  async function pdf() {
    setBusy("pdf");
    try { await downloadQuotePdf(q, profile); toast.success("PDF téléchargé"); }
    catch { toast.error("Le PDF n'a pas pu être généré."); }
    finally { setBusy(""); }
  }

  async function whatsapp() {
    // Ouvre WhatsApp avec le message ; le PDF est téléchargé pour être joint
    window.open(whatsappUrl(q, profile), "_blank", "noopener");
    if (q.status === "draft") setStatus("sent");
  }

  async function share() {
    setBusy("share");
    const res = await shareQuotePdf(q, profile).catch(() => "unsupported" as const);
    setBusy("");
    if (res === "unsupported") { toast.info("Partage non disponible sur cet appareil", { description: "Téléchargez le PDF puis joignez-le dans WhatsApp." }); return; }
    if (res === "shared" && q.status === "draft") setStatus("sent");
  }

  async function remove() {
    setBusy("delete");
    const { error } = await createClient().from("quotes").delete().eq("id", q.id);
    setBusy("");
    if (error) return toast.error("Suppression impossible.");
    toast.success("Devis supprimé");
    router.replace("/app");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/app" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Mes devis</Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-[22px] font-bold tracking-tight md:text-2xl">{q.client_name || "Client sans nom"}</h1>
          <StatusBadge status={q.status} />
        </div>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {q.number} · {formatDate(q.created_at)}{q.valid_until ? ` · valable jusqu'au ${formatDate(q.valid_until)}` : ""}
        </p>
      </div>

      {/* Actions principales */}
      <Card><CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button onClick={pdf} loading={busy === "pdf"} disabled={!canPdf} className="col-span-2 sm:col-span-1"><Download />Télécharger le PDF</Button>
          <Button variant="outline" onClick={whatsapp} disabled={!canPdf} className="text-[#128C4B]"><MessageCircle />WhatsApp</Button>
          <Button variant="outline" onClick={share} loading={busy === "share"} disabled={!canPdf}><Share2 />Partager le PDF</Button>
        </div>
        {!canPdf && <Notice icon={<AlertTriangle />}>Prix manquant pour : {missing.join(", ")}. <Link href={`/app/devis/nouveau?edit=${q.id}`} className="font-semibold underline">Modifier le devis</Link></Notice>}
        <p className="text-[12.5px] text-muted-foreground">
          WhatsApp ouvre la conversation avec un message prêt{q.client_phone ? ` pour ${q.client_phone}` : ""}. Joignez-y le PDF téléchargé, ou utilisez « Partager le PDF » sur téléphone pour l&apos;envoyer directement.
        </p>
        <div>
          <p className="mb-2 text-[13px] font-medium">Statut</p>
          <div className="grid grid-cols-2 gap-1.5 sm:flex">
            {STATUSES.map((st) => (
              <button key={st} onClick={() => setStatus(st)}
                className={cn("h-10 rounded-lg border px-3.5 text-[13.5px] font-medium transition-[background-color,border-color,color,scale] duration-[160ms] ease-out active:scale-[0.97]",
                  q.status === st ? "border-foreground bg-foreground text-white" : "border-border bg-card text-muted-foreground hover:text-foreground")}>
                {STATUS_LABEL[st]}
              </button>
            ))}
          </div>
        </div>
      </CardContent></Card>

      {/* Dimensionnement */}
      {r?.ok && (
        <Card><CardContent className="space-y-4">
          <div>
            <h2 className="text-[16px] font-semibold">Installation</h2>
            <p className="text-[13.5px] text-muted-foreground">{MODE_LABEL[q.mode]}{q.client_city ? ` · ${q.client_city}` : ""}{q.client_phone ? ` · ${q.client_phone}` : ""}</p>
          </div>
          <SizingKpis r={r} mode={q.mode} panelWc={num(r.panelPower)} batteryKwh={r.batteryPower ?? null} />
          <SizingExplain r={r} mode={q.mode} tech={tech} panelWc={num(r.panelPower)} batteryKwh={r.batteryPower ?? null} />
        </CardContent></Card>
      )}

      {/* Lignes */}
      <Card><CardContent className="space-y-4">
        <h2 className="text-[16px] font-semibold">Détail du devis</h2>
        <ul className="divide-y divide-border">
          {q.lines.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-4 py-3 text-[14px]">
              <div className="min-w-0">
                <p className="font-medium">{l.label}</p>
                <p className="text-[12.5px] text-muted-foreground tabular">
                  {l.unit === "kWc" ? `${formatDecimal(l.qty, 2)} kWc` : l.unit === "forfait" ? "Forfait" : `${formatDecimal(l.qty, 2)} ×`} {l.unitPrice == null ? "prix manquant" : formatFCFA(l.unitPrice)}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular">{l.unitPrice == null ? "—" : formatFCFA(lineTotal(l))}</span>
            </li>
          ))}
        </ul>
        <TotalsBox ht={totals.ht} remise={totals.remise} remisePct={q.remise_pct} tva={totals.tva} tvaPct={q.tva_pct} ttc={totals.ttc} />
        {r?.ecoMois != null && (
          <Notice tone="ok">Économie estimée : <strong>{formatFCFA(r.ecoMois)} par mois</strong>{r.roiAnnees ? `, retour sur investissement en environ ${formatDecimal(r.roiAnnees, 1)} ans` : ""}.</Notice>
        )}
      </CardContent></Card>

      {/* Actions secondaires */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link href={`/app/devis/nouveau?edit=${q.id}`}><Pencil />Modifier</Link></Button>
        {canCreate ? (
          <Button asChild variant="outline"><Link href={`/app/devis/nouveau?from=${q.id}`}><Copy />Dupliquer</Link></Button>
        ) : (
          <Button asChild variant="outline"><Link href="/app/abonnement?bloque=1"><Copy />Dupliquer</Link></Button>
        )}
        <Button variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={() => setConfirmDelete(true)}><Trash2 />Supprimer</Button>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle>Supprimer le devis {q.number} ?</DialogTitle>
          <DialogDescription>Le devis de {q.client_name || "ce client"} sera supprimé définitivement. Cette action est irréversible.</DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button variant="destructive" onClick={remove} loading={busy === "delete"}>Supprimer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
