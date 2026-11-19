"use client";
import { useState, useTransition } from "react";
import { Mail, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, Field, Input } from "@/components/ui/primitives";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cancelInvite, inviteTechnician, removeMember, type TeamResult } from "@/app/app/parametres/team-actions";
import { formatDateShort } from "@/lib/format";
import type { TeamMember } from "@/lib/types";

export interface InviteRow { id: string; email: string; created_at: string; accepted_at: string | null }

export function TeamEditor({ members, invites, currentUserId }: { members: TeamMember[]; invites: InviteRow[]; currentUserId: string }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const [toRemove, setToRemove] = useState<TeamMember | null>(null);
  const waiting = invites.filter((i) => !i.accepted_at);

  const run = (fn: () => Promise<TeamResult>, after?: () => void) =>
    start(async () => {
      try {
        const r = await fn();
        if (r.ok) { toast.success(r.message); after?.(); } else toast.error(r.message);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action impossible.");
      }
    });

  return (
    <div className="space-y-6">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setErr("Adresse email invalide.");
          setErr("");
          run(() => inviteTechnician(email), () => setEmail(""));
        }}
        className="space-y-3"
      >
        <Field label="Inviter un technicien" htmlFor="invite" error={err} hint="Il reçoit un email pour choisir son mot de passe. Il pourra faire des devis, des visites et faire signer, sans voir les prix d'achat ni l'abonnement.">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="invite" type="email" inputMode="email" placeholder="technicien@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!err} />
            <Button type="submit" loading={pending} className="shrink-0"><UserPlus />Inviter</Button>
          </div>
        </Field>
      </form>

      <div>
        <h3 className="mb-2 text-[13px] font-semibold">Membres ({members.length})</h3>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{m.email || "—"}</p>
                <p className="text-[12.5px] text-muted-foreground">Depuis le {formatDateShort(m.created_at)}</p>
              </div>
              <Badge variant={m.role === "owner" ? "success" : "neutral"}>{m.role === "owner" ? "Responsable" : "Technicien"}</Badge>
              {m.role !== "owner" && m.user_id !== currentUserId && (
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => setToRemove(m)} aria-label={`Retirer ${m.email}`}><Trash2 /></Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {waiting.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold">Invitations en attente</h3>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {waiting.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px]">{i.email}</p>
                  <p className="text-[12.5px] text-muted-foreground">Invité le {formatDateShort(i.created_at)}</p>
                </div>
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => inviteTechnician(i.email))}>Renvoyer</Button>
                <Button variant="ghost" size="sm" className="text-destructive" disabled={pending} onClick={() => run(() => cancelInvite(i.id))}>Annuler</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <DialogContent>
          <DialogTitle>Retirer {toRemove?.email} ?</DialogTitle>
          <DialogDescription>Son compte sera supprimé et il ne pourra plus se connecter. Les devis qu&apos;il a créés restent dans votre entreprise.</DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button variant="destructive" loading={pending} onClick={() => toRemove && run(() => removeMember(toRemove.user_id), () => setToRemove(null))}>Retirer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
