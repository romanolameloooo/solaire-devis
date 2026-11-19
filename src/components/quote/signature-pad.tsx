"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
}

type Pt = { x: number; y: number };

/**
 * Zone de signature au doigt (ou au stylet / à la souris).
 * - Événements « pointer » + touch-action: none : le doigt dessine au lieu de faire défiler la page.
 * - Le tracé est gardé en coordonnées relatives (0..1) : il est redessiné à l'identique si l'écran pivote.
 * - Rendu net sur les écrans haute densité (devicePixelRatio).
 */
export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (empty: boolean) => void; height?: number }>(
  function SignaturePad({ onChange, height = 220 }, ref) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const strokes = useRef<Pt[][]>([]);
    const drawing = useRef(false);
    const pointerId = useRef<number | null>(null);

    const ctx = () => canvas.current?.getContext("2d") ?? null;

    const redraw = useCallback(() => {
      const c = canvas.current;
      const g = ctx();
      if (!c || !g) return;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, c.width, c.height);
      g.lineCap = "round";
      g.lineJoin = "round";
      g.strokeStyle = "#17221c";
      g.lineWidth = Math.max(2.2, c.width / 260);
      for (const s of strokes.current) {
        if (!s.length) continue;
        g.beginPath();
        const p0 = { x: s[0].x * c.width, y: s[0].y * c.height };
        g.moveTo(p0.x, p0.y);
        if (s.length === 1) g.lineTo(p0.x + 0.1, p0.y + 0.1);
        for (let i = 1; i < s.length; i++) {
          const a = s[i - 1], b = s[i];
          // Courbe passant par le milieu des points : tracé lisse, sans angles
          const mx = ((a.x + b.x) / 2) * c.width, my = ((a.y + b.y) / 2) * c.height;
          g.quadraticCurveTo(a.x * c.width, a.y * c.height, mx, my);
        }
        g.stroke();
      }
    }, []);

    const resize = useCallback(() => {
      const c = canvas.current;
      if (!c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = c.clientWidth;
      c.width = Math.round(w * dpr);
      c.height = Math.round(height * dpr);
      redraw();
    }, [height, redraw]);

    useEffect(() => {
      resize();
      const ro = new ResizeObserver(resize);
      if (canvas.current) ro.observe(canvas.current);
      return () => ro.disconnect();
    }, [resize]);

    const point = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
      const r = e.currentTarget.getBoundingClientRect();
      return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
    };

    function down(e: React.PointerEvent<HTMLCanvasElement>) {
      // Un seul doigt à la fois : un deuxième contact ne fait pas sauter le trait
      if (drawing.current) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      pointerId.current = e.pointerId;
      drawing.current = true;
      strokes.current.push([point(e)]);
      redraw();
      onChange?.(false);
    }
    function move(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawing.current || e.pointerId !== pointerId.current) return;
      e.preventDefault();
      // Points intermédiaires (tracé plus fluide) ; certains navigateurs renvoient une liste vide : on garde alors le point courant
      const coalesced = typeof e.nativeEvent.getCoalescedEvents === "function" ? e.nativeEvent.getCoalescedEvents() : [];
      const events = coalesced.length ? coalesced : [e.nativeEvent];
      const r = e.currentTarget.getBoundingClientRect();
      const s = strokes.current[strokes.current.length - 1];
      for (const ev of events) s.push({ x: Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)) });
      redraw();
    }
    function up(e: React.PointerEvent<HTMLCanvasElement>) {
      if (e.pointerId !== pointerId.current) return;
      drawing.current = false;
      pointerId.current = null;
    }

    useImperativeHandle(ref, () => ({
      clear() { strokes.current = []; redraw(); onChange?.(true); },
      // Une signature d'un seul point n'est pas une signature
      isEmpty() { return strokes.current.reduce((n, s) => n + s.length, 0) < 8; },
      toDataURL() { return canvas.current?.toDataURL("image/png") ?? ""; },
    }), [redraw, onChange]);

    return (
      <canvas
        ref={canvas}
        role="img"
        aria-label="Zone de signature : signez avec le doigt"
        className="block w-full cursor-crosshair touch-none select-none rounded-xl border-2 border-dashed border-[#aab4a6] bg-white"
        style={{ height }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  },
);
