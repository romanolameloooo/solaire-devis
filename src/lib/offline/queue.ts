"use client";
/**
 * File d'attente hors connexion : photos de chantier et signatures sur place.
 *
 * Chaque élément est d'abord enregistré sur le téléphone (IndexedDB), puis envoyé.
 * Si l'envoi échoue (réseau faible, coupure), il reste en attente et repart automatiquement
 * quand la connexion revient (évènement « online » et nouvel essai toutes les 20 s).
 *
 * Une photo prise avant le premier enregistrement du devis est rattachée à une clé « draft:… » ;
 * elle part dès que le devis existe (voir attachDraft).
 */
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

export type JobStatus = "pending" | "uploading" | "error";

interface BaseJob {
  id: string;
  quoteKey: string;
  status: JobStatus;
  error?: string;
  createdAt: number;
}
export interface PhotoJob extends BaseJob {
  kind: "photo";
  companyId: string;
  blob: Blob;
  width: number;
  height: number;
  caption: string;
}
export interface SignatureJob extends BaseJob {
  kind: "signature";
  name: string;
  image: string;
  signedAt: string;
}
export type Job = PhotoJob | SignatureJob;

const DB = "soladevis";
const STORE = "jobs";
const EVENT = "sd-queue";
const memory = new Map<string, Job>();
const progress = new Map<string, number>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null); // Navigation privée, stockage bloqué : la file reste en mémoire
    }
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r ? (r as IDBRequest<T>).result : undefined);
    t.onerror = () => reject(t.error);
  });
}

const emit = () => window.dispatchEvent(new Event(EVENT));
export const onQueueChange = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};
export const getProgress = (id: string) => progress.get(id) ?? 0;

export async function listJobs(): Promise<Job[]> {
  const db = await openDb();
  if (!db) return [...memory.values()];
  const all = (await tx<Job[]>("readonly", (s) => s.getAll())) ?? [];
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

async function put(job: Job) {
  memory.set(job.id, job);
  await tx("readwrite", (s) => s.put(job)).catch(() => undefined);
  emit();
}

async function remove(id: string) {
  memory.delete(id);
  progress.delete(id);
  await tx("readwrite", (s) => s.delete(id)).catch(() => undefined);
  emit();
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export async function addPhoto(p: Omit<PhotoJob, "id" | "kind" | "status" | "createdAt">) {
  const job: PhotoJob = { ...p, id: uid(), kind: "photo", status: "pending", createdAt: Date.now() };
  await put(job);
  void processQueue();
  return job;
}

export async function addSignature(s: Omit<SignatureJob, "id" | "kind" | "status" | "createdAt">) {
  const job: SignatureJob = { ...s, id: uid(), kind: "signature", status: "pending", createdAt: Date.now() };
  await put(job);
  void processQueue();
  return job;
}

export async function updateCaption(id: string, caption: string) {
  const all = await listJobs();
  const job = all.find((j) => j.id === id);
  if (job && job.kind === "photo") await put({ ...job, caption });
}

export async function discardJob(id: string) {
  await remove(id);
}

/** Rattache les photos prises avant l'enregistrement du devis au devis enregistré. */
export async function attachDraft(draftKey: string, quoteId: string) {
  for (const j of await listJobs()) if (j.quoteKey === draftKey) await put({ ...j, quoteKey: quoteId, status: "pending" });
  void processQueue();
}

/** Envoi d'un fichier vers Supabase Storage avec suivi de la progression (XMLHttpRequest). */
function uploadWithProgress(path: string, blob: Blob, token: string, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/quote-photos/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("Content-Type", blob.type || "image/jpeg");
    xhr.timeout = 120000;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status} ${xhr.responseText.slice(0, 120)}`)));
    xhr.onerror = () => reject(new Error("network"));
    xhr.ontimeout = () => reject(new Error("timeout"));
    xhr.send(blob);
  });
}

let running = false;

/** Envoie tout ce qui est en attente. Sans danger si appelée plusieurs fois. */
export async function processQueue(): Promise<void> {
  if (running || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
  running = true;
  try {
    const supabase = createClient();
    // Les erreurs définitives (droits, devis verrouillé) ne sont pas relancées en boucle
    const jobs = (await listJobs()).filter((j) => isUuid(j.quoteKey) && !(j.status === "error" && j.error && j.error !== "network"));
    for (const job of jobs) {
      await put({ ...job, status: "uploading", error: undefined });
      try {
        if (job.kind === "photo") {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (!token) throw new Error("session");
          const path = `${job.companyId}/${job.quoteKey}/${job.id}.jpg`;
          await uploadWithProgress(path, job.blob, token, (p) => { progress.set(job.id, p); emit(); });
          const { error } = await supabase.from("quote_photos").upsert(
            { quote_id: job.quoteKey, company_id: job.companyId, path, caption: job.caption, width: job.width, height: job.height },
            { onConflict: "path", ignoreDuplicates: true },
          );
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase.rpc("sign_quote_onsite", {
            p_quote: job.quoteKey, p_name: job.name, p_image: job.image, p_signed_at: job.signedAt,
          });
          // Déjà signé (par exemple envoyé deux fois) : rien à refaire
          if (error && !/ALREADY_SIGNED/.test(error.message)) throw new Error(error.message);
        }
        await remove(job.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Erreur définitive (droits, devis verrouillé) : on la montre ; erreur réseau : on réessaiera
        const fatal = /NOT_ALLOWED|QUOTE_LOCKED|INVALID_|HTTP 4(0[013]|13)/.test(msg);
        await put({ ...job, status: "error", error: fatal ? msg : "network" });
      }
    }
  } finally {
    running = false;
  }
}

/** Réduit une photo avant l'envoi : 1600 px de large au maximum, JPEG qualité 0,7. */
export async function compressImage(file: Blob, maxWidth = 1600, quality = 0.7): Promise<{ blob: Blob; width: number; height: number }> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bmp = await createImageBitmap(file);
  }
  const k = Math.min(1, maxWidth / bmp.width);
  const width = Math.round(bmp.width * k), height = Math.round(bmp.height * k);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close?.();
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("compression"))), "image/jpeg", quality));
  return { blob, width, height };
}
