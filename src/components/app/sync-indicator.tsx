"use client";
import { useEffect, useState } from "react";
import { CloudOff, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { listJobs, onQueueChange, processQueue, type Job } from "@/lib/offline/queue";
import { cn } from "@/lib/utils";

/**
 * Pastille « En attente d'envoi » + relance automatique de la file hors connexion.
 * Monté une fois dans la barre de l'app : il relance l'envoi au retour du réseau et toutes les 20 s.
 */
export function SyncIndicator({ className }: { className?: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const refresh = () => listJobs().then((j) => setJobs(j.filter((x) => !x.quoteKey.startsWith("draft:"))));
    const goOnline = () => { setOnline(true); void processQueue(); };
    const goOffline = () => setOnline(false);
    void refresh();
    void processQueue();
    const off = onQueueChange(refresh);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const t = setInterval(() => void processQueue(), 20000);
    return () => { off(); window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); clearInterval(t); };
  }, []);

  const uploading = jobs.some((j) => j.status === "uploading");
  if (!jobs.length && online) return null;

  return (
    <button
      type="button"
      onClick={() => void processQueue()}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-[scale] active:scale-[0.97]",
        !online ? "bg-[#17221c] text-white" : "bg-sun text-[#17221c]",
        className,
      )}
      aria-live="polite"
    >
      {!online ? <CloudOff className="size-4" /> : uploading ? <Loader2 className="size-4 animate-spin" /> : jobs.length ? <UploadCloud className="size-4" /> : <RefreshCw className="size-4" />}
      {/* Version courte sur téléphone (la barre du haut est étroite), complète ailleurs */}
      <span className="sm:hidden">{!online ? (jobs.length ? `${jobs.length} en attente` : "Hors ligne") : uploading ? `Envoi… (${jobs.length})` : `${jobs.length} en attente`}</span>
      <span className="hidden sm:inline">
        {!online
          ? jobs.length ? `Hors connexion · ${jobs.length} en attente d'envoi` : "Hors connexion"
          : uploading ? `Envoi en cours (${jobs.length})` : `${jobs.length} en attente d'envoi · Réessayer`}
      </span>
    </button>
  );
}
