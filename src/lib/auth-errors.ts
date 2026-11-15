/** Traduit les erreurs Supabase Auth en messages clairs. */
export function authErrorFr(message: string | undefined | null): string {
  const m = (message || "").toLowerCase();
  if (m.includes("captcha")) return "La vérification anti-robot a échoué. Réessayez.";
  if (m.includes("invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Confirmez d'abord votre email : cliquez sur le lien reçu dans votre boîte mail.";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already exists"))
    return "Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.";
  if (m.includes("password should be at least") || m.includes("weak password")) return "Mot de passe trop court : 8 caractères minimum.";
  if (m.includes("email rate limit") || m.includes("error sending") || m.includes("sending confirmation") || m.includes("sending recovery"))
    return "L'email n'a pas pu être envoyé pour le moment. Réessayez dans une heure, ou contactez-nous.";
  if (m.includes("rate limit") || m.includes("too many")) return "Trop de tentatives. Patientez quelques minutes puis réessayez.";
  if (m.includes("invalid email") || m.includes("unable to validate email")) return "Adresse email invalide.";
  if (m.includes("same password") || m.includes("different from the old")) return "Choisissez un mot de passe différent de l'ancien.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Connexion impossible. Vérifiez votre accès internet.";
  return "Une erreur est survenue. Réessayez dans un instant.";
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
