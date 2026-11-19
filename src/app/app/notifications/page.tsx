import Link from "next/link";
import { Bell, BadgeCheck, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/primitives";
import { requireOwner } from "@/lib/data";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/types";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { supabase } = await requireOwner();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  const list = (data ?? []) as AppNotification[];
  // Ouvrir la page vaut lecture : la pastille de la cloche disparaît
  if (list.some((n) => !n.read_at)) await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);

  return (
    <>
      <PageHeader title="Notifications" description="Les devis signés par vos clients, sur place ou à distance." />
      {list.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><Bell className="size-6" /></span>
          <p className="mt-4 text-[15px] font-medium">Aucune notification pour l&apos;instant</p>
          <p className="mt-1 text-[13.5px] text-muted-foreground">Vous serez prévenu ici dès qu&apos;un client signe un devis.</p>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {list.map((n) => (
            <li key={n.id}>
              <Link href={n.quote_id ? `/app/devis/${n.quote_id}` : "/app"} className={cn("flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-soft active:bg-muted/50", n.read_at ? "border-border" : "border-primary/40")}>
                <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold">{n.title}</span>
                  <span className="block text-[13px] text-muted-foreground">{n.body}</span>
                  <span className="mt-1 block text-[12px] text-muted-foreground">{formatDateShort(n.created_at)}{!n.read_at ? " · Nouveau" : ""}</span>
                </span>
                <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
