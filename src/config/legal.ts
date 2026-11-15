/**
 * Informations légales de l'éditeur du site, affichées dans « Confidentialité » et « CGU ».
 * Une valeur qui commence par « À compléter » s'affiche surlignée en orange pour ne pas être oubliée.
 * Les variables NEXT_PUBLIC_LEGAL_* (Netlify) remplacent ces valeurs si elles sont renseignées.
 */
export const LEGAL = {
  /** Nom commercial du service */
  service: "SolaDevis",
  /** Nom de l'éditeur (raison sociale, ou prénom et nom pour un entrepreneur individuel) */
  editeur: process.env.NEXT_PUBLIC_LEGAL_EDITEUR || "Romain Cadenel",
  /** Statut juridique */
  statut: process.env.NEXT_PUBLIC_LEGAL_STATUT || "entrepreneur individuel",
  /** Numéro d'immatriculation (SIRET en France, NINEA au Sénégal). Laisser vide s'il n'y en a pas encore. */
  immatriculation: process.env.NEXT_PUBLIC_LEGAL_IMMATRICULATION || "",
  /** Adresse */
  adresse: process.env.NEXT_PUBLIC_LEGAL_ADRESSE || "144 route Léon Lachamp",
  /** Code postal et ville */
  ville: process.env.NEXT_PUBLIC_LEGAL_VILLE || "À compléter : code postal et ville",
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
