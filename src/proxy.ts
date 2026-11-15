import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/app", "/onboarding", "/admin"];
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  // Force le HTTPS en production (Netlify le fait aussi ; filet de sécurité pour tout autre hébergeur)
  const host = request.headers.get("host") || "";
  if (request.headers.get("x-forwarded-proto") === "http" && !/^(localhost|127\.0\.0\.1)(:|$)/.test(host)) {
    const to = request.nextUrl.clone();
    to.protocol = "https:";
    return NextResponse.redirect(to, 308);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });

  // Lien d'email renvoyé sur une autre page que /auth/callback (ex. l'accueil) : on le redirige au bon endroit
  const sp = request.nextUrl.searchParams;
  if (!request.nextUrl.pathname.startsWith("/auth/") && (sp.has("code") || sp.has("token_hash"))) {
    const to = request.nextUrl.clone();
    to.pathname = "/auth/callback";
    return NextResponse.redirect(to);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const path = request.nextUrl.pathname;

  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(to);
  }
  if (user && AUTH_PAGES.includes(path)) {
    const to = request.nextUrl.clone();
    to.pathname = "/app";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
