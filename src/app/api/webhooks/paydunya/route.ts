import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/billing/provider";
import { activateSubscription } from "@/lib/billing/activate";

/**
 * Webhook PayDunya (pas encore branché).
 * Quand le fournisseur PayDunya sera ajouté dans lib/billing/provider.ts, cette route
 * activera automatiquement l'abonnement après un paiement confirmé.
 */
export async function POST(req: Request) {
  const provider = getPaymentProvider();
  if (provider.id !== "paydunya" || !provider.parseWebhook) {
    return NextResponse.json({ error: "Paiement en ligne non activé" }, { status: 501 });
  }
  const event = await provider.parseWebhook(req);
  if (!event) return NextResponse.json({ ok: true, ignored: true });
  await activateSubscription(event.userId, event.until, provider.id, event.reference);
  return NextResponse.json({ ok: true });
}
