import type { Metadata } from "next";
import { LEGAL } from "@/config/legal";
import { LegalLayout, Section, V } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Quelles données SolaDevis collecte, pourquoi, combien de temps, et comment exercer vos droits.",
  alternates: { canonical: "/confidentialite" },
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Politique de confidentialité" updated={LEGAL.miseAJour}>
      <p>
        Cette page explique quelles données personnelles {LEGAL.service} traite, pourquoi, pendant combien de temps, et comment
        exercer vos droits. Elle s&apos;applique conformément à la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection
        des données à caractère personnel et, pour les personnes situées dans l&apos;Union européenne, au Règlement général sur la
        protection des données (RGPD).
      </p>

      <Section title="1. Qui est responsable de vos données">
        <p>
          <V>{LEGAL.editeur}</V>, <V>{LEGAL.immatriculation}</V>, dont le siège est situé <V>{LEGAL.adresse}</V>.
          Contact : <V>{LEGAL.emailContact}</V>.
        </p>
        <p>
          <strong>Données de vos clients.</strong> Quand vous saisissez dans {LEGAL.service} le nom, le téléphone ou la ville de vos
          propres clients, c&apos;est vous, installateur, qui êtes responsable de ces données. {LEGAL.service} les traite uniquement
          pour votre compte, pour produire vos devis, et ne les utilise à aucune autre fin.
        </p>
      </Section>

      <Section title="2. Données collectées">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Compte</strong> : email, mot de passe (stocké chiffré, jamais lisible), nom de l&apos;entreprise, téléphone.</li>
          <li><strong>Entreprise</strong> : adresse, email affiché, NINEA / RC, logo.</li>
          <li><strong>Activité</strong> : votre catalogue de prix, vos réglages et vos devis (y compris les informations de vos clients que vous y saisissez).</li>
          <li><strong>Abonnement</strong> : statut, dates d&apos;essai et d&apos;abonnement, référence de paiement. Nous ne recevons jamais vos données de carte ou de Mobile Money.</li>
          <li><strong>Mesure d&apos;audience</strong> : pages vues et type d&apos;appareil, de façon agrégée et anonyme, sans cookie.</li>
        </ul>
      </Section>

      <Section title="3. Pourquoi nous les utilisons">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Fournir le service : votre compte, vos devis et vos PDF (exécution du contrat).</li>
          <li>Gérer l&apos;essai gratuit et l&apos;abonnement (exécution du contrat).</li>
          <li>Vous envoyer les emails indispensables : confirmation de compte, mot de passe oublié (exécution du contrat).</li>
          <li>Sécuriser le service et prévenir les abus (intérêt légitime).</li>
          <li>Améliorer le site grâce à des statistiques anonymes (intérêt légitime).</li>
        </ul>
        <p>Nous ne vendons pas vos données et ne les utilisons pas pour de la publicité.</p>
      </Section>

      <Section title="4. Durée de conservation">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Compte, catalogue et devis : tant que votre compte existe, puis supprimés dans les 30 jours après sa clôture.</li>
          <li>Comptes jamais activés après l&apos;essai : supprimés 12 mois après la fin de l&apos;essai.</li>
          <li>Données de facturation : conservées le temps imposé par les obligations comptables.</li>
        </ul>
      </Section>

      <Section title="5. Qui y a accès">
        <p>Seuls vous et, pour l&apos;assistance et la gestion des abonnements, l&apos;équipe {LEGAL.service}. Nos prestataires techniques :</p>
        <ul className="list-disc space-y-1.5 pl-5">
          {LEGAL.hebergeurs.map((h) => (
            <li key={h.nom}><strong>{h.nom}</strong> : {h.role}.</li>
          ))}
        </ul>
        <p>
          Ces prestataires peuvent traiter des données hors du Sénégal. Ils sont tenus contractuellement de les protéger et de ne
          les utiliser que pour faire fonctionner {LEGAL.service}.
        </p>
      </Section>

      <Section title="6. Cookies">
        <p>
          {LEGAL.service} utilise uniquement des cookies <strong>strictement nécessaires</strong> : ceux qui vous gardent connecté à
          votre compte. Ils ne servent à rien d&apos;autre et ne peuvent pas être désactivés sans empêcher la connexion. La mesure
          d&apos;audience fonctionne sans cookie. C&apos;est pourquoi aucune bannière de consentement ne vous est demandée.
        </p>
      </Section>

      <Section title="7. Sécurité">
        <p>
          Connexions chiffrées (HTTPS), mots de passe chiffrés, et cloisonnement des données dans la base : chaque installateur ne
          peut lire que ses propres données. Les logos sont stockés dans un dossier propre à chaque compte.
        </p>
      </Section>

      <Section title="8. Vos droits">
        <p>
          Vous pouvez à tout moment demander à accéder à vos données, les corriger, les supprimer, vous opposer à un traitement ou
          en recevoir une copie. Écrivez à <V>{LEGAL.emailContact}</V> ; nous répondons sous 30 jours. Vous pouvez aussi modifier
          directement la plupart de vos informations dans Paramètres.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la Commission de protection des données
          personnelles du Sénégal (CDP), ou l&apos;autorité de protection des données de votre pays.
        </p>
      </Section>
    </LegalLayout>
  );
}
