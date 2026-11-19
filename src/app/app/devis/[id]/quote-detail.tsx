"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, BadgeCheck, Clock, Copy, Download, Link2, Lock, MapPin, MessageCircle, PenLine, Pencil, Printer, Share2, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Notice } from "@/components/ui/primitives";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/app/status-badge";
import { SizingExplain, SizingKpis } from "@/components/quote/sizing-summary";
import { TotalsBox } from "@/components/quote/lines-editor";
import { PhotoManager } from "@/components/quote/photo-manager";
import { SignSheet } from "@/components/quote/sign-sheet";
import { DEFAULT_TECH, computeTotals, lineTotal, missingPrices, num } from "@/lib/calc/engine";
import { formatDate, formatDecimal, formatFCFA, whatsappLink } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/env";
import { addSignature, listJobs, onQueueChange } from "@/lib/offline/queue";
import { downloadQuotePdf, printQuotePdf, shareQuotePdf, signLinkMessage, whatsappUrl } from "@/lib/quote/pdf-actions";
import { formatSignedAt, shortHash } from "@/lib/pdf/quote-pdf";
import { cn } from "@/lib/utils";
import { MODE_LABEL, ROOF_LABEL, STATUS_LABEL, type Profile, type QuoteRow, type QuoteStatus } from "@/lib/types";

const STATUSES: QuoteStatus[] = ["draft", "sent", "accepted", "refused"];
const isNetworkError = (msg: string) => (typeof navigator !== "undefined" && navigator.onLine === false) || /fetch|network|load failed|timeout/i.test(msg);

export function QuoteDetail({ quote: initial, profile, canCreate, companyId, creator }: {
  quote: QuoteRow; profile: Profile; canCreate: boolean; companyId: string; creator: string | null;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [busy, setBusy] = useState<"" | "pdf" | "share" | "print" | "delete" | "link" | "sign">("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [annex, setAnnex] = useState(false);
  const [link, setLink] = useState<{ url: string; expires: string } | null>(null);
  const [pendingSig, setPendingSig] = useState<{ name: string; signedAt: string } | null>(null);
  const totals = computeTotals(q.lines, q.remise_pct, q.tva_pct);
  const missing = missingPrices(q.lines);
  const canPdf = missing.length === 0 && q.lines.length > 0;
  const signed = !!q.signed_at;
  const locked = signed || !!pendingSig;
  const r = q.result;
  const tech = { ...DEFAULT_TECH, ...q.inputs?.tech };
  const v = q.visit ?? {};
  const hasVisit = Object.values(v).some((x) => x !== null && x !== undefined && x !== "");

  // Signature faite hors connexion : affichée tant qu'elle n'est pas arrivée sur le serveur
  useEffect(() => {
    let had = false;
    const refresh = async () => {
      const job = (await listJobs()).find((j) => j.kind === "signature" && j.quoteKey === q.id);
      setPendingSig(job && job.kind === "signature" ? { name: job.name, signedAt: job.signedAt } : null);
      if (had && !job) router.refresh(); // envoyée : on recharge le devis signé
      had = !!job;
    };
    void refresh();
    return onQueueChange(refresh);
  }, [q.id, router]);
  // Données rechargées par le serveur (après signature, router.refresh) : on remplace l'état local
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) { setPrevInitial(initial); setQ(initial); }

  async function setStatus(status: QuoteStatus) {
    if (status === q.status || locked) return;
    const prev = q.status;
    setQ({ ...q, status });
    const { error } = await createClient().from("quotes").update({ status }).eq("id", q.id);
    if (error) { setQ({ ...q, status: prev }); return toast.error(/QUOTE_LOCKED/.test(error.message) ? "Ce devis est signé : il ne peut plus être modifié." : "Le statut n'a pas pu être changé."); }
    toast.success(`Statut : ${STATUS_LABEL[status]}`);
    router.refresh();
  }

  const run = async (key: typeof busy, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); }
    catch { toast.error("Le PDF n'a pas pu être généré. Vérifiez votre connexion."); }
    finally { setBusy(""); }
  };

  async function share() {
    setBusy("share");
    const res = await shareQuotePdf(q, profile, { annex }).catch(() => "unsupported" as const);
    setBusy("");
    if (res === "unsupported") { window.open(whatsappUrl(q, profile), "_blank", "noopener"); toast.info("Joignez le PDF téléchargé dans WhatsApp", { description: "Le partage direct du fichier n'est pas disponible sur cet appareil." }); return; }
    if (res === "shared" && q.status === "draft") setStatus("sent");
  }

  async function sendLink() {
    setBusy("link");
    const { data, error } = await createClient().rpc("create_sign_link", { p_quote: q.id });
    setBusy("");
    if (error || !data) return toast.error(error && isNetworkError(error.message) ? "Pas de connexion : le lien sera créé quand le réseau reviendra." : "Le lien n'a pas pu être créé.");
    const { token, expires_at } = data as { token: string; expires_at: string };
    const url = `${SITE_URL}/signer/${token}`;
    setLink({ url, expires: expires_at });
    if (q.status === "draft") setQ({ ...q, status: "sent" });
    window.open(whatsappLink(q.client_phone, signLinkMessage(q, profile, url, expires_at)), "_blank", "noopener");
  }

  async function signOnsite({ name, image }: { name: string; image: string }) {
    setBusy("sign");
    setSignError("");
    const signedAt = new Date().toISOString();
    const queueIt = async () => {
      await addSignature({ quoteKey: q.id, name, image, signedAt });
      setSigning(false);
      toast.success("Signature enregistrée sur le téléphone", { description: "Elle sera envoyée automatiquement dès que la connexion revient." });
    };
    try {
      const { data, error } = await createClient().rpc("sign_quote_onsite", { p_quote: q.id, p_name: name, p_image: image, p_signed_at: signedAt });
      if (error) {
        if (isNetworkError(error.message)) await queueIt();
        else setSignError(/ALREADY_SIGNED/.test(error.message) ? "Ce devis est déjà signé." : /INVALID_SIGNATURE/.test(error.message) ? "La signature est trop petite ou illisible : recommencez." : "La signature n'a pas pu être enregistrée.");
        return;
      }
      const res = data as { signed_at: string; signature_hash: string };
      setQ({ ...q, signed_at: res.signed_at, signature_hash: res.signature_hash, signer_name: name, signature_image: image, signature_method: "onsite", status: "accepted" });
      setSigning(false);
      toast.success("Devis signé", { description: "Il est maintenant verrouillé. Le PDF signé est prêt." });
      router.refresh();
    } catch {
      await queueIt();
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    setBusy("delete");
    const supabase = createClient();
    // Les fichiers photo ne sont pas supprimés automatiquement avec le devis : on les retire d'abord
    const { data: photos } = await supabase.from("quote_photos").select("path").eq("quote_id", q.id);
    if (photos?.length) await supabase.storage.from("quote-photos").remove(photos.map((p: { path: string }) => p.path));
    const { error } = await supabase.from("quotes").delete().eq("id", q.id);
    setBusy("");
    if (error) return toast.error(/QUOTE_LOCKED/.test(error.message) ? "Un devis signé ne peut pas être supprimé." : "Suppression impossible.");
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
          {locked && <span className="inline-flex items-center gap-1 rounded-full bg-[#17221c] px-2 py-0.5 text-[12px] font-medium text-white"><Lock className="size-3" />Verrouillé</span>}
        </div>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {q.number} · {formatDate(q.created_at)}{q.valid_until ? ` · valable jusqu'au ${formatDate(q.valid_until)}` : ""}{creator ? ` · fait par ${creator}` : ""}
        </p>
      </div>

      {/* Signature */}
      {signed ? (
        <Card className="border-primary/30 bg-primary-soft/50"><CardContent className="flex gap-4">
          <BadgeCheck className="size-7 shrink-0 text-primary" />
          <div className="min-w-0 space-y-2">
            <p className="text-[15px] font-semibold">Accepté et signé par {q.signer_name}</p>
            <p className="text-[13.5px] text-muted-foreground">
              Signature électronique simple {q.signature_method === "remote" ? "à distance" : "sur place"}, le {formatSignedAt(q.signed_at!)} (GMT).
              {q.signature_hash ? <> Empreinte du devis : <span className="font-mono text-[12.5px] text-foreground">{shortHash(q.signature_hash)}</span>.</> : null}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {q.signature_image && <img src={q.signature_image} alt={`Signature de ${q.signer_name}`} className="h-20 rounded-lg border border-border bg-white p-1" />}
            <p className="text-[12.5px] text-muted-foreground">Ce devis ne peut plus être modifié. Pour changer quelque chose, dupliquez-le : la copie est une nouvelle version, à faire signer de nouveau.</p>
          </div>
        </CardContent></Card>
      ) : pendingSig ? (
        <Notice tone="info" icon={<Clock />}>
          <strong>Signé par {pendingSig.name}, en attente d&apos;envoi.</strong> La signature est enregistrée sur ce téléphone et partira automatiquement dès que la connexion revient. Gardez l&apos;application ouverte.
        </Notice>
      ) : canPdf ? (
        <Card><CardContent className="space-y-3">
          <h2 className="text-[16px] font-semibold">Faire signer le client</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button size="lg" className="h-14 text-[15.5px]" onClick={() => { setSignError(""); setSigning(true); }}><PenLine className="!size-5" />Signer sur ce téléphone</Button>
            <Button size="lg" variant="outline" className="h-14 text-[15.5px]" onClick={sendLink} loading={busy === "link"}><Link2 className="!size-5" />Envoyer pour signature</Button>
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            À distance, le client reçoit un lien sur WhatsApp et signe sans créer de compte. Le lien est valable jusqu&apos;à la fin de validité du devis.
          </p>
          {link && (
            <div className="rounded-xl bg-muted p-3 text-[13px]">
              <p className="font-medium">Lien de signature créé (valable jusqu&apos;au {formatDate(link.expires)})</p>
              <p className="mt-1 break-all font-mono text-[12px] text-muted-foreground">{link.url}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(link.url).then(() => toast.success("Lien copié"))}><Copy />Copier</Button>
                <Button size="sm" variant="outline" onClick={() => window.open(whatsappLink(q.client_phone, signLinkMessage(q, profile, link.url, link.expires)), "_blank", "noopener")}><MessageCircle />Renvoyer sur WhatsApp</Button>
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">Créer un nouveau lien désactive l&apos;ancien.</p>
            </div>
          )}
        </CardContent></Card>
      ) : null}

      {/* PDF et partage */}
      <Card><CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button onClick={() => run("pdf", () => downloadQuotePdf(q, profile, { annex }), "PDF téléchargé")} loading={busy === "pdf"} disabled={!canPdf} className="col-span-2 sm:col-span-1"><Download />{signed ? "PDF signé" : "Télécharger le PDF"}</Button>
          <Button variant="outline" onClick={share} loading={busy === "share"} disabled={!canPdf}><Share2 />Partager</Button>
          <Button variant="outline" onClick={() => run("print", () => printQuotePdf(q, profile, { annex }))} loading={busy === "print"} disabled={!canPdf}><Printer />Imprimer</Button>
          <Button variant="outline" onClick={() => { window.open(whatsappUrl(q, profile), "_blank", "noopener"); if (q.status === "draft") setStatus("sent"); }} disabled={!canPdf} className="col-span-2 text-[#128C4B] sm:col-span-1"><MessageCircle />Message WhatsApp</Button>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3">
          <input type="checkbox" checked={annex} onChange={(e) => setAnnex(e.target.checked)} className="size-5 accent-[#0e7a4a]" />
          <span className="text-[14px]"><span className="font-medium">Ajouter l&apos;annexe « Visite technique »</span><span className="block text-[12.5px] text-muted-foreground">Infos du chantier et photos, 2 par page.</span></span>
        </label>
        {!canPdf && <Notice icon={<AlertTriangle />}>Prix manquant pour : {missing.join(", ")}. <Link href={`/app/devis/nouveau?edit=${q.id}`} className="font-semibold underline">Modifier le devis</Link></Notice>}
        {!locked && (
          <div>
            <p className="mb-2 text-[13px] font-medium">Statut</p>
            <div className="grid grid-cols-2 gap-1.5 sm:flex">
              {STATUSES.map((st) => (
                <button key={st} onClick={() => setStatus(st)}
                  className={cn("h-11 rounded-lg border px-3.5 text-[13.5px] font-medium transition-[background-color,border-color,color,scale] duration-[160ms] ease-out active:scale-[0.97]",
                    q.status === st ? "border-foreground bg-foreground text-white" : "border-border bg-card text-muted-foreground hover:text-foreground")}>
                  {STATUS_LABEL[st]}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent></Card>

      {/* Visite technique */}
      <Card><CardContent className="space-y-4">
        <h2 className="text-[16px] font-semibold">Visite technique</h2>
        {hasVisit ? (
          <dl className="grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
            {v.address && <Info k="Adresse" val={v.address} />}
            {v.lat != null && v.lng != null && (
              <div><dt className="text-[12.5px] text-muted-foreground">Position GPS</dt>
                <dd><a className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline" href={`https://www.google.com/maps?q=${v.lat},${v.lng}`} target="_blank" rel="noopener noreferrer"><MapPin className="size-4" />Ouvrir la carte</a></dd></div>
            )}
            {v.roof && <Info k="Toiture" val={ROOF_LABEL[v.roof]} />}
            {v.surfaceM2 != null && <Info k="Surface disponible" val={`environ ${formatDecimal(v.surfaceM2, 1)} m²`} />}
            {v.orientation && <Info k="Orientation" val={v.orientation} />}
            {v.shading != null && <Info k="Ombrages" val={v.shading ? `Oui${v.shadingNote ? ` : ${v.shadingNote}` : ""}` : "Non"} />}
            {v.distanceM != null && <Info k="Distance panneaux → onduleur" val={`environ ${formatDecimal(v.distanceM, 1)} m`} />}
            {v.notes && <div className="sm:col-span-2"><Info k="Notes" val={v.notes} /></div>}
          </dl>
        ) : <p className="text-[13.5px] text-muted-foreground">Pas d&apos;informations de visite.{!locked ? " Ajoutez-les avec « Modifier »." : ""}</p>}
        <div>
          <h3 className="mb-2 text-[14px] font-semibold">Photos</h3>
          <PhotoManager quoteKey={q.id} companyId={companyId} editable={!locked} />
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
        {!locked && <Button asChild variant="outline"><Link href={`/app/devis/nouveau?edit=${q.id}`}><Pencil />Modifier</Link></Button>}
        <Button asChild variant={locked ? "default" : "outline"}>
          <Link href={canCreate ? `/app/devis/nouveau?from=${q.id}` : "/app/abonnement?bloque=1"}><Copy />{locked ? "Dupliquer pour faire une nouvelle version" : "Dupliquer"}</Link>
        </Button>
        {!locked && <Button variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={() => setConfirmDelete(true)}><Trash2 />Supprimer</Button>}
      </div>

      <SignSheet
        open={signing}
        summary={{ number: q.number, companyName: profile.company_name, clientName: q.client_name, totalTtc: totals.ttc, lines: q.lines, validUntil: q.valid_until, conditions: profile.conditions }}
        onSubmit={signOnsite}
        onCancel={() => setSigning(false)}
        submitting={busy === "sign"}
        error={signError}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle>Supprimer le devis {q.number} ?</DialogTitle>
          <DialogDescription>Le devis de {q.client_name || "ce client"} sera supprimé définitivement, avec ses photos. Cette action est irréversible.</DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button variant="destructive" onClick={remove} loading={busy === "delete"}>Supprimer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ k, val }: { k: string; val: string }) {
  return (
    <div>
      <dt className="text-[12.5px] text-muted-foreground">{k}</dt>
      <dd className="whitespace-pre-line font-medium">{val}</dd>
    </div>
  );
}
