"use client";
import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, Card, Field, Input } from "@/components/ui/primitives";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatDateShort } from "@/lib/format";
import type { Access } from "@/lib/billing/access";
import type { Plan } from "@/lib/types";
import { activateAction, expireAction, extendTrialAction, type ActionResult } from "./actions";

export interface AdminRow {
  id: string; email: string; company: string; phone: string; createdAt: string;
  plan: Plan; access: Access; quotes: number; onboarded: boolean;
}

const BADGE = { trial: ["Essai", "sun"], active: ["Actif", "success"], expired: ["Expiré", "danger"] } as const;

const inDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

export function AdminTable({ rows }: { rows: AdminRow[] }) {
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<AdminRow | null>(null);
  const [until, setUntil] = useState(inDays(31));
  const [pending, start] = useTransition();

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? rows.filter((r) => `${r.email} ${r.company} ${r.phone}`.toLowerCase().includes(n)) : rows;
  }, [rows, q]);

  const run = (fn: () => Promise<ActionResult>, close = true) =>
    start(async () => {
      try {
        const res = await fn();
        if (res.ok) toast.success(res.message); else toast.error(res.message);
        if (res.ok && close) setTarget(null);
      } catch {
        toast.error("Action impossible. Vérifiez la clé SUPABASE_SERVICE_ROLE_KEY.");
      }
    });

  return (
    <>
      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher un email, une entreprise, un téléphone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-4 space-y-2.5">
        {list.length === 0 && <Card className="px-6 py-10 text-center text-muted-foreground">Aucun compte.</Card>}
        {list.map((r) => {
          const [label, variant] = BADGE[r.access.status];
          return (
            <Card key={r.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{r.company || "Sans nom"}</p>
                  <Badge variant={variant}>{label}</Badge>
                  {!r.onboarded && <Badge variant="neutral">Onboarding non terminé</Badge>}
                </div>
                <p className="truncate text-[13px] text-muted-foreground">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
                <p className="text-[12.5px] text-muted-foreground">
                  Inscrit le {formatDateShort(r.createdAt)} · {r.quotes} devis
                  {r.access.status === "active" && (r.access.endsAt ? ` · abonné jusqu'au ${formatDate(r.access.endsAt)}` : " · abonné sans date de fin")}
                  {r.access.status === "trial" && r.access.endsAt && ` · essai jusqu'au ${formatDate(r.access.endsAt)}`}
                  {r.access.status === "expired" && (r.access.endsAt ? ` · expiré depuis le ${formatDate(r.access.endsAt)}` : " · désactivé")}
                </p>
              </div>
              <Button size="sm" variant={r.access.status === "active" ? "outline" : "default"} onClick={() => { setTarget(r); setUntil(inDays(31)); }}>Gérer</Button>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          {target && (
            <>
              <DialogTitle>{target.company || target.email}</DialogTitle>
              <DialogDescription>{target.email}</DialogDescription>
              <div className="mt-5 space-y-4">
                <Field label="Activer l'abonnement jusqu'au">
                  <Input type="date" value={until} min={inDays(1)} onChange={(e) => setUntil(e.target.value)} />
                </Field>
                <div className="flex flex-wrap gap-1.5">
                  {[["1 mois", 31], ["3 mois", 92], ["6 mois", 183], ["1 an", 366]].map(([l, d]) => (
                    <button key={l} type="button" onClick={() => setUntil(inDays(d as number))} className="h-8 rounded-full border border-border px-3 text-[13px] hover:border-primary hover:text-primary">{l}</button>
                  ))}
                </div>
                <Button className="w-full" loading={pending} onClick={() => run(() => activateAction(target.id, until))}>Activer jusqu&apos;au {formatDate(until)}</Button>
                <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
                  <Button variant="outline" disabled={pending} onClick={() => run(() => extendTrialAction(target.id, 7))}>Essai de 7 jours</Button>
                  <Button variant="outline" className="text-destructive" disabled={pending} onClick={() => run(() => expireAction(target.id))}>Désactiver</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
