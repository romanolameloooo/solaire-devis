import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#0E7A4A" />
      <circle cx="16" cy="16" r="5" fill="#F2A516" />
      <g stroke="#F2A516" strokeWidth="2.2" strokeLinecap="round">
        <path d="M16 5v2.5M16 24.5V27M5 16h2.5M24.5 16H27M8.2 8.2l1.8 1.8M22 22l1.8 1.8M8.2 23.8l1.8-1.8M22 10l1.8-1.8" />
      </g>
    </svg>
  );
}

export function Brand({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <LogoMark className="size-7" />
      <span className="text-[16px]">SolaDevis</span>
    </Link>
  );
}
