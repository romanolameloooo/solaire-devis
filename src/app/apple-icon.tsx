import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Icône de l'écran d'accueil sur iPhone (ajout du site sur l'écran d'accueil). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0e7a4a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 64, background: "#f2a516", boxShadow: "0 0 0 18px rgba(242,165,22,0.25)" }} />
      </div>
    ),
    size,
  );
}
