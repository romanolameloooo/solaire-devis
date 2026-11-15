import Link from "next/link";
import { ArrowRight, Calculator, Check, Clock, FileText, ListChecks, Ruler, Send } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { QuoteMockup } from "@/components/landing/quote-mockup";
import { SiteFooter } from "@/components/site-footer";
import { PRICE_LABEL } from "@/lib/env";

const benefits = [
  {
    icon: Clock,
    title: "2 minutes au lieu de 2 heures",
    text: "Cochez les appareils du client ou saisissez sa facture Senelec. Le nombre de panneaux, l'onduleur et les batteries sont calculés tout de suite.",
  },
  {
    icon: FileText,
    title: "Un devis pro, à votre nom",
    text: "Votre logo, vos coordonnées, votre NINEA, un numéro de devis, la TVA et une case « Bon pour accord ». Prêt à envoyer par WhatsApp.",
  },
  {
    icon: Calculator,
    title: "Un calcul fiable et transparent",
    text: "Ensoleillement de la saison la plus faible, pertes du système, profondeur de décharge des batteries. Chaque chiffre est expliqué, et tout est réglable.",
  },
];

const steps = [
  { icon: ListChecks, title: "Enregistrez vos prix une fois", text: "Vos panneaux, onduleurs, batteries et forfaits de pose, avec vos propres prix." },
  { icon: Ruler, title: "Décrivez le besoin du client", text: "Liste d'appareils ou kWh de la facture. Autonome, hybride ou sans batterie." },
  { icon: Send, title: "Envoyez le devis PDF", text: "Ajustez si besoin, téléchargez le PDF et envoyez-le au client sur WhatsApp." },
];

const faq = [
  {
    q: "Dois-je payer pour essayer ?",
    a: "Non. L'essai dure 15 jours, sans carte bancaire ni Mobile Money. Vous créez autant de devis que vous voulez.",
  },
  {
    q: "Les prix du matériel sont-ils fournis ?",
    a: "Non, et c'est voulu : vos prix dépendent de vos fournisseurs et de votre marge. Vous les saisissez une fois, ils servent pour tous vos devis.",
  },
  {
    q: "Ça marche sur téléphone ?",
    a: "Oui. SolaDevis est pensé d'abord pour le téléphone : vous pouvez faire le devis chez le client et le lui envoyer avant de partir.",
  },
  {
    q: "Comment le calcul est-il fait ?",
    a: "Avec 5,4 heures de plein soleil par jour (saison la plus faible à Dakar), 75 % de rendement global et 90 % de profondeur de décharge en lithium. Toutes ces valeurs se modifient dans les paramètres.",
  },
  {
    q: "Comment payer l'abonnement ?",
    a: "À la fin de l'essai, un lien de paiement vous est proposé. Votre compte est activé dès réception. Vos devis restent consultables dans tous les cas.",
  },
];

export default function Home() {
  return (
    <div className="overflow-x-clip bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#tarif" className="hidden rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:block">Tarif</a>
            <a href="#faq" className="hidden rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:block">Questions</a>
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Connexion</Link>
            <Button asChild size="sm" className="hidden sm:inline-flex"><Link href="/signup">Essai gratuit 15 jours</Link></Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.05fr_1fr] md:pb-24 md:pt-20">
        <div>
          <p style={{ "--i": 0 } as React.CSSProperties} className="sd-rise mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[12.5px] font-medium text-muted-foreground shadow-soft">
            <span className="size-1.5 rounded-full bg-sun" /> Pour les installateurs solaires du Sénégal
          </p>
          <h1 style={{ "--i": 1 } as React.CSSProperties} className="sd-rise text-balance text-[34px] font-bold leading-[1.08] tracking-[-0.025em] sm:text-5xl md:text-[54px]">
            Vos devis solaires en <span className="text-primary">2 minutes</span>, pas en 2 heures
          </h1>
          <p style={{ "--i": 2 } as React.CSSProperties} className="sd-rise mt-5 max-w-xl text-pretty text-[16.5px] leading-relaxed text-muted-foreground sm:text-lg">
            SolaDevis calcule l&apos;installation de votre client (panneaux, onduleur, batteries) et produit un devis PDF à votre nom, avec vos prix, en FCFA.
          </p>
          <div style={{ "--i": 3 } as React.CSSProperties} className="sd-rise mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-[52px] text-base">
              <Link href="/signup">Essai gratuit 15 jours <ArrowRight /></Link>
            </Button>
            <a href="#comment" className="text-center text-[15px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:ml-2">Voir comment ça marche</a>
          </div>
          <ul style={{ "--i": 4 } as React.CSSProperties} className="sd-rise mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-muted-foreground">
            {["Sans engagement", "Sans carte bancaire", "Sur téléphone et ordinateur"].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-primary" />{t}</li>
            ))}
          </ul>
        </div>
        <div style={{ "--i": 3 } as React.CSSProperties} className="sd-rise"><QuoteMockup /></div>
      </section>

      {/* Bénéfices */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-px bg-border md:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="bg-card px-6 py-10 md:px-8 md:py-12">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><b.icon className="size-5" /></span>
              <h3 className="mt-5 text-[17px] font-semibold tracking-tight">{b.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-28">
        <div className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-primary">Comment ça marche</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Trois étapes, et le devis est parti</h2>
        </div>
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-sun-soft text-[#8a5a00]"><s.icon className="size-5" /></span>
                <span className="text-[40px] font-bold leading-none tracking-tight text-[#e7ebe4]">{i + 1}</span>
              </div>
              <h3 className="mt-5 text-[16.5px] font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Tarif */}
      <section id="tarif" className="scroll-mt-20 border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-primary">Tarif</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Un seul abonnement, tout compris</h2>
            <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-muted-foreground">
              Commencez par 15 jours d&apos;essai gratuit. Si SolaDevis vous fait gagner du temps, continuez. Sinon, vous n&apos;avez rien à faire.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-6 shadow-soft sm:p-8">
            <p className="text-sm font-medium text-muted-foreground">SolaDevis Pro</p>
            <p className="mt-2 text-4xl font-bold tracking-tight tabular">{PRICE_LABEL}</p>
            <ul className="mt-6 space-y-3 text-[14.5px]">
              {[
                "Devis illimités",
                "PDF avec votre logo et vos coordonnées",
                "Catalogue de prix personnel",
                "Envoi par WhatsApp en un clic",
                "Suivi des devis : envoyé, accepté, refusé",
              ].map((t) => (
                <li key={t} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{t}</li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-8 w-full"><Link href="/signup">Essai gratuit 15 jours</Link></Button>
            <p className="mt-3 text-center text-[12.5px] text-muted-foreground">Rien à payer pendant l&apos;essai</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-24">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Questions fréquentes</h2>
        <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
          {faq.map((f) => (
            <details key={f.q} className="group px-5 py-4 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-1 text-[15.5px] font-medium">
                {f.q}
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-[rotate] duration-200 ease-out group-open:rotate-45">+</span>
              </summary>
              <p className="pb-1 pt-2 text-[14.5px] leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-foreground px-6 py-14 text-center text-white sm:px-12">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Votre prochain devis peut partir dans 2 minutes</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15.5px] text-white/70">Créez votre compte, entrez vos prix, et faites votre premier devis aujourd&apos;hui.</p>
          <Button asChild size="lg" className="mt-8 h-[52px] text-base">
            <Link href="/signup">Essai gratuit 15 jours <ArrowRight /></Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
