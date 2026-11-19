import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/data";
import { getAccess } from "@/lib/billing/access";
import type { QuoteRow } from "@/lib/types";
import { QuoteDetail } from "./quote-detail";

export const metadata = { title: "Devis" };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, profile, isOwner, companyId, user } = await requireProfile();
  const { data } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const quote = data as QuoteRow;
  // Le propriétaire voit qui a fait le devis
  let creator: string | null = null;
  if (isOwner && quote.created_by && quote.created_by !== user.id) {
    const { data: m } = await supabase.from("team_members").select("email").eq("user_id", quote.created_by).maybeSingle();
    creator = m?.email ?? "un ancien membre de l'équipe";
  }
  return <QuoteDetail quote={quote} profile={profile} canCreate={getAccess(profile).canCreate} companyId={companyId} creator={creator} />;
}
