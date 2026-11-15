import { describe, expect, it } from "vitest";
import { formatDecimal, formatFCFA, formatNumber, pdfMoney, slugify, waNumber, whatsappLink } from "./format";
import { pdfText } from "./pdf/quote-pdf";

describe("formats", () => {
  it("montants FCFA avec espaces insécables", () => {
    expect(formatFCFA(1250000)).toBe("1 250 000 FCFA");
    expect(formatFCFA(999.6)).toBe("1 000 FCFA");
    expect(pdfMoney(1250000)).toBe("1 250 000 FCFA");
  });
  it("décimales à la française", () => {
    expect(formatNumber(2.75, 2)).toBe("2,75");
    expect(formatDecimal(2.5, 2)).toBe("2,5");
    expect(formatDecimal(3, 2)).toBe("3");
    expect(formatDecimal(1234.5, 1, " ")).toBe("1 234,5");
  });
  it("numéros WhatsApp", () => {
    expect(waNumber("77 123 45 67")).toBe("221771234567");
    expect(waNumber("+221 77 123 45 67")).toBe("221771234567");
    expect(waNumber("00225 07 00 00 00 00")).toBe("2250700000000");
    expect(whatsappLink("771234567", "Bonjour à vous")).toBe("https://wa.me/221771234567?text=Bonjour%20%C3%A0%20vous");
  });
  it("noms de fichier", () => {
    expect(slugify("M. Diop & Fils — Thiès")).toBe("M-Diop-Fils-Thies");
  });
  it("texte PDF : accents gardés, caractères hors police remplacés", () => {
    expect(pdfText("Économie : 1 250 FCFA − remise ≈ «ok» ☀️")).toBe("Économie : 1 250 FCFA - remise env. «ok» ");
  });
});

import { getAccess } from "./billing/access";

describe("accès abonnement", () => {
  const now = new Date("2026-11-15T12:00:00Z");
  it("essai en cours / terminé", () => {
    expect(getAccess({ plan: "trial", trial_ends_at: "2026-11-20T00:00:00Z", subscription_ends_at: null }, now)).toMatchObject({ status: "trial", canCreate: true, daysLeft: 5 });
    expect(getAccess({ plan: "trial", trial_ends_at: "2026-11-14T00:00:00Z", subscription_ends_at: null }, now)).toMatchObject({ status: "expired", canCreate: false });
  });
  it("abonnement actif / échu / désactivé", () => {
    expect(getAccess({ plan: "active", trial_ends_at: "2026-11-01T00:00:00Z", subscription_ends_at: "2026-12-15T23:59:59Z" }, now)).toMatchObject({ status: "active", canCreate: true });
    expect(getAccess({ plan: "active", trial_ends_at: "2026-11-01T00:00:00Z", subscription_ends_at: "2026-11-10T23:59:59Z" }, now)).toMatchObject({ status: "expired", canCreate: false });
    expect(getAccess({ plan: "expired", trial_ends_at: "2026-11-01T00:00:00Z", subscription_ends_at: "2027-02-15T23:59:59Z" }, now)).toMatchObject({ status: "expired", canCreate: false, endsAt: null });
  });
});
