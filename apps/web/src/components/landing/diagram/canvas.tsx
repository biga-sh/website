import type { ComponentPropsWithoutRef, ReactNode, SVGProps } from "react";

import { cn } from "@/lib/utils";

type DiagramProps = {
  viewBox: string;
  /** Grid paper, confined to this canvas. Off for diagrams that read better
      on a plain surface (the checkpoint stack, the compare slider). */
  paper?: boolean;
  className?: string;
  /** Raw SVG content: paths, plates, node marks. */
  children: ReactNode;
  /** HTML positioned over the SVG: labels and interactive node buttons. */
  overlay?: ReactNode;
  svgProps?: SVGProps<SVGSVGElement>;
};

/**
 * Shared canvas for every "Plates & Wires" illustration. The SVG carries the
 * line work (`aria-hidden`, decorative); HTML text and buttons sit in the
 * `overlay` layer positioned by percentage, so labels stay a fixed, legible
 * size and interactive nodes stay real, focusable elements instead of
 * clickable SVG shapes.
 */
export function Diagram({
  viewBox,
  paper = true,
  className,
  children,
  overlay,
  svgProps,
}: DiagramProps) {
  return (
    <div className={cn("relative w-full", paper && "spire-paper rounded-2xl", className)}>
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        className="block h-full w-full"
        {...svgProps}
      >
        {children}
      </svg>
      {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}
    </div>
  );
}

type DiagramLabelProps = {
  x: number;
  y: number;
  align?: "start" | "center" | "end";
  className?: string;
  children: ReactNode;
};

/** HTML label positioned at a percentage point of the diagram's canvas. */
export function DiagramLabel({ x, y, align = "center", className, children }: DiagramLabelProps) {
  const translateX = align === "start" ? "0%" : align === "end" ? "-100%" : "-50%";
  return (
    <span
      className={cn(
        "text-muted-foreground absolute font-mono text-[11px] leading-tight whitespace-nowrap",
        className
      )}
      style={{ left: `${x}%`, top: `${y}%`, transform: `translate(${translateX}, -50%)` }}
    >
      {children}
    </span>
  );
}

/**
 * A real, focusable button positioned over an SVG node mark, in percentage
 * coordinates. It renders no visuals of its own beyond the focus ring and an
 * optional caption below, so the SVG glyph underneath stays the thing the
 * eye reads; the button exists so the node is reachable, clickable and
 * announced like any other control.
 */
export function DiagramNodeButton({
  x,
  y,
  label,
  selected,
  className,
  children,
  ...props
}: {
  x: number;
  y: number;
  label?: string;
  selected?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"button">, "style" | "className" | "children">) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "group pointer-events-auto absolute flex size-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-xl outline-none transition-transform duration-150 ease-out motion-safe:active:scale-95",
        "focus-visible:ring-ring/60 focus-visible:ring-[3px]",
        className
      )}
      style={{ left: `${x}%`, top: `${y}%` }}
      {...props}
    >
      {children}
      {label && (
        // Hidden until hovered or focused: several of these sit close
        // together, and their filenames are wider than the gap between
        // them. The accessible name (aria-label on the button) carries the
        // same text regardless.
        <span
          aria-hidden
          className="text-muted-foreground bg-background/90 pointer-events-none absolute top-full mt-1.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap opacity-0 shadow-sm transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {label}
        </span>
      )}
    </button>
  );
}
