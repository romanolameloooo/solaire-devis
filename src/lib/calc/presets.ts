import type { Appliance } from "./engine";

/** Appareils courants : valeurs indicatives, modifiables. [nom, watts, quantité, heures/jour, dont heures de nuit] */
export const APPLIANCE_PRESETS: [string, number, number, number, number][] = [
  ["Ampoule LED", 10, 6, 5, 4],
  ["Ventilateur", 60, 2, 10, 6],
  ["Télévision", 100, 1, 5, 3],
  ["Réfrigérateur", 150, 1, 10, 5],
  ["Congélateur", 200, 1, 12, 6],
  ["Climatiseur 1 CV", 900, 1, 6, 3],
  ["Ordinateur portable", 60, 1, 6, 2],
  ["Box internet / wifi", 15, 1, 24, 12],
  ["Pompe à eau", 750, 1, 1, 0],
  ["Fer à repasser", 1000, 1, 0.5, 0],
  ["Machine à laver", 500, 1, 1, 0],
];

export function presetToAppliance(i: number): Appliance {
  const [name, w, q, h, hn] = APPLIANCE_PRESETS[i];
  return { name, w, q, h, hn };
}
