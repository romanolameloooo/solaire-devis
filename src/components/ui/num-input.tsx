"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { Input } from "./primitives";

export function parseNum(s: string): number | null {
  const t = s.replace(/[\s  ]/g, "").replace(",", ".");
  if (t === "" || t === "-" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const toStr = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? "" : String(v).replace(".", ","));

/**
 * Champ numérique : accepte la virgule, garde la saisie telle quelle pendant la frappe,
 * et affiche les milliers séparés (« 1 250 000 ») hors focus si `grouped`.
 */
export function NumInput({ value, onChange, grouped, suffix, className, invalid, ...props }: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  grouped?: boolean;
  suffix?: string;
  invalid?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [text, setText] = React.useState(toStr(value));
  const [focused, setFocused] = React.useState(false);

  // Synchronise si la valeur change de l'extérieur (ex. recalcul), sans effet
  const [prev, setPrev] = React.useState(value);
  if (prev !== value) {
    setPrev(value);
    if (!focused && parseNum(text) !== (value ?? null)) setText(toStr(value));
  }

  const display = !focused && grouped && value != null && Number.isFinite(value) ? formatNumber(value, Number.isInteger(value) ? 0 : 2) : text;

  return (
    <div className="relative">
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        invalid={invalid}
        value={display}
        onFocus={(e) => { setFocused(true); setText(toStr(value)); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d,.\s-]/g, "");
          setText(v);
          onChange(parseNum(v));
        }}
        className={cn("tabular", suffix && "pr-14", className)}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">{suffix}</span>}
    </div>
  );
}
