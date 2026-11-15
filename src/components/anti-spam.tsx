"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Anti-spam en deux couches.
 *
 * 1. Toujours actif, invisible pour les humains : un champ piège (les robots le remplissent)
 *    et un délai minimal entre l'affichage du formulaire et l'envoi.
 * 2. Facultatif : Cloudflare Turnstile, si NEXT_PUBLIC_TURNSTILE_SITE_KEY est renseignée ET que
 *    la protection CAPTCHA est activée dans Supabase (Authentication > Attack Protection).
 *    Supabase vérifie alors le jeton côté serveur : un robot ne peut pas le contourner.
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

const MIN_FILL_MS = 1500;

export function useAntiSpam() {
  const [startedAt] = useState(() => Date.now());
  const trapRef = useRef<HTMLInputElement>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  /** Vrai si l'envoi ressemble à un robot : on fait alors semblant que tout s'est bien passé. */
  const isBot = () => Boolean(trapRef.current?.value) || Date.now() - startedAt < MIN_FILL_MS;
  /** Vrai si le CAPTCHA est requis mais pas encore résolu. */
  const captchaMissing = () => Boolean(TURNSTILE_SITE_KEY) && !captchaToken;

  const trap = (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label htmlFor="website">Site web (ne pas remplir)</label>
      <input ref={trapRef} id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );

  return { trap, isBot, captchaToken, setCaptchaToken, captchaMissing };
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

/** Widget Cloudflare Turnstile (n'affiche rien si la clé n'est pas configurée). */
export function Turnstile({ onToken }: { onToken: (t: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  useEffect(() => { cb.current = onToken; }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ref.current) return;
    let id: string | undefined;
    let cancelled = false;
    const mount = () => {
      if (cancelled || !ref.current || !window.turnstile) return;
      id = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        language: "fr",
        theme: "light",
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(null),
        "error-callback": () => cb.current(null),
      });
    };
    if (window.turnstile) mount();
    else {
      const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
      const s = existing ?? Object.assign(document.createElement("script"), {
        src: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
        async: true,
        defer: true,
      });
      s.dataset.turnstile = "1";
      s.addEventListener("load", mount);
      if (!existing) document.head.appendChild(s);
    }
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}
