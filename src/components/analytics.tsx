import Script from "next/script";

/**
 * Mesure d'audience Umami : sans cookie et sans donnée personnelle, donc sans bannière de consentement.
 * Offre gratuite sur https://cloud.umami.is. N'affiche rien tant que NEXT_PUBLIC_UMAMI_WEBSITE_ID est vide.
 * Les pages privées (/app, /admin, /onboarding) ne sont pas mesurées.
 */
export function Analytics() {
  const id = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!id) return null;
  const src = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || "https://cloud.umami.is/script.js";
  return (
    <Script
      src={src}
      data-website-id={id}
      data-exclude-search="true"
      data-domains={process.env.NEXT_PUBLIC_UMAMI_DOMAINS || undefined}
      data-before-send="soladevisUmamiFilter"
      strategy="afterInteractive"
    />
  );
}

/** Ignore les pages privées avant l'envoi (fonction appelée par le script Umami). */
export function AnalyticsFilter() {
  if (!process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID) return null;
  return (
    <Script id="umami-filter" strategy="beforeInteractive">
      {`window.soladevisUmamiFilter=function(t,p){var u=(p&&p.url)||location.pathname;return /^\\/(app|admin|onboarding)(\\/|$)/.test(u)?false:p;};`}
    </Script>
  );
}
