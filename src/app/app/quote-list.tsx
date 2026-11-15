"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Package, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Input, Notice } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/app/status-badge";
import { formatDateShort, formatDecimal, formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type QuoteStatus } from "@/lib/types";
import type { QuoteListItem } from "./page";

const FILTERS: ("all" | QuoteStatus)[] = ["all", "draft", "sent", "accepted", "refused"];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function QuoteList({ quotes, canCreate, missingPrices }: { quotes: QuoteListItem[]; canCreate: boolean; missingPrices: number }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const list = useMemo(() => {
    const n = norm(q.trim());
    return quotes.filter((x) =>
      (filter === "all" || x.status === filter) &&
      (!n || norm(`${x.client_name} ${x.client_city} ${x.number}`).includes(n)));
  }, [quotes, q, filter]);

  const stats = useMemo(() => {
    const accepted = quotes.filter((x) => x.status === "accepted");
    const pending = quotes.filter((x) => x.status === "sent");
    return {
      total: quotes.length,
      pending: pending.length,
      pendingAmount: pending.reduce((s, x) => s + Number(x.total_ttc), 0),
      acceptedAmount: accepted.reduce((s, x) => s + Number(x.total_ttc), 0),
      accepted: accepted.length,
    };
  }, [quotes]);

  if (!quotes.length) {
    return (
      <div className="space-y-4">
        {missingPrices > 0 && <MissingNotice n={missingPrices} />}
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-sun-soft text-[#8a5a00]"><FileText className="size-7" /></span>
          <h2 className="mt-5 text-lg font-semibold">Aucun devis pour l&apos;instant</h2>
          <p className="mt-1.5 max-w-sm text-[14.5px] text-muted-foreground">Votre premier devis prend 2 minutes : client, type d&apos;installation, consommation, et le PDF est prêt.</p>
          <Button asChild size="lg" className="mt-6">
            <Link href={canCreate ? "/app/devis/nouveau" : "/app/abonnement"}><Plus />Créer mon premier devis</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {missingPrices > 0 && <MissingNotice n={missingPrices} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Devis" value={String(stats.total)} />
        <Stat label="En attente de réponse" value={String(stats.pending)} sub={stats.pending ? formatFCFA(stats.pendingAmount) : undefined} />
        <Stat label="Acceptés" value={String(stats.accepted)} />
        <Stat label="Montant accepté (TTC)" value={formatFCFA(stats.acceptedAmount)} small />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un client, une ville, un numéro" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Rechercher" />
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-[background-color,border-color,color,scale] duration-[160ms] ease-out active:scale-[0.97]",
                filter === f ? "border-foreground bg-foreground text-white" : "border-border bg-card text-muted-foreground hover:text-foreground")}>
              {f === "all" ? "Tous" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <Card className="px-6 py-10 text-center text-[14.5px] text-muted-foreground">Aucun devis ne correspond à votre recherche.</Card>
      ) : (
        <>
          {/* Ordinateur : tableau */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-[12px] font-medium text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 text-right font-medium">Puissance</th>
                  <th className="px-3 py-3 text-right font-medium">Montant TTC</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.id} className="group relative border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3.5">
                      <Link href={`/app/devis/${x.id}`} className="after:absolute after:inset-0">
                        <span className="block font-medium">{x.client_name || "Client sans nom"}</span>
                        <span className="block text-[12.5px] text-muted-foreground">{x.number}{x.client_city ? ` · ${x.client_city}` : ""}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-muted-foreground">{formatDateShort(x.created_at)}</td>
                    <td className="px-3 py-3.5 text-right tabular">{formatDecimal(Number(x.kwc), 2)} kWc</td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular">{formatFCFA(Number(x.total_ttc))}</td>
                    <td className="px-3 py-3.5"><StatusBadge status={x.status} /></td>
                    <td className="pr-4 text-muted-foreground"><ChevronRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile : cartes */}
          <ul className="space-y-2.5 md:hidden">
            {list.map((x) => (
              <li key={x.id}>
                <Link href={`/app/devis/${x.id}`} className="block rounded-2xl border border-border bg-card p-4 shadow-soft active:bg-muted/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">{x.client_name || "Client sans nom"}</p>
                      <p className="truncate text-[12.5px] text-muted-foreground">{x.number} · {formatDateShort(x.created_at)}</p>
                    </div>
                    <StatusBadge status={x.status} />
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="text-[13px] text-muted-foreground tabular">{formatDecimal(Number(x.kwc), 2)} kWc{x.client_city ? ` · ${x.client_city}` : ""}</span>
                    <span className="text-[15px] font-bold tabular">{formatFCFA(Number(x.total_ttc))}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-[12.5px] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-bold tracking-tight tabular", small ? "text-[17px]" : "text-2xl")}>{value}</p>
      {sub && <p className="mt-0.5 text-[12px] text-muted-foreground tabular">{sub}</p>}
    </Card>
  );
}

function MissingNotice({ n }: { n: number }) {
  return (
    <Notice tone="info" icon={<Package />}>
      {n} prix manquant{n > 1 ? "s" : ""} dans votre catalogue. Le PDF est bloqué tant qu&apos;un prix utilisé manque.{" "}
      <Link href="/app/catalogue" className="font-semibold underline underline-offset-4">Compléter le catalogue</Link>
    </Notice>
  );
}
