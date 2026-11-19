"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/env";
import { isEmail } from "@/lib/auth-errors";

export type TeamResult = { ok: boolean; message: string };

/** Seul le propriétaire gère l'équipe. Les écritures passent par la clé serveur (jamais exposée au navigateur). */
async function owner() {
  const ctx = await requireProfile();
  if (!ctx.isOwner) throw new Error("Réservé au responsable de l'entreprise.");
  return ctx;
}

export async function inviteTechnician(rawEmail: string): Promise<TeamResult> {
  const { companyId, user, profile } = await owner();
  const email = rawEmail.trim().toLowerCase();
  if (!isEmail(email)) return { ok: false, message: "Adresse email invalide." };
  if (email === (user.email ?? "").toLowerCase()) return { ok: false, message: "C'est votre propre adresse." };

  const db = createAdminClient();
  const { data: existing } = await db.from("team_members").select("company_id").ilike("email", email).maybeSingle();
  if (existing) {
    return {
      ok: false,
      message: existing.company_id === companyId
        ? "Cette personne fait déjà partie de votre équipe."
        : "Cette adresse a déjà un compte SolaDevis. Demandez au technicien d'utiliser une autre adresse email.",
    };
  }

  const { error: invErr } = await db.from("team_invites").upsert(
    { company_id: companyId, email, invited_by: user.id, accepted_at: null, created_at: new Date().toISOString() },
    { onConflict: "company_id,email" },
  );
  if (invErr) return { ok: false, message: "L'invitation n'a pas pu être enregistrée." };

  const { error } = await db.auth.admin.inviteUserByEmail(email, {
    data: { invite_company_id: companyId, invited_company_name: profile.company_name },
    redirectTo: `${SITE_URL}/auth/callback?next=/update-password`,
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      return { ok: false, message: "Cette adresse a déjà un compte SolaDevis. Demandez au technicien d'utiliser une autre adresse email." };
    }
    if (/rate limit/i.test(error.message)) return { ok: false, message: "Trop d'emails envoyés. Réessayez dans une heure." };
    return { ok: false, message: "L'email d'invitation n'a pas pu être envoyé. Réessayez." };
  }
  revalidatePath("/app/parametres");
  return { ok: true, message: `Invitation envoyée à ${email}` };
}

export async function cancelInvite(inviteId: string): Promise<TeamResult> {
  const { companyId } = await owner();
  const db = createAdminClient();
  const { data: inv } = await db.from("team_invites").select("email, accepted_at").eq("id", inviteId).eq("company_id", companyId).maybeSingle();
  if (!inv) return { ok: false, message: "Invitation introuvable." };
  await db.from("team_invites").delete().eq("id", inviteId).eq("company_id", companyId);
  // Le compte créé par l'invitation (pas encore utilisé) est supprimé aussi, pour pouvoir réinviter plus tard
  if (!inv.accepted_at) {
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const u = list?.users.find((x) => x.email?.toLowerCase() === inv.email.toLowerCase() && !x.last_sign_in_at);
    if (u) {
      const { data: m } = await db.from("team_members").select("company_id").eq("user_id", u.id).maybeSingle();
      if (!m || m.company_id === companyId) await db.auth.admin.deleteUser(u.id);
    }
  }
  revalidatePath("/app/parametres");
  return { ok: true, message: "Invitation annulée" };
}

/** Retire un technicien : son compte est supprimé, ses devis restent dans l'entreprise. */
export async function removeMember(userId: string): Promise<TeamResult> {
  const { companyId, user } = await owner();
  if (userId === user.id) return { ok: false, message: "Vous ne pouvez pas vous retirer vous-même." };
  const db = createAdminClient();
  const { data: m } = await db.from("team_members").select("role, email").eq("user_id", userId).eq("company_id", companyId).maybeSingle();
  if (!m) return { ok: false, message: "Membre introuvable." };
  if (m.role === "owner") return { ok: false, message: "Le responsable ne peut pas être retiré." };
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return { ok: false, message: "Le membre n'a pas pu être retiré." };
  await db.from("team_invites").delete().eq("company_id", companyId).ilike("email", m.email);
  revalidatePath("/app/parametres");
  return { ok: true, message: `${m.email} a été retiré de l'équipe` };
}
