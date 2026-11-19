"use client";
import { useState } from "react";
import { Check, Crosshair, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/primitives";
import { NumInput } from "@/components/ui/num-input";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ROOF_LABEL, type RoofType, type Visit } from "@/lib/types";

const ORIENTATIONS = ["Sud", "Sud-Est", "Sud-Ouest", "Est", "Ouest", "Plat (sans pente)"];

/** Gros boutons de choix, faciles à toucher d'une main en plein soleil. */
function Pills<T extends string>({ value, options, onChange, label }: { value: T | "" | undefined; options: { v: T; t: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.v)}
            className={cn("inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border-2 px-4 text-[14.5px] font-semibold transition-[background-color,border-color,color,scale] duration-[160ms] ease-out active:scale-[0.97]",
              on ? "border-primary bg-primary text-white" : "border-[#c9d0c5] bg-card text-foreground")}>
            {on && <Check className="size-4" />}{o.t}
          </button>
        );
      })}
    </div>
  );
}

export function VisitEditor({ visit, onChange }: { visit: Visit; onChange: (v: Visit) => void }) {
  const [locating, setLocating] = useState(false);
  const set = <K extends keyof Visit>(k: K, v: Visit[K]) => onChange({ ...visit, [k]: v });

  function locate() {
    if (!("geolocation" in navigator)) return toast.error("La position n'est pas disponible sur cet appareil.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ ...visit, lat: Math.round(pos.coords.latitude * 1e6) / 1e6, lng: Math.round(pos.coords.longitude * 1e6) / 1e6, accuracy: Math.round(pos.coords.accuracy) });
        toast.success("Position enregistrée");
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === err.PERMISSION_DENIED ? "Accès à la position refusé. Autorisez-le dans le navigateur, ou saisissez l'adresse." : "Position introuvable. Réessayez à l'extérieur, ou saisissez l'adresse.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  }

  return (
    <div className="space-y-5">
      <Field label="Adresse du chantier" htmlFor="v-addr" optional>
        <Input id="v-addr" value={visit.address ?? ""} placeholder="Quartier, rue, repère" onChange={(e) => set("address", e.target.value)} />
      </Field>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="button" variant="outline" size="lg" onClick={locate} loading={locating} className="w-full sm:w-auto"><Crosshair />Utiliser ma position</Button>
        {visit.lat != null && visit.lng != null && (
          <a href={`https://www.google.com/maps?q=${visit.lat},${visit.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-primary underline-offset-4 hover:underline">
            <MapPin className="size-4" />{formatDecimal(visit.lat, 5)}, {formatDecimal(visit.lng, 5)}{visit.accuracy ? ` (± ${visit.accuracy} m)` : ""}
          </a>
        )}
      </div>

      <Field label="Type de toiture">
        <Pills label="Type de toiture" value={visit.roof} onChange={(v) => set("roof", v)} options={(Object.keys(ROOF_LABEL) as RoofType[]).map((v) => ({ v, t: ROOF_LABEL[v] }))} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Surface disponible (environ)" hint="Pour 1 kWc, comptez environ 6 m²." optional>
          <NumInput value={visit.surfaceM2 ?? null} onChange={(v) => set("surfaceM2", v)} suffix="m²" />
        </Field>
        <Field label="Distance panneaux → onduleur (environ)" optional>
          <NumInput value={visit.distanceM ?? null} onChange={(v) => set("distanceM", v)} suffix="m" />
        </Field>
      </div>

      <Field label="Orientation">
        <Pills label="Orientation" value={visit.orientation as string | undefined} onChange={(v) => set("orientation", v)} options={ORIENTATIONS.map((o) => ({ v: o, t: o }))} />
      </Field>

      <Field label="Ombrages (arbres, bâtiments, château d'eau…)">
        <Pills label="Ombrages" value={visit.shading == null ? "" : visit.shading ? "oui" : "non"} onChange={(v) => set("shading", v === "oui")} options={[{ v: "non", t: "Non" }, { v: "oui", t: "Oui" }]} />
      </Field>
      {visit.shading && (
        <Field label="Précisez les ombrages" htmlFor="v-shade">
          <Input id="v-shade" value={visit.shadingNote ?? ""} placeholder="Ex : manguier à l'ouest, ombre l'après-midi" onChange={(e) => set("shadingNote", e.target.value)} />
        </Field>
      )}

      <Field label="Notes" htmlFor="v-notes" optional>
        <Textarea id="v-notes" rows={3} value={visit.notes ?? ""} placeholder="Accès au toit, état du tableau électrique, souhaits du client…" onChange={(e) => set("notes", e.target.value)} />
      </Field>
    </div>
  );
}
