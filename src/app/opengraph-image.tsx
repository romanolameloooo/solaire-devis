import { ImageResponse } from "next/og";

export const alt = "SolaDevis : vos devis solaires en 2 minutes, pas en 2 heures";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Image affichée quand le lien est partagé sur WhatsApp, Facebook, LinkedIn… */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f7f8f5", fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ position: "absolute", right: -160, top: -160, width: 520, height: 520, borderRadius: 520, background: "rgba(242,165,22,0.22)" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: 720 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#0e7a4a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 22, height: 22, borderRadius: 22, background: "#f2a516" }} />
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, color: "#17221c" }}>SolaDevis</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.05, color: "#17221c", letterSpacing: -2 }}>Vos devis solaires en 2 minutes,</div>
            <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.05, color: "#0e7a4a", letterSpacing: -2 }}>pas en 2 heures</div>
            <div style={{ marginTop: 24, fontSize: 28, color: "#5f6c64" }}>Dimensionnement + devis PDF à votre nom, en FCFA</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#0e7a4a", fontWeight: 700 }}>Essai gratuit 15 jours</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", paddingRight: 64 }}>
          <div style={{ width: 360, height: 470, background: "#fff", borderRadius: 18, boxShadow: "0 24px 60px rgba(23,34,28,0.16)", display: "flex", flexDirection: "column", padding: 28, transform: "rotate(2deg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ width: 90, height: 14, borderRadius: 7, background: "#e3e7e0" }} />
              <div style={{ fontSize: 30, fontWeight: 800, color: "#0e7a4a" }}>DEVIS</div>
            </div>
            <div style={{ marginTop: 22, height: 34, borderRadius: 6, background: "#0e7a4a" }} />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                <div style={{ width: 170 - i * 12, height: 12, borderRadius: 6, background: "#e3e7e0" }} />
                <div style={{ width: 70, height: 12, borderRadius: 6, background: "#cfd6cc" }} />
              </div>
            ))}
            <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0e7a4a", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 20, fontWeight: 700 }}>
              <span>Total TTC</span>
              <span>FCFA</span>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
