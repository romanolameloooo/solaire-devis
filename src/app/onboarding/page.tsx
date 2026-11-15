import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/data";
import type { CatalogItem } from "@/lib/types";
import { OnboardingFlow } from "./flow";

export const metadata = { title: "Bienvenue", robots: { index: false } };

export default async function OnboardingPage() {
  const { supabase, profile } = await requireProfile(true);
  if (profile.onboarded) redirect("/app");
  const { data: items } = await supabase.from("catalog_items").select("*").order("position");
  return <OnboardingFlow profile={profile} items={(items ?? []) as CatalogItem[]} />;
}
