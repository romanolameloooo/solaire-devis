import type { Appliance, Mode, QuoteLine, SizingResult, TechSettings } from "@/lib/calc/engine";

export type Plan = "trial" | "active" | "expired";
export type QuoteStatus = "draft" | "sent" | "accepted" | "refused";
export type CatalogType = "panel" | "inverter" | "battery";

export interface Profile {
  id: string;
  email: string | null;
  company_name: string;
  phone: string;
  company_email: string;
  address: string;
  ninea: string;
  logo_path: string | null;
  tva: number;
  validite_jours: number;
  conditions: string;
  structure_par_panneau: number | null;
  cables_par_kwc: number | null;
  pose_par_kwc: number | null;
  transport: number | null;
  tech: TechSettings;
  plan: Plan;
  trial_ends_at: string;
  subscription_ends_at: string | null;
  payment_provider: string | null;
  payment_reference: string | null;
  onboarded: boolean;
  created_at: string;
}

export interface CatalogItem {
  id: string;
  user_id: string;
  type: CatalogType;
  model: string;
  power: number | null;
  price: number | null;
  position: number;
}

export interface QuoteInputs {
  consumptionKind: "appareils" | "facture";
  appliances: Appliance[];
  kwhMois: number | null;
  nuitPct: number | null;
  pointeKw: number | null;
  couverture: number | null;
  joursRes: number | null;
  panelId: string | null;
  batteryId: string | null;
  tarifKwh: number | null;
  /** Copie des réglages techniques utilisés (pour « Comment c'est calculé ») */
  tech: TechSettings;
}

export type Role = "owner" | "technician";

export interface TeamMember {
  company_id: string;
  user_id: string;
  role: Role;
  email: string;
  created_at: string;
}

export type RoofType = "dalle" | "tole" | "tuile" | "sol";

/** Visite technique sur place */
export interface Visit {
  address?: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  roof?: RoofType | "";
  surfaceM2?: number | null;
  orientation?: string;
  shading?: boolean | null;
  shadingNote?: string;
  distanceM?: number | null;
  notes?: string;
}

export const ROOF_LABEL: Record<RoofType, string> = { dalle: "Dalle béton", tole: "Tôle", tuile: "Tuile", sol: "Au sol" };

export interface QuotePhoto {
  id: string;
  quote_id: string;
  company_id: string;
  path: string;
  caption: string;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  quote_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface QuoteRow {
  id: string;
  user_id: string;
  number: string;
  client_name: string;
  client_phone: string;
  client_city: string;
  mode: Mode;
  inputs: QuoteInputs;
  result: SizingResult & { panelPower?: number; batteryPower?: number | null; ecoMois?: number | null; roiAnnees?: number | null };
  lines: QuoteLine[];
  remise_pct: number;
  tva_pct: number;
  total_ht: number;
  total_ttc: number;
  kwc: number;
  valid_until: string | null;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  visit?: Visit | null;
  signed_at?: string | null;
  signer_name?: string | null;
  signature_image?: string | null;
  signature_hash?: string | null;
  signature_method?: "onsite" | "remote" | null;
  sign_token_expires_at?: string | null;
}

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  refused: "Refusé",
};

export const MODE_LABEL: Record<Mode, string> = {
  autonome: "Autonome (sans réseau)",
  hybride: "Hybride (réseau + batteries)",
  reseau: "Sans batterie (autoconsommation)",
};
