import { Badge } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import type { Access } from "@/lib/billing/access";

export function PlanSummary({ access }: { access: Access }) {
  const label = { trial: "Essai gratuit", active: "Abonnement actif", expired: "Inactif" }[access.status];
  const variant = { trial: "sun", active: "success", expired: "danger" } as const;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-muted px-4 py-3">
      <Badge variant={variant[access.status]}>{label}</Badge>
      <span className="text-[14px] text-muted-foreground">
        {access.status === "trial" && access.endsAt && <>Jusqu&apos;au {formatDate(access.endsAt)} ({access.daysLeft} jour{access.daysLeft === 1 ? "" : "s"})</>}
        {access.status === "active" && (access.endsAt ? <>Jusqu&apos;au {formatDate(access.endsAt)}</> : "Sans date de fin")}
        {access.status === "expired" && <>Création de devis bloquée{access.endsAt ? ` depuis le ${formatDate(access.endsAt)}` : ""}</>}
      </span>
    </div>
  );
}
