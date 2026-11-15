import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Page introuvable", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Brand />
      <h1 className="mt-10 text-2xl font-bold tracking-tight">Page introuvable</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">Cette page n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild><Link href="/app">Mes devis</Link></Button>
        <Button asChild variant="outline"><Link href="/">Page d&apos;accueil</Link></Button>
      </div>
    </div>
  );
}
