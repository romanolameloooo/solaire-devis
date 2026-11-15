/**
 * Informations légales de l'éditeur du site, affichées dans « Confidentialité » et « CGU ».
 * À COMPLÉTER avant la mise en ligne : tant qu'une valeur commence par « À compléter », elle s'affiche en orange
 * sur la page pour ne pas être oubliée.
 */
export const LEGAL = {
  /** Nom commercial du service */
  service: "SolaDevis",
  /** Raison sociale (ou nom et prénom si entreprise individuelle) */
  editeur: process.env.NEXT_PUBLIC_LEGAL_EDITEUR || "À compléter : raison sociale",
  /** Forme juridique et NINEA / RCCM */
  immatriculation: process.env.NEXT_PUBLIC_LEGAL_IMMATRICULATION || "À compléter : forme juridique, NINEA, RCCM",
  /** Adresse du siège */
  adresse: process.env.NEXT_PUBLIC_LEGAL_ADRESSE || "À compléter : adresse du siège",
  /** Email de contact pour les questions de données personnelles */
  emailContact: process.env.NEXT_PUBLIC_LEGAL_EMAIL || "À compléter : email de contact",
  /** Prestataires techniques (à ajuster si vous changez d'hébergeur) */
  hebergeurs: [
    { nom: "Netlify, Inc.", role: "hébergement du site (États-Unis)" },
    { nom: "Supabase, Inc.", role: "base de données, comptes et fichiers (serveurs en Irlande, Union européenne)" },
    { nom: "Umami Software, Inc.", role: "mesure d'audience anonyme, sans cookie (États-Unis)" },
  ],
  /** Date de dernière mise à jour des documents */
  miseAJour: "15 novembre 2026",
} as const;

export const isPlaceholder = (v: string) => v.startsWith("À compléter");
