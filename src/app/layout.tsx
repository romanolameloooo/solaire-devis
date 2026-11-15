import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics, AnalyticsFilter } from "@/components/analytics";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "SolaDevis — Vos devis solaires en 2 minutes", template: "%s · SolaDevis" },
  description:
    "Dimensionnement et devis PDF à votre nom pour les installateurs solaires du Sénégal et de Côte d'Ivoire. Panneaux, onduleur, batteries, montants en FCFA. Essai gratuit 15 jours.",
  applicationName: "SolaDevis",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_SN",
    siteName: "SolaDevis",
    url: "/",
    title: "SolaDevis — Vos devis solaires en 2 minutes",
    description: "Dimensionnement + devis PDF à votre nom, en FCFA. Essai gratuit 15 jours.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SolaDevis — Vos devis solaires en 2 minutes",
    description: "Dimensionnement + devis PDF à votre nom, en FCFA. Essai gratuit 15 jours.",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f8f5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-dvh">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "!rounded-xl !border-border !shadow-lift !font-sans",
              title: "!text-[14px] !font-medium",
            },
          }}
        />
        {/* Mesure d'audience sans cookie : aucune bannière de consentement nécessaire */}
        <AnalyticsFilter />
        <Analytics />
      </body>
    </html>
  );
}
