"use client";

import { BellIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useInView } from "@/lib/use-in-view";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

const MIN = 14;
const MAX = 86;
const REST = 56;

/**
 * A draggable compare: the same real source code as a screen share would
 * deliver it (compressed, notified over) against the file itself. On reveal
 * it sweeps once from mostly-screen-share to resting near the middle, a
 * one-shot hint that the line can be dragged; after that, or immediately
 * under reduced motion, every further move is instant and user-driven.
 */
export function CompareSlider({ html }: { html: string }) {
  const [pos, setPos] = useState(82);
  const [introPlaying, setIntroPlaying] = useState(false);
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.35 });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!inView) {
      return;
    }
    if (reducedMotion) {
      setPos(REST);
      return;
    }
    setIntroPlaying(true);
    const raf = requestAnimationFrame(() => setPos(REST));
    const settle = setTimeout(() => setIntroPlaying(false), 950);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [inView, reducedMotion]);

  function onDrag(value: number) {
    setIntroPlaying(false);
    setPos(Math.min(MAX, Math.max(MIN, value)));
  }

  const code = "spire-shiki overflow-hidden px-4 py-5 font-mono text-[11px] leading-[1.7] sm:text-xs";

  return (
    <div
      ref={ref}
      className="border-border/70 bg-card relative overflow-hidden rounded-2xl border shadow-[0_20px_50px_-40px_oklch(0_0_0_/_0.35)] select-none dark:shadow-[0_20px_50px_-40px_oklch(0_0_0_/_0.9)]"
    >
      {/* Baseline: the file itself, full width and crisp. */}
      <div aria-hidden className={code} dangerouslySetInnerHTML={{ __html: html }} />

      {/* Overlay: a screen share of the same code, clipped to the slider. */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 overflow-hidden",
          introPlaying && "transition-[clip-path] duration-[950ms] ease-[var(--ease-in-out)]"
        )}
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <div className={cn(code, "blur-[2px] contrast-75")} dangerouslySetInnerHTML={{ __html: html }} />
        <div className="bg-background/95 border-border/70 absolute top-3 left-3 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] shadow-sm">
          <BellIcon className="size-3.5 shrink-0" strokeWidth={1.5} />
          <span className="font-medium whitespace-nowrap">3 new messages</span>
        </div>
      </div>

      {/* Divider + handle, purely visual; the real control is the range input. */}
      <div
        aria-hidden
        className="bg-spire pointer-events-none absolute inset-y-0 w-px"
        style={{ left: `${pos}%` }}
      >
        <span className="border-spire bg-background absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm" />
      </div>

      <input
        type="range"
        min={MIN}
        max={MAX}
        value={pos}
        onChange={(event) => onDrag(Number(event.target.value))}
        aria-label="Compare a screen share of this code to Spire"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />

      <div className="text-muted-foreground pointer-events-none absolute right-0 bottom-0 left-0 flex justify-between px-4 py-2.5 text-[11px]">
        <span className={cn("transition-opacity duration-150", pos > 30 ? "opacity-100" : "opacity-0")}>
          Over a screen share
        </span>
        <span className={cn("transition-opacity duration-150", pos < 70 ? "opacity-100" : "opacity-0")}>
          In Spire
        </span>
      </div>
    </div>
  );
}
