import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/config/legal";
import { PRICE_LABEL } from "@/lib/env";
import { LegalLayout, Section, V } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description: "Les règles d'utilisation de SolaDevis : compte, essai gratuit de 15 jours, abonnement, responsabilités.",
  alternates: { canonical: "/cgu" },
};

export default function TermsPage() {
  return (
    <LegalLayout title="Conditions générales d'utilisation" updated={LEGAL.miseAJour}>
      <Section title="1. Objet">
        <p>
          {LEGAL.service} est un service en ligne qui aide les installateurs solaires à dimensionner une installation et à produire
          des devis au format PDF. Il est édité par <V>{LEGAL.editeur}</V> (<V>{LEGAL.immatriculation}</V>), <V>{LEGAL.adresse}</V>.
          En créant un compte, vous acceptez les présentes conditions.
        </p>
      </Section>

      <Section title="2. Compte">
        <p>
          Le service est réservé aux professionnels. Vous fournissez des informations exactes et gardez votre mot de passe
          confidentiel. Vous êtes responsable de l&apos;utilisation de votre compte.
        </p>
      </Section>

      <Section title="3. Essai gratuit et abonnement">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Chaque nouveau compte bénéficie de <strong>15 jours d&apos;essai gratuit</strong>, sans moyen de paiement.</li>
          <li>À la fin de l&apos;essai, la création de nouveaux devis nécessite un abonnement ({PRICE_LABEL}). Vos devis existants restent consultables et téléchargeables.</li>
          <li>L&apos;abonnement est payé à l&apos;avance pour la période choisie. Il est activé à réception du paiement et n&apos;est pas renouvelé automatiquement.</li>
          <li>Une période commencée n&apos;est pas remboursable, sauf en cas d&apos;indisponibilité prolongée du service de notre fait.</li>
          <li>Les tarifs peuvent évoluer ; tout changement s&apos;applique à la période suivante et vous est annoncé à l&apos;avance.</li>
        </ul>
      </Section>

      <Section title="4. Ce que fait le calcul, et ce qu'il ne fait pas">
        <p>
          Le dimensionnement repose sur les formules et les réglages affichés dans « Comment c&apos;est calculé » et dans vos
          Paramètres (ensoleillement, rendement, profondeur de décharge, marge…). C&apos;est une <strong>estimation</strong> destinée
          à préparer une offre.
        </p>
        <p>
          Vous restez seul responsable de vérifier, sur place, la faisabilité technique de l&apos;installation (toiture, câblage,
          protections, compatibilité du matériel) ainsi que les prix, quantités et conditions figurant sur vos devis. Les prix
          utilisés sont exclusivement les vôtres. Les productions et économies affichées sont des estimations et ne constituent
          pas une garantie de résultat envers vos clients.
        </p>
      </Section>

      <Section title="5. Vos contenus">
        <p>
          Vos prix, votre logo, vos devis et les données de vos clients vous appartiennent. Vous nous autorisez à les stocker et à
          les traiter uniquement pour faire fonctionner le service. Vous vous engagez à avoir le droit de saisir les informations
          de vos clients et à les informer de l&apos;usage que vous en faites.
        </p>
      </Section>

      <Section title="6. Utilisation acceptable">
        <p>
          Il est interdit d&apos;utiliser le service pour des devis frauduleux, de tenter d&apos;accéder aux données d&apos;autres
          comptes, de perturber le service ou d&apos;en extraire le contenu de manière automatisée. Tout manquement peut entraîner
          la suspension du compte.
        </p>
      </Section>

      <Section title="7. Disponibilité et responsabilité">
        <p>
          Nous faisons notre possible pour que le service soit disponible et fiable, sans pouvoir garantir une absence totale
          d&apos;interruption. Notre responsabilité est limitée aux dommages directs et, au total, au montant que vous avez payé
          pour les 12 derniers mois d&apos;abonnement.
        </p>
      </Section>

      <Section title="8. Résiliation">
        <p>
          Vous pouvez cesser d&apos;utiliser le service à tout moment et demander la suppression de votre compte à{" "}
          <V>{LEGAL.emailContact}</V>. Pensez à télécharger vos devis avant. La suppression est définitive.
        </p>
      </Section>

      <Section title="9. Données personnelles">
        <p>
          Le traitement de vos données est décrit dans la <Link href="/confidentialite" className="font-medium text-primary underline underline-offset-4">politique de confidentialité</Link>.
        </p>
      </Section>

      <Section title="10. Droit applicable">
        <p>
          Les présentes conditions sont soumises au droit sénégalais. En cas de litige, une solution amiable sera recherchée en
          priorité ; à défaut, les tribunaux de Dakar seront compétents.
        </p>
      </Section>
    </LegalLayout>
  );
}
