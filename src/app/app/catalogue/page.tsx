import { Lock } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { CatalogEditor } from "@/components/settings/catalog-editor";
import { Card, CardContent, Notice } from "@/components/ui/primitives";
import { requireProfile } from "@/lib/data";
import { formatDecimal, formatFCFA } from "@/lib/format";
import type { CatalogItem, CatalogType } from "@/lib/types";

export const metadata = { title: "Catalogue" };

const SECTIONS: { type: CatalogType; title: string; unit: string }[] = [
  { type: "panel", title: "Panneaux", unit: "Wc" },
  { type: "inverter", title: "Onduleurs", unit: "kW" },
  { type: "battery", title: "Batteries", unit: "kWh" },
];

export default async function CataloguePage() {
  const { supabase, profile, isOwner } = await requireProfile();
  const { data } = await supabase.from("catalog_items").select("*").order("position");
  const items = (data ?? []) as CatalogItem[];

  if (isOwner) {
    return (
      <>
        <PageHeader title="Catalogue" description="Vos prix de vente. Ce sont eux qui apparaissent sur vos devis." />
        <CatalogEditor profile={profile} items={items} />
      </>
    );
  }

  // Technicien : lecture seule (les prix sont gérés par le responsable)
  return (
    <>
      <PageHeader title="Catalogue" description="Le matériel et les prix de votre entreprise." />
      <Notice tone="info" icon={<Lock />} className="mb-4">Seul le responsable de l&apos;entreprise peut modifier les prix.</Notice>
      <div className="space-y-4">
        {SECTIONS.map((s) => {
          const list = items.filter((i) => i.type === s.type);
          return (
            <Card key={s.type}><CardContent>
              <h2 className="text-[15px] font-semibold">{s.title}</h2>
              {list.length === 0 ? <p className="mt-2 text-[13.5px] text-muted-foreground">Aucun élément.</p> : (
                <ul className="mt-3 divide-y divide-border">
                  {list.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
                      <span className="min-w-0"><span className="block truncate font-medium">{i.model}</span><span className="text-[12.5px] text-muted-foreground tabular">{formatDecimal(Number(i.power ?? 0), 1)} {s.unit}</span></span>
                      <span className="shrink-0 font-semibold tabular">{i.price == null ? <span className="font-normal text-muted-foreground">Prix non renseigné</span> : formatFCFA(Number(i.price))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent></Card>
          );
        })}
      </div>
    </>
  );
}
