import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SolaDevis",
    short_name: "SolaDevis",
    description: "Dimensionnement et devis solaires en 2 minutes",
    start_url: "/app",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#0e7a4a",
    lang: "fr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
