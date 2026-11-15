"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import { activateSubscription, setPlan } from "@/lib/billing/activate";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) throw new Error("Accès refusé");
}

export type ActionResult = { ok: boolean; message: string };

export async function activateAction(userId: string, until: string): Promise<ActionResult> {
  await assertAdmin();
  const d = new Date(`${until}T23:59:59Z`); // fin de journée, heure de Dakar / Abidjan (GMT)
  if (Number.isNaN(d.getTime()) || d < new Date()) return { ok: false, message: "Choisissez une date dans le futur." };
  await activateSubscription(userId, d, "manual");
  revalidatePath("/admin");
  return { ok: true, message: "Compte activé" };
}

export async function expireAction(userId: string): Promise<ActionResult> {
  await assertAdmin();
  await setPlan(userId, "expired");
  revalidatePath("/admin");
  return { ok: true, message: "Compte désactivé" };
}

export async function extendTrialAction(userId: string, days: number): Promise<ActionResult> {
  await assertAdmin();
  if (!(days > 0 && days <= 90)) return { ok: false, message: "Entre 1 et 90 jours." };
  await setPlan(userId, "trial", { trialEndsAt: new Date(Date.now() + days * 86400000) });
  revalidatePath("/admin");
  return { ok: true, message: `Essai de ${days} jours à partir d'aujourd'hui` };
}
