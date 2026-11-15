import { BatteryCharging, ChevronDown, Gauge, PlugZap, SunMedium, Zap } from "lucide-react";
import type { Mode, SizingResult, TechSettings } from "@/lib/calc/engine";
import { formatDecimal, formatNumber } from "@/lib/format";

type R = Pick<SizingResult, "E" | "En" | "peak" | "cov" | "pvNeedW" | "nPanels" | "kwc" | "battNeedWh" | "nBatt" | "invReqW" | "inverter" | "nInv" | "prodMois">;

export function SizingKpis({ r, mode, panelWc, batteryKwh }: { r: R; mode: Mode; panelWc: number; batteryKwh: number | null }) {
  const items = [
    { icon: Gauge, value: `${formatDecimal(r.E / 1000, 1)} kWh`, label: "consommation par jour" },
    { icon: SunMedium, value: `${r.nPanels} × ${formatNumber(panelWc)} Wc`, label: `${formatDecimal(r.kwc, 2)} kWc de panneaux` },
    { icon: PlugZap, value: r.inverter ? `${r.nInv > 1 ? `${r.nInv} × ` : ""}${formatDecimal(r.inverter.power ?? 0, 1)} kW` : "—", label: `onduleur (besoin ${formatDecimal(r.invReqW / 1000, 1)} kW)` },
    ...(mode !== "reseau"
      ? [{ icon: BatteryCharging, value: r.nBatt && batteryKwh ? `${r.nBatt} × ${formatDecimal(batteryKwh, 1)} kWh` : "Aucune", label: `batteries (besoin ${formatDecimal(r.battNeedWh / 1000, 1)} kWh)` }]
      : []),
    { icon: Zap, value: `${formatNumber(r.prodMois)} kWh`, label: "production estimée par mois" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
      {items.map((k, i) => (
        <div key={i} className={`rounded-xl bg-sun-soft p-3.5 ${i === 0 && items.length === 5 ? "col-span-2 lg:col-span-1" : ""} ${items.length === 4 && i === 3 ? "col-span-2 lg:col-span-1" : ""}`}>
          <k.icon className="size-4 text-[#b07400]" />
          <p className="mt-2 text-[17px] font-bold leading-tight tracking-tight tabular">{k.value}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{k.label}</p>
        </div>
      ))}
    </div>
  );
}

export function SizingExplain({ r, mode, tech, panelWc, batteryKwh }: { r: R; mode: Mode; tech: TechSettings; panelWc: number; batteryKwh: number | null }) {
  const f = (n: number, d = 2) => formatDecimal(n, d);
  return (
    <details className="group rounded-xl border border-border bg-card [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[14px] font-medium">
        Comment c&apos;est calculé
        <ChevronDown className="size-4 text-muted-foreground transition-[rotate] duration-200 ease-out group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-border px-4 py-4 text-[13.5px] leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">Consommation.</strong> {f(r.E / 1000)} kWh par jour, dont {f(r.En / 1000)} kWh la nuit.
          Puissance max utilisée en même temps : {f(r.peak / 1000)} kW.
        </p>
        <p>
          <strong className="text-foreground">Panneaux.</strong> Conso par jour × part couverte ÷ (heures de plein soleil × rendement)
          = {f(r.E / 1000)} kWh × {formatNumber(r.cov * 100)} % ÷ ({f(tech.psh, 1)} h × {formatNumber(tech.pr)} %)
          = {f(r.pvNeedW / 1000)} kWc. Avec des panneaux de {formatNumber(panelWc)} Wc : {f(r.pvNeedW / panelWc)} arrondi à <strong className="text-foreground">{r.nPanels}</strong>, soit {f(r.kwc)} kWc.
        </p>
        {mode !== "reseau" && (
          <p>
            <strong className="text-foreground">Batteries.</strong> (Conso de nuit + jours de réserve × conso par jour) ÷ (décharge {formatNumber(tech.dod)} % × rendement {formatNumber(tech.eff)} %)
            = {f(r.battNeedWh / 1000)} kWh.
            {batteryKwh ? <> Avec des batteries de {f(batteryKwh, 1)} kWh : <strong className="text-foreground">{r.nBatt}</strong>.</> : null}
          </p>
        )}
        <p>
          <strong className="text-foreground">Onduleur.</strong>{" "}
          {mode === "reseau"
            ? <>Puissance des panneaux ÷ 1,2 = {f(r.kwc)} ÷ 1,2 = {f(r.invReqW / 1000)} kW.</>
            : <>Le plus grand entre la puissance max + {formatNumber(tech.marge)} % de marge ({f((r.peak * (1 + tech.marge / 100)) / 1000)} kW) et la puissance des panneaux ÷ 1,3 ({f(r.kwc / 1.3)} kW) = {f(r.invReqW / 1000)} kW.</>}
          {" "}On prend le plus petit onduleur du catalogue qui couvre ce besoin.
        </p>
        <p>
          <strong className="text-foreground">Production.</strong> {f(r.kwc)} kWc × {f(tech.psh, 1)} h × {formatNumber(tech.pr)} % × 30 jours = {formatNumber(r.prodMois)} kWh par mois.
        </p>
        <p className="text-[12.5px]">
          5,4 heures de plein soleil par défaut : production de la saison la plus faible à Dakar (données NASA POWER). Le Sénégal reçoit en moyenne environ 5,8 kWh/m² par jour. Ces valeurs se modifient dans Paramètres.
        </p>
      </div>
    </details>
  );
}
