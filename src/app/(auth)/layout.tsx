import { Check } from "lucide-react";
import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_560px]">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <Brand />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-foreground p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-sun/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-primary/40 blur-3xl" />
        <div className="relative">
          <p className="text-[26px] font-semibold leading-tight tracking-tight">Le devis part pendant que le client est encore intéressé.</p>
          <ul className="mt-8 space-y-3 text-[15px] text-white/80">
            {["Dimensionnement automatique", "PDF à votre nom, avec votre logo", "Envoi direct par WhatsApp"].map((t) => (
              <li key={t} className="flex items-center gap-2.5"><Check className="size-4 text-sun" />{t}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
