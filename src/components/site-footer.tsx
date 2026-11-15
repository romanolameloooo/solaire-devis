import Link from "next/link";
import { Brand } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Brand />
        <nav aria-label="Liens légaux" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/confidentialite" className="hover:text-foreground">Confidentialité</Link>
          <Link href="/cgu" className="hover:text-foreground">Conditions d&apos;utilisation</Link>
          <Link href="/login" className="hover:text-foreground">Connexion</Link>
        </nav>
        <p>© {new Date().getFullYear()} SolaDevis</p>
      </div>
    </footer>
  );
}
