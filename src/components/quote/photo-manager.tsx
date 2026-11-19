"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, Clock, ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import {
  addPhoto, compressImage, discardJob, getProgress, listJobs, onQueueChange, processQueue, updateCaption, type PhotoJob,
} from "@/lib/offline/queue";
import { cn } from "@/lib/utils";
import type { QuotePhoto } from "@/lib/types";

export const CAPTIONS = ["Toit", "Compteur", "Tableau électrique", "Emplacement onduleur", "Vue d'ensemble"];

type Item =
  | { kind: "pending"; id: string; caption: string; url: string; job: PhotoJob }
  | { kind: "uploaded"; id: string; caption: string; url: string | null; photo: QuotePhoto };

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/**
 * Photos d'un devis : prise de vue, compression, légende, envoi avec progression et reprise.
 * `quoteKey` vaut l'identifiant du devis, ou « draft:… » tant que le devis n'est pas encore enregistré.
 */
export function PhotoManager({ quoteKey, companyId, editable = true }: { quoteKey: string; companyId: string; editable?: boolean }) {
  const [jobs, setJobs] = useState<PhotoJob[]>([]);
  const [uploaded, setUploaded] = useState<{ photo: QuotePhoto; url: string | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const [, force] = useState(0);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const urls = useRef(new Map<string, string>());
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const draft = !isUuid(quoteKey);

  const loadUploaded = useCallback(async () => {
    if (draft) return;
    const supabase = createClient();
    const { data } = await supabase.from("quote_photos").select("*").eq("quote_id", quoteKey).order("created_at");
    const rows = (data ?? []) as QuotePhoto[];
    if (!rows.length) return setUploaded([]);
    const { data: signed } = await supabase.storage.from("quote-photos").createSignedUrls(rows.map((r) => r.path), 3600);
    setUploaded(rows.map((photo, i) => ({ photo, url: signed?.[i]?.signedUrl ?? null })));
  }, [draft, quoteKey]);

  useEffect(() => {
    let prevIds = new Set<string>();
    const refresh = async () => {
      const mine = (await listJobs()).filter((j): j is PhotoJob => j.kind === "photo" && j.quoteKey === quoteKey);
      // Aperçus locaux (URL temporaires) des photos pas encore envoyées
      for (const j of mine) if (!urls.current.has(j.id)) urls.current.set(j.id, URL.createObjectURL(j.blob));
      setPreviews(Object.fromEntries(mine.map((j) => [j.id, urls.current.get(j.id)!])));
      setJobs(mine);
      const ids = new Set(mine.map((j) => j.id));
      // Une photo vient de partir : on recharge la liste enregistrée
      if ([...prevIds].some((id) => !ids.has(id))) void loadUploaded();
      prevIds = ids;
      force((n) => n + 1);
    };
    // Abonnement à la file d'attente (système externe) : la mise à jour de l'état est voulue ici
    void refresh();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUploaded();
    return onQueueChange(refresh);
  }, [quoteKey, loadUploaded]);

  useEffect(() => {
    const map = urls.current;
    return () => map.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const items: Item[] = useMemo(() => [
    ...uploaded.map((u) => ({ kind: "uploaded" as const, id: u.photo.id, caption: u.photo.caption, url: u.url, photo: u.photo })),
    ...jobs.map((j) => ({ kind: "pending" as const, id: j.id, caption: j.caption, url: previews[j.id] ?? "", job: j })),
  ], [uploaded, jobs, previews]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    let added = 0;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        const { blob, width, height } = await compressImage(f);
        const used = new Set(items.map((i) => i.caption));
        await addPhoto({ quoteKey, companyId, blob, width, height, caption: CAPTIONS.find((c) => !used.has(c)) ?? "" });
        added++;
      } catch {
        toast.error("Une photo n'a pas pu être lue.");
      }
    }
    setBusy(false);
    if (camRef.current) camRef.current.value = "";
    if (galRef.current) galRef.current.value = "";
    if (added && draft) toast.success(added > 1 ? `${added} photos ajoutées` : "Photo ajoutée", { description: "Elles seront envoyées à l'enregistrement du devis." });
  }

  async function setCaption(item: Item, caption: string) {
    if (item.kind === "pending") return updateCaption(item.id, caption);
    setUploaded((u) => u.map((x) => (x.photo.id === item.id ? { ...x, photo: { ...x.photo, caption } } : x)));
    const { error } = await createClient().from("quote_photos").update({ caption }).eq("id", item.id);
    if (error) toast.error("La légende n'a pas pu être enregistrée.");
  }

  async function removeItem(item: Item) {
    if (item.kind === "pending") return discardJob(item.id);
    const supabase = createClient();
    const { error } = await supabase.from("quote_photos").delete().eq("id", item.id);
    if (error) return toast.error("Suppression impossible.");
    await supabase.storage.from("quote-photos").remove([item.photo.path]);
    setUploaded((u) => u.filter((x) => x.photo.id !== item.id));
  }

  return (
    <div>
      {editable && (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" size="lg" className="h-14 text-[15px]" onClick={() => camRef.current?.click()} loading={busy}><Camera className="!size-5" />Prendre une photo</Button>
          <Button type="button" size="lg" variant="outline" className="h-14 text-[15px]" onClick={() => galRef.current?.click()} disabled={busy}><ImagePlus className="!size-5" />Galerie</Button>
          {/* capture ouvre directement l'appareil photo du téléphone (dos) */}
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        </div>
      )}

      {items.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-center text-[13.5px] text-muted-foreground">
          {editable ? "Aucune photo. Prenez le toit, le compteur et le tableau électrique." : "Aucune photo."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const job = item.kind === "pending" ? item.job : null;
            const pct = job ? Math.round(getProgress(job.id) * 100) : 100;
            return (
              <li key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="relative aspect-[4/3] bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.url ? <img src={item.url} alt={item.caption || "Photo du chantier"} className="size-full object-cover" loading="lazy" /> : <div className="grid size-full place-items-center text-[13px] text-muted-foreground">Aperçu indisponible</div>}
                  <span className={cn("absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold shadow-soft",
                    !job ? "bg-primary text-white" : job.status === "error" ? "bg-destructive text-white" : "bg-sun text-[#17221c]")}>
                    {!job ? <><Check className="size-3.5" />Envoyée</>
                      : job.status === "uploading" ? <><Loader2 className="size-3.5 animate-spin" />Envoi {pct} %</>
                      : job.status === "error" ? <><AlertTriangle className="size-3.5" />Échec de l&apos;envoi</>
                      : <><Clock className="size-3.5" />{draft ? "À l'enregistrement" : "En attente d'envoi"}</>}
                  </span>
                  {job?.status === "uploading" && <span className="absolute inset-x-0 bottom-0 h-1.5 bg-black/20"><span className="block h-full bg-sun transition-[width]" style={{ width: `${pct}%` }} /></span>}
                </div>
                <div className="space-y-2 p-3">
                  {editable ? (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {CAPTIONS.map((c) => (
                          <button key={c} type="button" onClick={() => setCaption(item, c)}
                            className={cn("h-8 rounded-full border px-2.5 text-[12.5px] font-medium active:scale-[0.97]", item.caption === c ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground")}>{c}</button>
                        ))}
                      </div>
                      <Input aria-label="Légende" value={item.caption} placeholder="Légende" onChange={(e) => item.kind === "pending" ? void updateCaption(item.id, e.target.value) : setUploaded((u) => u.map((x) => (x.photo.id === item.id ? { ...x, photo: { ...x.photo, caption: e.target.value } } : x)))}
                        onBlur={(e) => item.kind === "uploaded" && void setCaption(item, e.target.value)} />
                    </>
                  ) : (
                    <p className="text-[13.5px] font-medium">{item.caption || "Sans légende"}</p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    {job?.status === "error" ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => void processQueue()}><RefreshCw />Réessayer</Button>
                    ) : <span />}
                    {editable && <Button type="button" size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => void removeItem(item)}><Trash2 />Retirer</Button>}
                  </div>
                  {job?.status === "error" && job.error && job.error !== "network" && <p className="text-[12px] text-destructive">{job.error}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
