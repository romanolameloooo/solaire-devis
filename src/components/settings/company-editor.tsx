"use client";
import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { logoPublicUrl } from "@/lib/env";
import { isEmail } from "@/lib/auth-errors";
import type { Profile } from "@/lib/types";

type CompanyFields = Pick<Profile, "company_name" | "address" | "phone" | "company_email" | "ninea" | "logo_path">;

/** Redimensionne l'image en PNG (max 600 px) : poids léger et compatible PDF. */
async function toPng(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("conversion"))), "image/png"));
}

export function CompanyEditor({ profile, submitLabel = "Enregistrer", onSaved, footerExtra }: {
  profile: Profile;
  submitLabel?: string;
  onSaved?: (p: Partial<Profile>) => void;
  footerExtra?: React.ReactNode;
}) {
  const [f, setF] = useState<CompanyFields>({
    company_name: profile.company_name, address: profile.address, phone: profile.phone,
    company_email: profile.company_email, ninea: profile.ninea, logo_path: profile.logo_path,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoV, setLogoV] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof CompanyFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF({ ...f, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: "" });
  };

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Choisissez une image (PNG ou JPG).");
    if (file.size > 8 * 1024 * 1024) return toast.error("Image trop lourde (8 Mo maximum).");
    setUploading(true);
    try {
      const png = await toPng(file);
      const supabase = createClient();
      const path = `${profile.id}/logo.png`;
      const { error } = await supabase.storage.from("logos").upload(path, png, { upsert: true, contentType: "image/png", cacheControl: "60" });
      if (error) throw error;
      const { error: e2 } = await supabase.from("profiles").update({ logo_path: path }).eq("id", profile.id);
      if (e2) throw e2;
      setF((x) => ({ ...x, logo_path: path }));
      setLogoV(Date.now());
      toast.success("Logo ajouté");
    } catch {
      toast.error("Le logo n'a pas pu être envoyé. Réessayez.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeLogo() {
    const supabase = createClient();
    if (f.logo_path) await supabase.storage.from("logos").remove([f.logo_path]);
    await supabase.from("profiles").update({ logo_path: null }).eq("id", profile.id);
    setF({ ...f, logo_path: null });
    toast.success("Logo retiré");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.company_name.trim()) er.company_name = "Le nom apparaît en haut du devis : il est obligatoire.";
    if (f.phone.replace(/\D/g, "").length < 8) er.phone = "Numéro incomplet.";
    if (f.company_email && !isEmail(f.company_email)) er.company_email = "Adresse email invalide.";
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    const patch = {
      company_name: f.company_name.trim(), address: f.address.trim(), phone: f.phone.trim(),
      company_email: f.company_email.trim(), ninea: f.ninea.trim(),
    };
    const { error } = await createClient().from("profiles").update(patch).eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error("Enregistrement impossible. Vérifiez votre connexion.");
    if (!onSaved) toast.success("Informations enregistrées");
    onSaved?.(patch);
  }

  const logoUrl = logoPublicUrl(f.logo_path, logoV || undefined);

  return (
    <form onSubmit={save} noValidate>
      <div className="flex items-center gap-4">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-input bg-muted/60">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo de l'entreprise" className="size-full object-contain p-1.5" />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-medium">Logo</p>
          <p className="text-[12.5px] text-muted-foreground">PNG ou JPG. Il apparaît en haut de vos devis.</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
              {f.logo_path ? "Changer" : "Ajouter un logo"}
            </Button>
            {f.logo_path && (
              <Button type="button" variant="ghost" size="sm" onClick={removeLogo} aria-label="Retirer le logo"><Trash2 /></Button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Nom de l'entreprise" htmlFor="c-name" error={errors.company_name} className="sm:col-span-2">
          <Input id="c-name" value={f.company_name} onChange={set("company_name")} invalid={!!errors.company_name} placeholder="Ex : Soleil Énergie SARL" />
        </Field>
        <Field label="Téléphone" htmlFor="c-phone" error={errors.phone}>
          <Input id="c-phone" type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} invalid={!!errors.phone} placeholder="+221 77 000 00 00" />
        </Field>
        <Field label="Email affiché sur le devis" htmlFor="c-email" error={errors.company_email} optional>
          <Input id="c-email" type="email" inputMode="email" value={f.company_email} onChange={set("company_email")} invalid={!!errors.company_email} placeholder="contact@entreprise.sn" />
        </Field>
        <Field label="Adresse" htmlFor="c-address" optional>
          <Input id="c-address" value={f.address} onChange={set("address")} placeholder="Quartier, ville" />
        </Field>
        <Field label="NINEA / RC" htmlFor="c-ninea" optional>
          <Input id="c-ninea" value={f.ninea} onChange={set("ninea")} placeholder="Ex : 0012345 2G3" />
        </Field>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {footerExtra}
        <Button type="submit" loading={saving} className="w-full sm:w-auto">{submitLabel}</Button>
      </div>
    </form>
  );
}
