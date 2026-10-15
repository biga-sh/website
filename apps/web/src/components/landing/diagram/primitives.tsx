import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * A plate: one checkpoint. The shape is `SpireMark`'s own unit, reused at
 * diagram scale, so the illustrations read as grown from the brand mark
 * rather than a separate decoration system.
 */
export function Plate({
  x,
  y,
  width = 56,
  height = 7,
  rotate = 6,
  live,
  dim,
  animate,
  delay = 0,
  className,
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotate?: number;
  live?: boolean;
  dim?: boolean;
  animate?: boolean;
  delay?: number;
  className?: string;
}) {
  return (
    <rect
      x={x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      rx={height / 2}
      transform={`rotate(${rotate} ${x} ${y})`}
      fill={live ? "var(--spire-accent)" : dim ? "var(--diagram-plate-dim)" : "var(--diagram-plate)"}
      className={cn("spire-plate", animate && "spire-plate-in", className)}
      style={animate ? ({ "--plate-delay": `${delay}ms` } as CSSProperties) : undefined}
    />
  );
}

/**
 * A stack of plates twisting upward, the newest accented, exactly the
 * motif `SpireMark` draws at icon scale. Used wherever the page shows "a
 * session" at a glance: the hero, the workspace skyline, the closing CTA.
 */
export function PlateStack({
  cx,
  baseY,
  count = 3,
  gap = 11,
  scale = 1,
  animate = true,
  startDelay = 0,
  /** Whether the top plate reads as "now". A stack standing for an ended
      session passes `false`, so it stays as neutral as the plates below it. */
  topLive = true,
  className,
}: {
  cx: number;
  baseY: number;
  count?: number;
  gap?: number;
  scale?: number;
  animate?: boolean;
  startDelay?: number;
  topLive?: boolean;
  className?: string;
}) {
  return (
    <g className={className}>
      {Array.from({ length: count }).map((_, i) => {
        const y = baseY - i * gap * scale;
        const rotate = i % 2 === 0 ? 6 : -6;
        const isLive = topLive && i === count - 1;
        const isDim = count - 1 - i >= 2;
        return (
          <Plate
            key={i}
            x={cx}
            y={y}
            width={54 * scale}
            height={7 * scale}
            rotate={rotate}
            live={isLive}
            dim={isDim}
            animate={animate}
            delay={startDelay + i * 70}
          />
        );
      })}
    </g>
  );
}

/** A connection between two points: draws itself once on reveal. */
export function Wire({
  d,
  delay = 0,
  strong,
  className,
}: {
  d: string;
  delay?: number;
  strong?: boolean;
  className?: string;
}) {
  return (
    <path
      d={d}
      pathLength={1}
      className={cn("spire-wire spire-wire-draw", strong && "spire-wire-strong", className)}
      style={{ "--wire-delay": `${delay}ms` } as CSSProperties}
    />
  );
}

/** A short pulse of "now" travelling a wire. Only rendered while something
    is actually in flight, triggered by the same reveal as its wire. */
export function Signal({
  d,
  delay = 0,
  className,
}: {
  d: string;
  delay?: number;
  className?: string;
}) {
  return (
    <path
      d={d}
      pathLength={1}
      className={cn("spire-signal spire-signal-run", className)}
      style={{ "--signal-delay": `${delay}ms` } as CSSProperties}
    />
  );
}

/** A file: a small labelled square with two text rules, Spire's unit for
    "a thing that can be saved". */
export function FileNodeMark({ x, y, size = 22 }: { x: number; y: number; size?: number }) {
  const half = size / 2;
  return (
    <g>
      <rect
        x={x - half}
        y={y - half}
        width={size}
        height={size}
        rx={4}
        fill="var(--card)"
        stroke="var(--diagram-wire-strong)"
        strokeWidth={1.25}
      />
      <path
        d={`M ${x - half * 0.5} ${y - half * 0.28} h ${size * 0.42} M ${x - half * 0.5} ${y + half * 0.2} h ${size * 0.26}`}
        stroke="var(--diagram-wire-strong)"
        strokeWidth={1.25}
        strokeLinecap="round"
      />
    </g>
  );
}

/** A viewer: a minimal browser window, Spire's unit for "someone watching". */
export function ViewerNodeMark({ x, y, size = 30 }: { x: number; y: number; size?: number }) {
  const w = size;
  const h = size * 0.74;
  const left = x - w / 2;
  const top = y - h / 2;
  const barH = h * 0.26;
  return (
    <g>
      <rect
        x={left}
        y={top}
        width={w}
        height={h}
        rx={3.5}
        fill="var(--card)"
        stroke="var(--diagram-wire-strong)"
        strokeWidth={1.25}
      />
      <path d={`M ${left} ${top + barH} h ${w}`} stroke="var(--diagram-wire-strong)" strokeWidth={1.1} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={left + 5 + i * 4.5} cy={top + barH / 2} r={1} fill="var(--diagram-wire-strong)" />
      ))}
    </g>
  );
}
