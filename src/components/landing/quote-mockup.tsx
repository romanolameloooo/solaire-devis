/**
 * Aperçu illustratif d'un devis PDF (données d'exemple, clairement indiquées comme telles).
 * Même mise en page que le PDF généré par lib/pdf/quote-pdf.ts.
 */
const lines = [
  ["Panneau monocristallin 550 Wc", "6", "95 000", "570 000"],
  ["Onduleur hybride 5 kW", "1", "650 000", "650 000"],
  ["Batterie lithium 48 V 5 kWh", "2", "780 000", "1 560 000"],
  ["Structure de fixation", "6", "18 000", "108 000"],
  ["Installation et mise en service", "3,3 kWc", "60 000", "198 000"],
];

export function QuoteMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[440px]">
      <div className="absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(60%_60%_at_70%_20%,rgba(242,165,22,0.22),transparent_70%),radial-gradient(60%_60%_at_20%_90%,rgba(14,122,74,0.16),transparent_70%)]" />
      <div className="rotate-[0.6deg] rounded-xl border border-border bg-white p-5 text-[9.5px] leading-snug text-foreground shadow-lift sm:p-6 sm:text-[10.5px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <span className="grid size-6 place-items-center rounded-md bg-sun text-[10px] font-bold text-white">SE</span>
              <span className="text-[11px] font-semibold sm:text-[12px]">Votre entreprise</span>
            </div>
            <p className="text-muted-foreground">Dakar · +221 77 000 00 00</p>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-bold tracking-tight text-primary sm:text-[20px]">DEVIS</p>
            <p className="font-semibold">DV-2026-0042</p>
            <p className="text-muted-foreground">Valable 30 jours</p>
          </div>
        </div>
        <div className="mt-3 ml-auto w-1/2 rounded-md bg-[#f5f6f2] p-2">
          <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Client</p>
          <p className="font-semibold">M. Diop</p>
          <p className="text-muted-foreground">Thiès</p>
        </div>
        <p className="mt-3 font-semibold">Objet : installation solaire de 3,3 kWc · Hybride</p>
        <div className="mt-2 overflow-hidden rounded-[4px]">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 bg-primary px-2 py-1.5 font-semibold text-white">
            <span>Désignation</span><span className="text-right">Qté</span><span className="w-[58px] text-right">Total</span>
          </div>
          {lines.map(([l, q, , t]) => (
            <div key={l} className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-border px-2 py-1.5">
              <span className="truncate">{l}</span><span className="text-right tabular">{q}</span><span className="w-[58px] text-right font-semibold tabular">{t}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 ml-auto w-[62%] space-y-0.5">
          <div className="flex justify-between text-muted-foreground"><span>Total HT</span><span className="tabular text-foreground">3 086 000 FCFA</span></div>
          <div className="flex justify-between text-muted-foreground"><span>TVA 18 %</span><span className="tabular text-foreground">555 480 FCFA</span></div>
          <div className="mt-1 flex justify-between rounded-[4px] bg-primary px-2 py-1 font-bold text-white"><span>Total TTC</span><span className="tabular">3 641 480 FCFA</span></div>
        </div>
        <div className="mt-3 rounded-md border-l-2 border-sun bg-sun-soft p-2">
          <p className="font-semibold">Votre installation</p>
          <p>• 6 × 550 Wc · onduleur 5 kW · 10 kWh de stockage</p>
          <p>• Production estimée : 400 kWh par mois</p>
        </div>
      </div>
      <p className="mt-3 text-center text-[12px] text-muted-foreground">Exemple de devis généré · données fictives</p>
    </div>
  );
}
