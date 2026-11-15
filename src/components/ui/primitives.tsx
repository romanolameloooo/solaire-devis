import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- Input */
const fieldBase =
  "w-full min-w-0 rounded-lg border border-input bg-card text-foreground shadow-[0_1px_1px_rgb(23_34_28/0.03)] transition-colors placeholder:text-[#6b766f] focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:bg-destructive-soft/60 aria-invalid:focus-visible:ring-destructive/15";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <input ref={ref} aria-invalid={invalid || undefined} className={cn(fieldBase, "h-11 px-3 md:h-10", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(fieldBase, "min-h-24 px-3 py-2", className)} {...props} />,
);
Textarea.displayName = "Textarea";

/** Select natif stylé : meilleur sur mobile (roue de sélection du téléphone). */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select ref={ref} className={cn(fieldBase, "h-11 appearance-none pl-3 pr-9 md:h-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  ),
);
NativeSelect.displayName = "NativeSelect";

/* ---------------------------------------------------------------- Label / Field */
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium leading-none text-foreground", className)} {...props} />;
}

export function Field({ label, htmlFor, hint, error, className, children, optional }: {
  label: React.ReactNode; htmlFor?: string; hint?: React.ReactNode; error?: string | null; className?: string; children: React.ReactNode; optional?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(facultatif)</span>}
      </Label>
      {children}
      {error ? <p className="text-[12.5px] text-destructive">{error}</p> : hint ? <p className="text-[12.5px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Card */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-card text-card-foreground shadow-soft", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-0 md:p-6 md:pb-0", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-[15px] font-semibold tracking-tight", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[13px] leading-snug text-muted-foreground", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 md:p-6", className)} {...props} />;
}
export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 border-t border-border px-5 py-4 md:px-6", className)} {...props} />;
}

/* ---------------------------------------------------------------- Badge */
const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium", {
  variants: {
    variant: {
      default: "bg-primary-soft text-primary",
      neutral: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
      info: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
      success: "bg-primary-soft text-primary ring-1 ring-inset ring-primary/20",
      danger: "bg-destructive-soft text-destructive ring-1 ring-inset ring-destructive/20",
      sun: "bg-sun-soft text-[#8a5a00] ring-1 ring-inset ring-sun/30",
    },
  },
  defaultVariants: { variant: "default" },
});
export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/* ---------------------------------------------------------------- Skeleton */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-lg bg-[#eceee9]", className)} {...props} />;
}

/* ---------------------------------------------------------------- Notice */
export function Notice({ tone = "warn", className, children, icon }: { tone?: "warn" | "ok" | "info"; className?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div
      role={tone === "warn" ? "alert" : undefined}
      className={cn(
        "flex gap-2.5 rounded-xl px-3.5 py-3 text-[13.5px] leading-snug",
        tone === "warn" && "bg-destructive-soft text-[#9a3412]",
        tone === "ok" && "bg-primary-soft text-primary",
        tone === "info" && "bg-sun-soft text-[#7a5000]",
        className,
      )}
    >
      {icon && <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- Segmented choice (grandes cartes radio) */
export function ChoiceCards<T extends string>({ value, onChange, options, name, className }: {
  value: T; onChange: (v: T) => void; name: string; className?: string;
  options: { value: T; title: string; desc?: string; icon?: React.ReactNode }[];
}) {
  return (
    <div role="radiogroup" className={cn("grid gap-2.5", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            name={name}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-[border-color,background-color,box-shadow,scale] duration-200 ease-out active:scale-[0.98]",
              on ? "border-primary bg-primary-soft/60 ring-[3px] ring-primary/10" : "border-border hover:border-[#c9d0c5]",
            )}
          >
            {o.icon && <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg transition-colors duration-200 [&_svg]:size-[18px]", on ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>{o.icon}</span>}
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold">{o.title}</span>
              {o.desc && <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{o.desc}</span>}
            </span>
            <span className={cn("mt-1 grid size-[18px] shrink-0 place-items-center rounded-full border-2 transition-colors duration-200", on ? "border-primary" : "border-[#c9d0c5]")}>
              <span className={cn("size-2 rounded-full bg-primary transition-[opacity,scale] duration-200 ease-out", on ? "scale-100 opacity-100" : "scale-50 opacity-0")} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
