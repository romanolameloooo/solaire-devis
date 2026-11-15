import Link from "next/link";
import { Brand } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { isPlaceholder } from "@/config/legal";
import { cn } from "@/lib/utils";

export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Brand />
          <Link href="/signup" className="text-[14px] font-medium text-primary hover:underline">Essai gratuit 15 jours</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <h1 className="text-[28px] font-bold tracking-tight md:text-[34px]">{title}</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">Dernière mise à jour : {updated}</p>
        <div className="legal mt-8 space-y-8 text-[15px] leading-relaxed text-[#2c3a32]">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[18px] font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/** Valeur légale : surlignée tant qu'elle n'est pas renseignée. */
export function V({ children }: { children: string }) {
  return <span className={cn(isPlaceholder(children) && "rounded bg-sun-soft px-1 font-medium text-[#8a5a00]")}>{children}</span>;
}
