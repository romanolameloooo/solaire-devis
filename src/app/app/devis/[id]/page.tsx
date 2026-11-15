import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/data";
import { getAccess } from "@/lib/billing/access";
import type { QuoteRow } from "@/lib/types";
import { QuoteDetail } from "./quote-detail";

export const metadata = { title: "Devis" };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, profile } = await requireProfile();
  const { data } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <QuoteDetail quote={data as QuoteRow} profile={profile} canCreate={getAccess(profile).canCreate} />;
}
