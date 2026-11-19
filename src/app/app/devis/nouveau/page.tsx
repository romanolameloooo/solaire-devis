import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/data";
import { getAccess } from "@/lib/billing/access";
import type { CatalogItem, QuoteRow } from "@/lib/types";
import { QuoteWizard } from "@/components/quote/quote-wizard";

export const metadata = { title: "Nouveau devis" };

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ from?: string; edit?: string }> }) {
  const { from, edit } = await searchParams;
  const { supabase, profile, companyId } = await requireProfile();
  const access = getAccess(profile);
  if (!access.canCreate && !edit) redirect("/app/abonnement?bloque=1");

  const [{ data: items }, src] = await Promise.all([
    supabase.from("catalog_items").select("*").order("position"),
    from || edit ? supabase.from("quotes").select("*").eq("id", (edit || from)!).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  // Un devis signé est verrouillé : on renvoie vers sa fiche
  if (edit && (src.data as QuoteRow | null)?.signed_at) redirect(`/app/devis/${edit}?verrouille=1`);

  return (
    <QuoteWizard
      companyId={companyId}
      profile={profile}
      catalog={(items ?? []) as CatalogItem[]}
      source={(src.data as QuoteRow | null) ?? null}
      editing={Boolean(edit && src.data)}
    />
  );
}
