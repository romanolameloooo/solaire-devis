/**
 * Point d'extension pour le paiement en ligne.
 *
 * Aujourd'hui : fournisseur « manuel » (lien de paiement externe + activation à la main dans /admin).
 * Demain : ajouter un fournisseur PayDunya (Wave, Orange Money) qui implémente la même interface,
 * puis le sélectionner dans getPaymentProvider(). Le webhook /api/webhooks/paydunya appelle
 * provider.parseWebhook() puis activateSubscription() (voir activate.ts) : rien d'autre à changer.
 */
import { PAYMENT_LINK } from "@/lib/env";

export interface CheckoutContext {
  userId: string;
  email: string | null;
  companyName: string;
}

export interface WebhookEvent {
  userId: string;
  /** Fin de la période payée */
  until: Date;
  reference: string;
}

export interface PaymentProvider {
  id: "manual" | "paydunya";
  /** URL vers laquelle envoyer l'installateur pour payer (null si indisponible) */
  getCheckoutUrl(ctx: CheckoutContext): Promise<string | null>;
  /** Vérifie et décode un appel webhook. null = événement ignoré. */
  parseWebhook?(req: Request): Promise<WebhookEvent | null>;
}

const manualProvider: PaymentProvider = {
  id: "manual",
  async getCheckoutUrl() {
    return PAYMENT_LINK || null;
  },
};

export function getPaymentProvider(): PaymentProvider {
  // if (process.env.PAYDUNYA_MASTER_KEY) return paydunyaProvider;
  return manualProvider;
}
