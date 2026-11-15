import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Essai gratuit 15 jours",
  description: "Créez votre compte SolaDevis : 15 jours d'essai gratuit, sans moyen de paiement. Devis solaires en FCFA à votre nom.",
  alternates: { canonical: "/signup" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
