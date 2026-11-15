import { PageHeader } from "@/components/app/page-header";
import { CatalogEditor } from "@/components/settings/catalog-editor";
import { requireProfile } from "@/lib/data";
import type { CatalogItem } from "@/lib/types";

export const metadata = { title: "Catalogue" };

export default async function CataloguePage() {
  const { supabase, profile } = await requireProfile();
  const { data } = await supabase.from("catalog_items").select("*").order("position");
  return (
    <>
      <PageHeader title="Catalogue" description="Vos prix de vente. Ce sont eux qui apparaissent sur vos devis." />
      <CatalogEditor profile={profile} items={(data ?? []) as CatalogItem[]} />
    </>
  );
}
