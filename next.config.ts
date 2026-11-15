import type { NextConfig } from "next";

const supabaseHost = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname; } catch { return ""; }
})();

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: supabaseHost ? { remotePatterns: [{ protocol: "https", hostname: supabaseHost }] } : undefined,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // HTTPS obligatoire pendant 2 ans, sous-domaines compris
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Le site ne peut pas être affiché dans une iframe d'un autre site (anti clickjacking)
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
