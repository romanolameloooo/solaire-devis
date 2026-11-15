import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { requireProfile } from "@/lib/data";
import { getAccess } from "@/lib/billing/access";
import type { QuoteRow } from "@/lib/types";
import { QuoteList } from "./quote-list";

export const metadata = { title: "Mes devis" };

export type QuoteListItem = Pick<QuoteRow, "id" | "number" | "client_name" | "client_city" | "created_at" | "kwc" | "total_ttc" | "status" | "mode">;

export default async function DashboardPage() {
  const { supabase, profile } = await requireProfile();
  const [{ data }, { count: missingPrices }] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, number, client_name, client_city, created_at, kwc, total_ttc, status, mode")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("catalog_items").select("id", { count: "exact", head: true }).is("price", null),
  ]);
  const access = getAccess(profile);

  return (
    <>
      <PageHeader
        title="Mes devis"
        description={profile.company_name}
        actions={
          <Button asChild className="hidden md:inline-flex">
            <Link href={access.canCreate ? "/app/devis/nouveau" : "/app/abonnement"}><Plus />Nouveau devis</Link>
          </Button>
        }
      />
      <QuoteList quotes={(data ?? []) as QuoteListItem[]} canCreate={access.canCreate} missingPrices={missingPrices ?? 0} />
    </>
  );
}
