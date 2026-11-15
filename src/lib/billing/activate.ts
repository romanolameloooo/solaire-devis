import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/types";

/** Passe un compte en « active » jusqu'à une date. Utilisé par /admin et, plus tard, par le webhook de paiement. */
export async function activateSubscription(userId: string, until: Date, provider = "manual", reference?: string) {
  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ plan: "active", subscription_ends_at: until.toISOString(), payment_provider: provider, payment_reference: reference ?? null })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function setPlan(userId: string, plan: Plan, opts: { trialEndsAt?: Date } = {}) {
  const db = createAdminClient();
  const patch: Record<string, unknown> = { plan };
  if (opts.trialEndsAt) patch.trial_ends_at = opts.trialEndsAt.toISOString();
  const { error } = await db.from("profiles").update(patch).eq("id", userId);
  if (error) throw new Error(error.message);
}
