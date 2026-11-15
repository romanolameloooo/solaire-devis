import type { Plan, Profile } from "@/lib/types";

export interface Access {
  /** Statut effectif (un essai dépassé est « expired » même si la base dit encore « trial ») */
  status: Plan;
  canCreate: boolean;
  /** Jours restants d'essai ou d'abonnement (null = illimité) */
  daysLeft: number | null;
  endsAt: string | null;
}

export function getAccess(p: Pick<Profile, "plan" | "trial_ends_at" | "subscription_ends_at">, now = new Date()): Access {
  const days = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / 86400000));
  if (p.plan === "active") {
    if (!p.subscription_ends_at) return { status: "active", canCreate: true, daysLeft: null, endsAt: null };
    const ok = new Date(p.subscription_ends_at) > now;
    return { status: ok ? "active" : "expired", canCreate: ok, daysLeft: days(p.subscription_ends_at), endsAt: p.subscription_ends_at };
  }
  if (p.plan === "trial") {
    const ok = new Date(p.trial_ends_at) > now;
    return { status: ok ? "trial" : "expired", canCreate: ok, daysLeft: days(p.trial_ends_at), endsAt: p.trial_ends_at };
  }
  // Désactivé à la main : pas de date de fin à afficher
  return { status: "expired", canCreate: false, daysLeft: 0, endsAt: null };
}
