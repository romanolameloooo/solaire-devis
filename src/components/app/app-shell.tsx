"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CreditCard, FileText, LogOut, Package, Plus, Settings, Shield } from "lucide-react";
import { SyncIndicator } from "@/components/app/sync-indicator";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Access } from "@/lib/billing/access";

const NAV = [
  { href: "/app", label: "Devis", icon: FileText, exact: true },
  { href: "/app/catalogue", label: "Catalogue", icon: Package },
  { href: "/app/parametres", label: "Paramètres", icon: Settings },
];

function isActive(path: string, href: string, exact?: boolean) {
  if (exact) return path === href || (path.startsWith("/app/devis/") && !path.startsWith("/app/devis/nouveau"));
  return path === href || path.startsWith(href + "/");
}

export function AppShell({ company, email, logoUrl, access, isAdmin, isOwner, unread, children }: {
  company: string; email: string; logoUrl: string | null; access: Access; isAdmin: boolean; isOwner: boolean; unread: number; children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const banner =
    access.status === "expired" ? (
      <div className="border-b border-destructive/20 bg-destructive-soft px-4 py-2.5 text-[13.5px] text-[#9a3412]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <span>{access.endsAt ? "Votre période d'essai ou votre abonnement est terminé." : "Votre compte est inactif."} Vos devis restent consultables.</span>
          {isOwner ? <Link href="/app/abonnement" className="font-semibold underline underline-offset-4">Activer mon abonnement</Link> : <span className="font-semibold">Contactez le responsable de l&apos;entreprise.</span>}
        </div>
      </div>
    ) : access.status === "trial" && isOwner ? (
      <div className="border-b border-sun/30 bg-sun-soft px-4 py-2 text-[13px] text-[#7a5000]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
          <span>Essai gratuit : {access.daysLeft} jour{access.daysLeft === 1 ? "" : "s"} restant{access.daysLeft === 1 ? "" : "s"}</span>
          <Link href="/app/abonnement" className="font-semibold underline-offset-4 hover:underline">S&apos;abonner</Link>
        </div>
      </div>
    ) : null;

  return (
    <div className="min-h-dvh [--bottom-nav:calc(64px+env(safe-area-inset-bottom))] md:[--bottom-nav:0px] md:pl-64">
      {/* Barre latérale (ordinateur) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center px-5"><Brand href="/app" /></div>
        <div className="px-3">
          <Button asChild className="w-full justify-start"><Link href="/app/devis/nouveau"><Plus />Nouveau devis</Link></Button>
        </div>
        <nav className="mt-4 flex flex-col gap-0.5 px-3">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={cn("flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors",
                isActive(path, n.href, n.exact) ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <n.icon className="size-[18px]" />{n.label}
            </Link>
          ))}
          {isOwner && (
            <Link href="/app/notifications"
              className={cn("flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors",
                isActive(path, "/app/notifications") ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <Bell className="size-[18px]" />Notifications
              {unread > 0 && <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-sun px-1.5 text-[11.5px] font-bold text-[#17221c]">{unread}</span>}
            </Link>
          )}
          {isOwner && (
            <Link href="/app/abonnement"
              className={cn("flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors",
                isActive(path, "/app/abonnement") ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <CreditCard className="size-[18px]" />Abonnement
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Shield className="size-[18px]" />Administration
            </Link>
          )}
        </nav>
        <div className="mt-auto px-3 pb-2"><SyncIndicator className="w-full justify-center" /></div>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted text-[13px] font-semibold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoUrl ? <img src={logoUrl} alt="" className="size-full object-contain p-0.5" /> : company.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium">{company}</p>
              <p className="truncate text-[12px] text-muted-foreground">{isOwner ? email : `Technicien · ${email}`}</p>
            </div>
            <button onClick={logout} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Se déconnecter" title="Se déconnecter">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Barre du haut (mobile) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur md:hidden">
        <Brand href="/app" />
        <div className="flex items-center gap-1">
          <SyncIndicator />
          {isOwner && (
            <Link href="/app/notifications" className="relative rounded-md p-2 text-muted-foreground" aria-label={unread ? `${unread} notification(s) non lue(s)` : "Notifications"}>
              <Bell className="size-[20px]" />
              {unread > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-sun px-1 text-[10px] font-bold text-[#17221c]">{unread}</span>}
            </Link>
          )}
          <button onClick={logout} className="rounded-md p-2 text-muted-foreground" aria-label="Se déconnecter"><LogOut className="size-[18px]" /></button>
        </div>
      </header>

      {banner}
      <main className="mx-auto max-w-5xl px-4 pb-[calc(var(--bottom-nav)+32px)] pt-6 md:px-8 md:pb-16 md:pt-8">{children}</main>

      {/* Navigation du bas (mobile) */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
        <div className="grid h-16 grid-cols-5 items-center">
          {NAV.slice(0, 2).map((n) => <MobileTab key={n.href} {...n} active={isActive(path, n.href, n.exact)} />)}
          <div className="flex justify-center">
            <Link href="/app/devis/nouveau" aria-label="Nouveau devis" className="grid size-12 place-items-center rounded-2xl bg-primary text-white shadow-lift transition-[scale] duration-[160ms] ease-out active:scale-[0.94]">
              <Plus className="size-6" />
            </Link>
          </div>
          <MobileTab href="/app/parametres" label="Réglages" icon={Settings} active={isActive(path, "/app/parametres")} />
          {isOwner
            ? <MobileTab href="/app/abonnement" label="Abonnement" icon={CreditCard} active={isActive(path, "/app/abonnement")} />
            : <MobileTab href="/app" label="Mes devis" icon={FileText} active={false} />}
        </div>
      </nav>
    </div>
  );
}

function MobileTab({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center gap-1 text-[11px] font-medium transition-[color,scale] duration-[160ms] ease-out active:scale-[0.94]", active ? "text-primary" : "text-muted-foreground")}>
      <Icon className="size-[22px]" />{label}
    </Link>
  );
}
