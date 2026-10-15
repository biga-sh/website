/* eslint-disable @typescript-eslint/ban-ts-comment -- see the note below */
// @ts-nocheck: vendored from the @keyframeui registry, which is written
// without `noUncheckedIndexedAccess`; all the errors it raises under this
// project's tsconfig come from that setting (unchecked array indexing).
// Update with `npx shadcn@latest add @keyframeui/<name>`, not by hand.
"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────
 * CIRCUIT STORYBOARD
 *
 *  nodes      any element inside <Circuit> with data-circuit="id".
 *             No wrappers, no refs: your grid or flex layout stays
 *             exactly as it is
 *  flow       one string draws the graph:
 *             "github, slack -> agent -> pr, docs"
 *  measure    every frame while it's on screen, the node boxes are
 *             read relative to the circuit, so lines follow resizes,
 *             font swaps, hover lifts and layout animations
 *  route      each trace tries a few right-angle shapes (Z, L, or a
 *             U around the side) and keeps the one that crosses no
 *             other card with the fewest bends. Side-by-side cards
 *             connect edge to edge; stacked on a phone they connect
 *             top to bottom or detour down a gutter
 *  pins       traces sharing a card edge spread into separate pins,
 *             sorted so they never cross; traces sharing a channel
 *             spread apart only where they would overlap
 *  draw       on mount the traces draw themselves in, stage by stage
 *  signal     a packet leaves each source, eases along its trace and
 *             lands: the card gets data-circuit-pulse, the pin
 *             flashes, onArrive fires, and the card passes it on
 *  hover      pointing at (or focusing, or tapping) a card lights
 *             the path through it, dims the rest and sends a signal
 * ───────────────────────────────────────────────────────── */

type Side = "top" | "right" | "bottom" | "left";

export type CircuitTrace = {
  from: string;
  to: string;
  /** Packet color for this trace (any CSS color). */
  color?: string;
  /** Pin the side the trace leaves `from` by. Picked automatically otherwise. */
  fromSide?: Side;
  /** Pin the side the trace enters `to` by. Picked automatically otherwise. */
  toSide?: Side;
};

/**
 * `"a, b -> c -> d, e"`: every node in a stage connects to every node in
 * the next. Separate chains with `;` or a new line. Mix in trace objects
 * for per-trace options.
 */
export type CircuitFlow = string | ReadonlyArray<string | CircuitTrace>;

export type CircuitControls = {
  /** Send a signal out of a node, as if one had just arrived there. */
  send: (node: string) => void;
};

export interface CircuitProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which nodes connect. */
  flow: CircuitFlow;
  /** Sources (nodes nothing flows into) send signals on their own. */
  autoPlay?: boolean;
  /** Seconds between signals from each source. */
  interval?: number;
  /** Packet speed in px per second. */
  speed?: number;
  /** A node with several outgoing traces sends a signal down all of them, or down one at a time in turn. */
  fanout?: "all" | "one";
  /** What lights up when a node is hovered, focused or tapped. */
  highlight?: "path" | "neighbors" | "none";
  /** Corner radius of the bends, in px. */
  radius?: number;
  /** Space between pins sharing a card edge, and between traces sharing a channel, in px. */
  pinSpacing?: number;
  /** Draw a pin where a trace meets a card. */
  pins?: boolean;
  /** Called when a signal lands on a node. */
  onArrive?: (node: string, from: string) => void;
  /** `send(node)` fires a signal from code, e.g. a button or a real event. */
  apiRef?: React.Ref<CircuitControls>;
  /** Text color classes for the traces and pins. */
  traceClassName?: string;
  /** Text color classes for the packets and lit traces. */
  packetClassName?: string;
}

export function Circuit({
  flow,
  autoPlay = true,
  interval = 2.4,
  speed = 260,
  fanout = "all",
  highlight = "path",
  radius = 12,
  pinSpacing = 12,
  pins = true,
  onArrive,
  apiRef,
  traceClassName,
  packetClassName,
  className,
  children,
  ...props
}: CircuitProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const engineRef = React.useRef<Engine | null>(null);
  const onArriveRef = React.useRef(onArrive);

  React.useEffect(() => {
    onArriveRef.current = onArrive;
  }, [onArrive]);

  React.useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;
    const engine = createEngine(root, svg, (node, from) => onArriveRef.current?.(node, from));
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const trace = cn("text-zinc-300 dark:text-zinc-700", traceClassName);
  const packet = cn("text-sky-500 dark:text-sky-400", packetClassName);

  React.useEffect(() => {
    engineRef.current?.configure({
      flow,
      autoPlay,
      interval,
      speed,
      fanout,
      highlight,
      radius,
      pinSpacing,
      pins,
      trace,
      packet,
    });
  }, [flow, autoPlay, interval, speed, fanout, highlight, radius, pinSpacing, pins, trace, packet]);

  React.useImperativeHandle(
    apiRef,
    () => ({ send: (node: string) => engineRef.current?.send(node) }),
    [],
  );

  return (
    <div ref={rootRef} data-circuit-root="" className={cn("relative isolate", className)} {...props}>
      {/* Under every card: in a stacking context of its own, a negative z-index paints
          above the circuit's background but below its in-flow content. m-0 and border-0
          keep space-* and divide-* on the circuit from reaching it. */}
      <svg
        ref={svgRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 m-0 size-full overflow-visible border-0"
      />
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * FLOW
 * ───────────────────────────────────────────────────────── */

function parseFlow(flow: CircuitFlow): CircuitTrace[] {
  const traces = new Map<string, CircuitTrace>();
  for (const item of typeof flow === "string" ? [flow] : flow) {
    if (typeof item !== "string") {
      const key = `${item.from}\n${item.to}`;
      traces.set(key, { ...traces.get(key), ...item });
      continue;
    }
    for (const chain of item.split(/[\n;]/)) {
      const stages = chain
        .split("->")
        .map((stage) => stage.split(",").map((id) => id.trim()).filter(Boolean));
      for (let i = 0; i < stages.length - 1; i++) {
        for (const from of stages[i]) {
          for (const to of stages[i + 1]) {
            const key = `${from}\n${to}`;
            if (from !== to && !traces.has(key)) traces.set(key, { from, to });
          }
        }
      }
    }
  }
  return [...traces.values()];
}

/* ─────────────────────────────────────────────────────────
 * GEOMETRY
 * ───────────────────────────────────────────────────────── */

type Pt = { x: number; y: number };
type Box = { l: number; t: number; r: number; b: number };

/** Shortest straight run out of a card before a trace may bend. */
const STUB = 12;
/** How far a detour stays clear of the cards it goes around. */
const GUTTER = 18;

const isHorizontal = (side: Side) => side === "left" || side === "right";
const OPPOSITE: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };

function anchor(box: Box, side: Side, offset: number): Pt {
  const cx = (box.l + box.r) / 2;
  const cy = (box.t + box.b) / 2;
  if (side === "top") return { x: cx + offset, y: box.t };
  if (side === "bottom") return { x: cx + offset, y: box.b };
  if (side === "left") return { x: box.l, y: cy + offset };
  return { x: box.r, y: cy + offset };
}

/** Half the usable length of a card edge, so pins stay clear of its corners. */
function sideReach(box: Box, side: Side) {
  const length = isHorizontal(side) ? box.b - box.t : box.r - box.l;
  return Math.max(0, length / 2 - Math.min(10, length / 4));
}

type Kind = "channel" | "detour" | "elbow" | "free";

/**
 * Right-angle waypoints. A channel route (Z between facing edges, or a
 * detour U around the side) runs its middle leg at `channel`; an elbow
 * bends once; a free route stubs out of both edges and meets in between.
 */
function waypoints(kind: Kind, from: Side, to: Side, start: Pt, end: Pt, channel: number): Pt[] {
  if (kind === "channel" || kind === "detour") {
    return isHorizontal(from)
      ? [start, { x: channel, y: start.y }, { x: channel, y: end.y }, end]
      : [start, { x: start.x, y: channel }, { x: end.x, y: channel }, end];
  }
  if (kind === "elbow") {
    return isHorizontal(from) ? [start, { x: end.x, y: start.y }, end] : [start, { x: start.x, y: end.y }, end];
  }
  const out = step(start, from, STUB);
  const into = step(end, to, STUB);
  const middle = isHorizontal(from) ? { x: out.x, y: into.y } : { x: into.x, y: out.y };
  return [start, out, middle, into, end];
}

function step(point: Pt, side: Side, distance: number): Pt {
  if (side === "top") return { x: point.x, y: point.y - distance };
  if (side === "bottom") return { x: point.x, y: point.y + distance };
  if (side === "left") return { x: point.x - distance, y: point.y };
  return { x: point.x + distance, y: point.y };
}

/** Drop repeated and collinear points. */
function simplify(points: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue;
    if (out.length >= 2) {
      const a = out[out.length - 2];
      if ((Math.abs(a.x - last.x) < 0.5 && Math.abs(last.x - p.x) < 0.5) || (Math.abs(a.y - last.y) < 0.5 && Math.abs(last.y - p.y) < 0.5)) {
        out[out.length - 1] = p;
        continue;
      }
    }
    out.push(p);
  }
  return out;
}

/** Does an axis-aligned segment pass through the inside of a box? */
function hits(a: Pt, b: Pt, box: Box) {
  return Math.max(a.x, b.x) > box.l && Math.min(a.x, b.x) < box.r && Math.max(a.y, b.y) > box.t && Math.min(a.y, b.y) < box.b;
}

/** Crossings (1 each) and overlapping runs (2 each) between two right-angle polylines. */
function tangles(p: Pt[], q: Pt[]) {
  let count = 0;
  for (let i = 0; i < p.length - 1; i++) {
    for (let j = 0; j < q.length - 1; j++) {
      const [a, b, c, d] = [p[i], p[i + 1], q[j], q[j + 1]];
      const pv = Math.abs(a.x - b.x) < 0.5;
      const qv = Math.abs(c.x - d.x) < 0.5;
      if (pv === qv) {
        const same = pv ? Math.abs(a.x - c.x) < 0.5 : Math.abs(a.y - c.y) < 0.5;
        const lo = pv ? Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) : Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x));
        const hi = pv ? Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) : Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x));
        if (same && hi - lo > 1) count += 2;
      } else {
        const [v1, v2, h1, h2] = pv ? [a, b, c, d] : [c, d, a, b];
        const x = v1.x;
        const y = h1.y;
        if (x > Math.min(h1.x, h2.x) + 0.5 && x < Math.max(h1.x, h2.x) - 0.5 && y > Math.min(v1.y, v2.y) + 0.5 && y < Math.max(v1.y, v2.y) - 0.5) {
          count += 1;
        }
      }
    }
  }
  return count;
}

type Segment =
  | { line: true; a: Pt; b: Pt; length: number }
  | { line: false; c: Pt; r: number; a0: number; turn: number; length: number };

type Shape = { d: string; segments: Segment[]; length: number; start: Pt; end: Pt };

/** Rounded corners as true quarter arcs, so the length (and every packet position) is exact. */
function shape(points: Pt[], radius: number): Shape {
  const segments: Segment[] = [];
  const last = points.length - 1;
  let d = `M${points[0].x} ${points[0].y}`;
  let cursor = points[0];

  for (let i = 1; i < last; i++) {
    const [prev, at, next] = [points[i - 1], points[i], points[i + 1]];
    const inLength = Math.hypot(at.x - prev.x, at.y - prev.y);
    const outLength = Math.hypot(next.x - at.x, next.y - at.y);
    const u = { x: (at.x - prev.x) / inLength, y: (at.y - prev.y) / inLength };
    const v = { x: (next.x - at.x) / outLength, y: (next.y - at.y) / outLength };
    const r = Math.min(radius, i === 1 ? inLength : inLength / 2, i + 1 === last ? outLength : outLength / 2);
    const enter = { x: at.x - u.x * r, y: at.y - u.y * r };
    const exit = { x: at.x + v.x * r, y: at.y + v.y * r };
    const line = Math.hypot(enter.x - cursor.x, enter.y - cursor.y);
    if (line > 0.01) segments.push({ line: true, a: cursor, b: enter, length: line });
    d += ` L${enter.x} ${enter.y}`;
    if (r > 0.5) {
      const cross = u.x * v.y - u.y * v.x;
      const c = { x: enter.x + v.x * r, y: enter.y + v.y * r };
      segments.push({
        line: false,
        c,
        r,
        a0: Math.atan2(enter.y - c.y, enter.x - c.x),
        turn: cross > 0 ? Math.PI / 2 : -Math.PI / 2,
        length: (Math.PI / 2) * r,
      });
      d += ` A${r} ${r} 0 0 ${cross > 0 ? 1 : 0} ${exit.x} ${exit.y}`;
    } else {
      d += ` L${exit.x} ${exit.y}`;
    }
    cursor = exit;
  }

  const end = points[last];
  const tail = Math.hypot(end.x - cursor.x, end.y - cursor.y);
  if (tail > 0.01) segments.push({ line: true, a: cursor, b: end, length: tail });
  d += ` L${end.x} ${end.y}`;
  const length = segments.reduce((sum, s) => sum + s.length, 0);
  return { d, segments, length, start: points[0], end };
}

function pointAt(shape: Shape, distance: number): Pt {
  let left = Math.max(0, Math.min(distance, shape.length));
  for (const s of shape.segments) {
    if (left <= s.length) {
      const k = s.length ? left / s.length : 0;
      if (s.line) return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k };
      const angle = s.a0 + s.turn * k;
      return { x: s.c.x + Math.cos(angle) * s.r, y: s.c.y + Math.sin(angle) * s.r };
    }
    left -= s.length;
  }
  return shape.end;
}

/* ─────────────────────────────────────────────────────────
 * ROUTER
 * ───────────────────────────────────────────────────────── */

type Plan = {
  index: number;
  a: Box;
  b: Box;
  from: Side;
  to: Side;
  kind: Kind;
  channel: number;
  /** Where the middle leg may sit: between the cards for a Z, outward from `lo` for a detour. */
  lo: number;
  hi: number;
  outward: 1 | -1;
  fromOffset: number;
  toOffset: number;
  points: Pt[];
};

function build(plan: Plan) {
  const start = anchor(plan.a, plan.from, plan.fromOffset);
  const end = anchor(plan.b, plan.to, plan.toOffset);
  plan.points = waypoints(plan.kind, plan.from, plan.to, start, end, plan.channel);
}

type Candidate = Omit<Plan, "index" | "points" | "fromOffset" | "toOffset"> & {
  /** Taste: how much less we like this shape than a Z along the main axis. */
  penalty: number;
};

function candidates(trace: CircuitTrace, a: Box, b: Box, obstacles: Box[]): Candidate[] {
  const out: Candidate[] = [];
  const gapX = Math.max(b.l - a.r, a.l - b.r);
  const gapY = Math.max(b.t - a.b, a.t - b.b);
  const rightward = b.l - a.r >= a.l - b.r;
  const downward = b.t - a.b >= a.t - b.b;
  // The main axis, with a lean toward horizontal: gaps that are nearly equal shouldn't
  // flip a trace's direction (and leave a grid lopsided) over a few px.
  const across = gapX >= gapY * 0.8;

  // Z between facing edges: the tidy default when the cards sit side by side or one above the other.
  if (gapX >= 2 * STUB) {
    const [lo, hi] = rightward ? [a.r + STUB, b.l - STUB] : [b.r + STUB, a.l - STUB];
    out.push({ a, b, from: rightward ? "right" : "left", to: rightward ? "left" : "right", kind: "channel", channel: (lo + hi) / 2, lo, hi, outward: 1, penalty: across ? 0 : 60 });
  }
  if (gapY >= 2 * STUB) {
    const [lo, hi] = downward ? [a.b + STUB, b.t - STUB] : [b.b + STUB, a.t - STUB];
    out.push({ a, b, from: downward ? "bottom" : "top", to: downward ? "top" : "bottom", kind: "channel", channel: (lo + hi) / 2, lo, hi, outward: 1, penalty: across ? 60 : 0 });
  }

  // Elbows: one bend, for cards that sit diagonally.
  const bx = (b.l + b.r) / 2;
  const by = (b.t + b.b) / 2;
  const ax = (a.l + a.r) / 2;
  const ay = (a.t + a.b) / 2;
  const hFrom: Side = bx >= ax ? "right" : "left";
  const hTo: Side = ay <= b.t ? "top" : "bottom";
  if ((hFrom === "right" ? bx >= a.r + STUB : bx <= a.l - STUB) && (hTo === "top" ? ay <= b.t - STUB : ay >= b.b + STUB)) {
    out.push({ a, b, from: hFrom, to: hTo, kind: "elbow", channel: 0, lo: 0, hi: 0, outward: 1, penalty: 80 });
  }
  const vFrom: Side = by >= ay ? "bottom" : "top";
  const vTo: Side = ax <= b.l ? "left" : "right";
  if ((vFrom === "bottom" ? by >= a.b + STUB : by <= a.t - STUB) && (vTo === "left" ? ax <= b.l - STUB : ax >= b.r + STUB)) {
    out.push({ a, b, from: vFrom, to: vTo, kind: "elbow", channel: 0, lo: 0, hi: 0, outward: 1, penalty: 80 });
  }

  // Detours: out one side, along a gutter past everything in the way, back in the same side.
  for (const side of ["right", "left", "bottom", "top"] as Side[]) {
    const horizontal = isHorizontal(side);
    const outward = side === "right" || side === "bottom" ? 1 : -1;
    const span = horizontal ? [Math.min(ay, by), Math.max(ay, by)] : [Math.min(ax, bx), Math.max(ax, bx)];
    let edge = outward > 0 ? -Infinity : Infinity;
    for (const box of [a, b, ...obstacles]) {
      const inSpan = horizontal ? box.b > span[0] && box.t < span[1] : box.r > span[0] && box.l < span[1];
      if (box !== a && box !== b && !inSpan) continue;
      const far = side === "right" ? box.r : side === "left" ? box.l : side === "bottom" ? box.b : box.t;
      edge = outward > 0 ? Math.max(edge, far) : Math.min(edge, far);
    }
    const channel = edge + outward * GUTTER;
    out.push({ a, b, from: side, to: side, kind: "detour", channel, lo: channel, hi: channel, outward, penalty: 200 });
  }

  const fits = out.filter((c) => (!trace.fromSide || c.from === trace.fromSide) && (!trace.toSide || c.to === trace.toSide));
  if (fits.length) return fits;

  // Sides pinned to something none of the shapes above can do: stub out of both and meet in the middle.
  const from = trace.fromSide ?? (across ? (rightward ? "right" : "left") : downward ? "bottom" : "top");
  const to = trace.toSide ?? OPPOSITE[from];
  return [{ a, b, from, to, kind: "free", channel: 0, lo: 0, hi: 0, outward: 1, penalty: 0 }];
}

function route(traces: CircuitTrace[], boxes: Map<string, Box>, width: number, height: number, pinSpacing: number): (Pt[] | null)[] {
  const plans: (Plan | null)[] = traces.map((trace, index) => {
    const a = boxes.get(trace.from);
    const b = boxes.get(trace.to);
    if (!a || !b) return null;
    const obstacles = [...boxes.values()].filter((box) => box !== a && box !== b);
    let best: Plan | null = null;
    let bestCost = Infinity;
    for (const candidate of candidates(trace, a, b, obstacles)) {
      const { penalty, ...rest } = candidate;
      const plan: Plan = { ...rest, index, fromOffset: 0, toOffset: 0, points: [] };
      build(plan);
      const cost = score(plan, obstacles, width, height) + penalty;
      if (cost < bestCost) {
        best = plan;
        bestCost = cost;
      }
    }
    return best;
  });
  const live = plans.filter((p): p is Plan => p !== null);

  // Pins: traces sharing a card edge spread along it, ordered by where their other end is.
  const groups = new Map<string, { plan: Plan; end: "from" | "to"; order: number }[]>();
  for (const plan of live) {
    const ends: ["from" | "to", Side, Box, Side][] = [
      ["from", plan.from, plan.b, plan.to],
      ["to", plan.to, plan.a, plan.from],
    ];
    for (const [end, side, other, otherSide] of ends) {
      const key = `${end === "from" ? traces[plan.index].from : traces[plan.index].to}:${side}`;
      const there = anchor(other, otherSide, 0);
      const order = isHorizontal(side) ? there.y : there.x;
      const list = groups.get(key) ?? [];
      list.push({ plan, end, order: order + plan.index * 1e-3 });
      groups.set(key, list);
    }
  }
  const single = new Set<string>();
  for (const list of groups.values()) {
    list.sort((p, q) => p.order - q.order);
    const { plan, end } = list[0];
    const box = end === "from" ? plan.a : plan.b;
    const side = end === "from" ? plan.from : plan.to;
    const reach = sideReach(box, side);
    const gap = list.length > 1 ? Math.min(pinSpacing, (2 * reach) / (list.length - 1)) : 0;
    list.forEach((entry, i) => {
      const offset = (i - (list.length - 1) / 2) * gap;
      if (entry.end === "from") entry.plan.fromOffset = offset;
      else entry.plan.toOffset = offset;
    });
    if (list.length === 1) single.add(`${plan.index}:${end}`);
  }

  // A Z that would only jog a few px is pulled straight by sliding a lone pin.
  for (const plan of live) {
    if (plan.kind !== "channel") continue;
    build(plan);
    const [start, end] = [plan.points[0], plan.points[plan.points.length - 1]];
    const drift = isHorizontal(plan.from) ? end.y - start.y : end.x - start.x;
    if (Math.abs(drift) < 0.5 || Math.abs(drift) > 10) continue;
    if (single.has(`${plan.index}:from`) && Math.abs(plan.fromOffset + drift) <= sideReach(plan.a, plan.from)) plan.fromOffset += drift;
    else if (single.has(`${plan.index}:to`) && Math.abs(plan.toOffset - drift) <= sideReach(plan.b, plan.to)) plan.toOffset -= drift;
  }
  for (const plan of live) build(plan);

  // Channels: middle legs that would run on top of each other spread apart.
  const channels = live.filter((p) => p.kind === "channel" || p.kind === "detour");
  const span = (p: Plan) => {
    const [s, e] = [p.points[0], p.points[p.points.length - 1]];
    return isHorizontal(p.from) ? [Math.min(s.y, e.y), Math.max(s.y, e.y)] : [Math.min(s.x, e.x), Math.max(s.x, e.x)];
  };
  const parent = channels.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < channels.length; i++) {
    for (let j = i + 1; j < channels.length; j++) {
      const [p, q] = [channels[i], channels[j]];
      if (isHorizontal(p.from) !== isHorizontal(q.from) || Math.abs(p.channel - q.channel) >= pinSpacing) continue;
      const [ps, qs] = [span(p), span(q)];
      if (Math.min(ps[1], qs[1]) - Math.max(ps[0], qs[0]) > -1) parent[find(i)] = find(j);
    }
  }
  const clusters = new Map<number, Plan[]>();
  channels.forEach((plan, i) => {
    const list = clusters.get(find(i)) ?? [];
    list.push(plan);
    clusters.set(find(i), list);
  });
  for (const cluster of clusters.values()) {
    if (cluster.length < 2) continue;
    const detour = cluster[0].kind === "detour";
    const outward = cluster[0].outward;
    const base = detour
      ? cluster.reduce((m, p) => (outward > 0 ? Math.max(m, p.channel) : Math.min(m, p.channel)), cluster[0].channel)
      : cluster.reduce((sum, p) => sum + p.channel, 0) / cluster.length;
    const room = detour ? pinSpacing : Math.max(0, Math.min(pinSpacing, ...cluster.map((p) => (p.hi - p.lo) / (cluster.length - 1))));
    const slot = (i: number) => (detour ? base + outward * i * room : base + (i - (cluster.length - 1) / 2) * room);

    let bestOrder = cluster;
    let bestTangles = Infinity;
    for (const order of orders(cluster)) {
      order.forEach((plan, i) => {
        plan.channel = detour ? slot(i) : Math.max(plan.lo, Math.min(plan.hi, slot(i)));
        build(plan);
      });
      let count = 0;
      for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) count += tangles(order[i].points, order[j].points);
      if (count < bestTangles) {
        bestTangles = count;
        bestOrder = [...order];
      }
      if (count === 0) break;
    }
    bestOrder.forEach((plan, i) => {
      plan.channel = detour ? slot(i) : Math.max(plan.lo, Math.min(plan.hi, slot(i)));
      build(plan);
    });
  }

  return plans.map((plan) => (plan ? simplify(plan.points) : null));
}

function score(plan: Plan, obstacles: Box[], width: number, height: number) {
  const points = simplify(plan.points);
  const inset = (box: Box, by: number): Box => ({ l: box.l + by, t: box.t + by, r: box.r - by, b: box.b - by });
  let cost = (points.length - 2) * 20;
  for (let i = 0; i < points.length - 1; i++) {
    const [p, q] = [points[i], points[i + 1]];
    cost += Math.hypot(q.x - p.x, q.y - p.y) * 0.25;
    for (const box of obstacles) if (hits(p, q, inset(box, -2))) cost += 10000;
    if (hits(p, q, inset(plan.a, 1)) || hits(p, q, inset(plan.b, 1))) cost += 10000;
  }
  for (const p of points) {
    const outside = Math.max(0, -p.x, p.x - width) + Math.max(0, -p.y, p.y - height);
    cost += outside * 4;
  }
  return cost;
}

/** Orderings to try for a cluster: all of them while that's cheap, else the two obvious ones. */
function orders(list: Plan[]): Plan[][] {
  const mid = (p: Plan) => {
    const [s, e] = [p.points[0], p.points[p.points.length - 1]];
    return isHorizontal(p.from) ? s.y + e.y : s.x + e.x;
  };
  const sorted = [...list].sort((p, q) => mid(p) - mid(q));
  if (list.length > 5) return [sorted, [...sorted].reverse()];
  const out: Plan[][] = [];
  const permute = (rest: Plan[], acc: Plan[]) => {
    if (!rest.length) out.push(acc);
    rest.forEach((p, i) => permute([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, p]));
  };
  permute(sorted, []);
  return out;
}

/* ─────────────────────────────────────────────────────────
 * ENGINE
 * ───────────────────────────────────────────────────────── */

type Options = {
  flow: CircuitFlow;
  autoPlay: boolean;
  interval: number;
  speed: number;
  fanout: "all" | "one";
  highlight: "path" | "neighbors" | "none";
  radius: number;
  pinSpacing: number;
  pins: boolean;
  trace: string;
  packet: string;
};

type Engine = {
  configure: (options: Options) => void;
  send: (node: string) => void;
  destroy: () => void;
};

const SVG = "http://www.w3.org/2000/svg";
/** Packets a trace can carry at once. */
const SLOTS = 3;
/** Length of a packet's glowing tail, in px. */
const TAIL = 44;
/** Seconds a card keeps data-circuit-pulse after a signal lands. */
const PULSE = 0.5;
/** Seconds within which a card passes on only the first of several signals. */
const COOLDOWN = 0.3;

type Slot = { glow: SVGPathElement; body: SVGPathElement; core: SVGPathElement; head: SVGCircleElement; halo: SVGCircleElement };
type Wire = {
  trace: CircuitTrace;
  group: SVGGElement;
  track: SVGPathElement;
  lit: SVGPathElement;
  pins: SVGCircleElement[];
  flash: SVGCircleElement;
  slots: Slot[];
  shape: Shape | null;
  drawFrom: number;
  flashAt: number;
};
type Packet = { wire: Wire; t0: number; duration: number; hops: number; arrived: boolean };

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element) {
  const node = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  parent.appendChild(node);
  return node;
}

const ease = (t: number) => 0.45 * t + 0.55 * (0.5 - Math.cos(Math.PI * t) / 2);

function createEngine(root: HTMLDivElement, layer: SVGSVGElement, arrive: (node: string, from: string) => void): Engine {
  let options: Options | null = null;
  let flowKey = "";
  let traces: CircuitTrace[] = [];
  let wires: Wire[] = [];
  const nodes = new Map<string, HTMLElement>();
  let boxes = new Map<string, Box>();
  let lastBoxes = new Float64Array(0);
  let routed = false;
  let packets: Packet[] = [];
  const nextAt = new Map<string, number>();
  const lastSent = new Map<string, number>();
  const turn = new Map<string, number>();
  const pulses = new Map<string, number>();
  let active: string | null = null;
  let clearTimer = 0;
  let visible = false;
  let raf = 0;
  let last = 0;
  let wakeUntil = 0;
  let firstDraw = -1;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const now = () => performance.now() / 1000;

  /* nodes */

  function scan() {
    nodes.clear();
    root.querySelectorAll<HTMLElement>("[data-circuit]").forEach((node) => {
      const id = node.dataset.circuit;
      if (!id || nodes.has(id) || node.closest("[data-circuit-root]") !== root) return;
      nodes.set(id, node);
    });
    resize.disconnect();
    resize.observe(root);
    nodes.forEach((node) => resize.observe(node));
    lastBoxes = new Float64Array(0);
    wake();
  }

  /** Read every node box relative to the circuit; true if anything moved. */
  function measure() {
    const frame = root.getBoundingClientRect();
    const sx = root.offsetWidth ? frame.width / root.offsetWidth : 1;
    const sy = root.offsetHeight ? frame.height / root.offsetHeight : 1;
    const ox = frame.left + root.clientLeft * sx;
    const oy = frame.top + root.clientTop * sy;
    const next = new Map<string, Box>();
    const flat = new Float64Array(nodes.size * 4 + 2);
    flat[0] = root.clientWidth;
    flat[1] = root.clientHeight;
    let i = 2;
    nodes.forEach((node, id) => {
      const r = node.getBoundingClientRect();
      if (!r.width && !r.height) return;
      const box = { l: (r.left - ox) / sx, t: (r.top - oy) / sy, r: (r.right - ox) / sx, b: (r.bottom - oy) / sy };
      next.set(id, box);
      flat[i++] = box.l;
      flat[i++] = box.t;
      flat[i++] = box.r;
      flat[i++] = box.b;
    });
    boxes = next;
    let moved = flat.length !== lastBoxes.length;
    for (let j = 0; !moved && j < flat.length; j++) moved = Math.abs(flat[j] - lastBoxes[j]) > 0.25;
    if (moved) lastBoxes = flat;
    return moved;
  }

  /* wires */

  function rebuild() {
    if (!options) return;
    layer.replaceChildren();
    packets = [];
    wires = traces.map((trace) => {
      const group = svg("g", { class: "transition-opacity duration-300" }, layer);
      const track = svg("path", { fill: "none", stroke: "currentColor", "stroke-width": 1.25, class: options!.trace }, group);
      const pinGroup = svg("g", { class: options!.trace, fill: "currentColor" }, group);
      const pins = [svg("circle", { r: 2.75, opacity: 0 }, pinGroup), svg("circle", { r: 2.75, opacity: 0 }, pinGroup)];
      const paint = svg("g", { class: options!.packet, fill: "none", stroke: "currentColor", "stroke-linecap": "round" }, group);
      if (trace.color) paint.style.color = trace.color;
      const lit = svg("path", { "stroke-width": 1.25, opacity: 0, class: "transition-opacity duration-300" }, paint);
      const flash = svg("circle", { r: 2.75, fill: "currentColor", stroke: "none", opacity: 0 }, paint);
      const slots = Array.from({ length: SLOTS }, () => ({
        glow: svg("path", { "stroke-width": 7, opacity: 0, "stroke-opacity": 0.16 }, paint),
        body: svg("path", { "stroke-width": 1.5, opacity: 0, "stroke-opacity": 0.55 }, paint),
        core: svg("path", { "stroke-width": 2, opacity: 0 }, paint),
        halo: svg("circle", { r: 6, fill: "currentColor", stroke: "none", opacity: 0, "fill-opacity": 0.2 }, paint),
        head: svg("circle", { r: 2.25, fill: "currentColor", stroke: "none", opacity: 0 }, paint),
      }));
      return { trace, group, track, lit, pins, flash, slots, shape: null, drawFrom: -1, flashAt: -Infinity };
    });
    lastBoxes = new Float64Array(0);
    applyHighlight();
    wake();
  }

  function reroute(t: number) {
    if (!options) return;
    const points = route(traces, boxes, root.clientWidth, root.clientHeight, options.pinSpacing);
    const depth = depths();
    wires.forEach((wire, i) => {
      const p = points[i];
      if (!p || p.length < 2) {
        wire.shape = null;
        wire.group.style.display = "none";
        return;
      }
      wire.group.style.display = "";
      const s = shape(p, options!.radius);
      wire.shape = s;
      for (const path of [wire.track, wire.lit, ...wire.slots.flatMap((slot) => [slot.glow, slot.body, slot.core])]) {
        path.setAttribute("d", s.d);
        path.setAttribute("pathLength", String(s.length));
      }
      wire.pins[0].setAttribute("cx", String(s.start.x));
      wire.pins[0].setAttribute("cy", String(s.start.y));
      wire.pins[1].setAttribute("cx", String(s.end.x));
      wire.pins[1].setAttribute("cy", String(s.end.y));
      wire.flash.setAttribute("cx", String(s.end.x));
      wire.flash.setAttribute("cy", String(s.end.y));
      if (wire.drawFrom < 0) {
        if (firstDraw < 0) firstDraw = t;
        // Traces present at mount draw in stage by stage; ones that show up later draw on their own.
        wire.drawFrom = t - firstDraw < 0.1 ? t + (depth.get(wire.trace.from) ?? 0) * 0.16 : t;
      }
    });
    routed = true;
  }

  function depths() {
    const depth = new Map<string, number>();
    const incoming = new Set(traces.map((t) => t.to));
    let frontier = [...new Set(traces.map((t) => t.from))].filter((id) => !incoming.has(id));
    frontier.forEach((id) => depth.set(id, 0));
    for (let level = 1; frontier.length && level < 32; level++) {
      const next: string[] = [];
      for (const t of traces) {
        if (frontier.includes(t.from) && !depth.has(t.to)) {
          depth.set(t.to, level);
          next.push(t.to);
        }
      }
      frontier = next;
    }
    return depth;
  }

  /* signals */

  const live = (wire: Wire) => wire.shape !== null;
  const outOf = (node: string) => wires.filter((w) => w.trace.from === node && live(w));

  function emit(node: string, t: number, hops: number, delay: number) {
    if (!options) return;
    let out = outOf(node);
    if (!out.length) return;
    if (options.fanout === "one") {
      const i = turn.get(node) ?? 0;
      turn.set(node, i + 1);
      out = [out[i % out.length]];
    }
    lastSent.set(node, t);
    for (const wire of out) {
      const length = wire.shape!.length;
      const mine = packets.filter((p) => p.wire === wire);
      if (mine.length >= SLOTS) packets.splice(packets.indexOf(mine[0]), 1);
      packets.push({ wire, t0: t + delay, duration: Math.min(2.4, Math.max(0.45, length / options.speed)), hops, arrived: false });
    }
  }

  function land(wire: Wire, t: number, hops: number) {
    const { from, to } = wire.trace;
    wire.flashAt = t;
    pulse(to, t);
    arrive(to, from);
    if (hops < 24 && t - (lastSent.get(to) ?? -Infinity) > COOLDOWN) emit(to, t, hops + 1, 0.1);
  }

  function pulse(node: string, t: number) {
    const element = nodes.get(node);
    if (!element) return;
    element.setAttribute("data-circuit-pulse", "");
    pulses.set(node, t + PULSE);
  }

  function send(node: string) {
    const t = now();
    if (!options) return;
    if (!outOf(node).length) {
      pulse(node, t);
      wake(PULSE + 0.1);
      return;
    }
    if (reduced.matches) {
      // No packets to watch: the signal lands everywhere it would have gone, at once.
      const seen = new Set([node]);
      let frontier = [node];
      while (frontier.length) {
        const next: string[] = [];
        for (const id of frontier) {
          let out = outOf(id);
          if (options.fanout === "one" && out.length) {
            const i = turn.get(id) ?? 0;
            turn.set(id, i + 1);
            out = [out[i % out.length]];
          }
          for (const wire of out) {
            pulse(wire.trace.to, t);
            arrive(wire.trace.to, id);
            if (!seen.has(wire.trace.to)) {
              seen.add(wire.trace.to);
              next.push(wire.trace.to);
            }
          }
        }
        frontier = next;
      }
      wake(PULSE + 0.1);
      return;
    }
    emit(node, t, 0, 0);
    wake();
  }

  /* frame */

  function frame(ms: number) {
    raf = 0;
    const t = ms / 1000;
    // Back from a hidden tab or off screen: pause time instead of replaying it.
    if (last && t - last > 0.25) {
      const skip = t - last - 1 / 60;
      for (const p of packets) p.t0 += skip;
      nextAt.forEach((at, id) => nextAt.set(id, at + skip));
      for (const w of wires) if (w.drawFrom > 0) w.drawFrom += skip;
    }
    last = t;

    if (measure() || !routed) reroute(t);
    const motion = !reduced.matches;
    let busy = false;

    for (const wire of wires) {
      const s = wire.shape;
      if (!s) continue;
      // Draw-in.
      const p = motion ? Math.min(1, Math.max(0, (t - wire.drawFrom) / 0.7)) : 1;
      if (p < 1) {
        busy = true;
        wire.track.setAttribute("stroke-dasharray", `${s.length} ${s.length + 1}`);
        wire.track.setAttribute("stroke-dashoffset", String(s.length * (1 - ease(p))));
      } else if (wire.track.hasAttribute("stroke-dasharray")) {
        wire.track.removeAttribute("stroke-dasharray");
        wire.track.removeAttribute("stroke-dashoffset");
      }
      const pinsOn = options?.pins ? 1 : 0;
      wire.pins[0].setAttribute("opacity", String(pinsOn * Math.min(1, p * 4)));
      wire.pins[1].setAttribute("opacity", String(pinsOn * Math.max(0, p * 4 - 3)));
      // Landing flash on the pin.
      const f = (t - wire.flashAt) / 0.6;
      if (f >= 0 && f < 1) {
        busy = true;
        wire.flash.setAttribute("opacity", String(pinsOn * (1 - f)));
        wire.flash.setAttribute("r", String(2.75 + 3 * ease(f)));
      } else wire.flash.setAttribute("opacity", "0");
    }

    if (motion && options) {
      // Sources send on their own once their traces are drawn.
      if (options.autoPlay) {
        const sources = sourceList();
        sources.forEach((id, i) => {
          const ready = Math.max(...outOf(id).map((w) => w.drawFrom + 0.7));
          if (!nextAt.has(id)) nextAt.set(id, ready + (i * options!.interval) / sources.length);
          let at = nextAt.get(id)!;
          if (t >= at) {
            emit(id, at, 0, 0);
            at = Math.max(at + options!.interval * (0.85 + Math.random() * 0.3), t);
            nextAt.set(id, at);
          }
        });
        busy = busy || sources.length > 0;
      }
      drawPackets(t);
      busy = busy || packets.length > 0;
    } else {
      packets = [];
      drawPackets(t);
    }

    pulses.forEach((until, id) => {
      if (t < until) {
        busy = true;
        return;
      }
      nodes.get(id)?.removeAttribute("data-circuit-pulse");
      pulses.delete(id);
    });

    if (visible && (busy || t < wakeUntil)) raf = requestAnimationFrame(frame);
    else last = 0;
  }

  function sourceList() {
    const fed = new Set(wires.filter(live).map((w) => w.trace.to));
    const senders = [...new Set(wires.filter(live).map((w) => w.trace.from))];
    const sources = senders.filter((id) => !fed.has(id));
    return sources.length ? sources : senders.slice(0, 1);
  }

  function drawPackets(t: number) {
    const used = new Map<Wire, number>();
    const keep: Packet[] = [];
    for (const p of packets) {
      const s = p.wire.shape;
      if (!s) continue;
      const k = (t - p.t0) / p.duration;
      if (k < 0) {
        keep.push(p);
        continue;
      }
      const length = s.length;
      const tail = Math.min(TAIL, length * 0.6);
      // The head eases to the far pin, then the tail drains into the card at full speed.
      const head = k <= 1 ? length * ease(k) : length + (k - 1) * p.duration * (options?.speed ?? 260);
      if (k >= 1 && !p.arrived) {
        p.arrived = true;
        land(p.wire, t, p.hops);
      }
      if (head - tail >= length) continue;
      keep.push(p);
      const slotIndex = used.get(p.wire) ?? 0;
      used.set(p.wire, slotIndex + 1);
      const slot = p.wire.slots[slotIndex];
      if (!slot) continue;
      const from = Math.max(0, head - tail);
      const to = Math.min(head, length);
      const dash = (start: number, end: number, path: SVGPathElement) => {
        path.setAttribute("stroke-dasharray", `${Math.max(0, end - start)} ${length + TAIL * 2}`);
        path.setAttribute("stroke-dashoffset", String(-start));
        path.setAttribute("opacity", end - start > 0.5 ? "1" : "0");
      };
      dash(from, to, slot.glow);
      dash(from, to, slot.body);
      dash(Math.max(from, head - tail * 0.35), to, slot.core);
      const at = pointAt(s, to);
      const fade = head > length ? Math.max(0, 1 - (head - length) / (tail * 0.5)) : Math.min(1, head / 8);
      for (const dot of [slot.head, slot.halo]) {
        dot.setAttribute("cx", String(at.x));
        dot.setAttribute("cy", String(at.y));
        dot.setAttribute("opacity", String(fade));
      }
    }
    packets = keep;
    for (const wire of wires) {
      for (let i = used.get(wire) ?? 0; i < SLOTS; i++) {
        const slot = wire.slots[i];
        for (const part of [slot.glow, slot.body, slot.core, slot.head, slot.halo]) part.setAttribute("opacity", "0");
      }
    }
  }

  function wake(seconds = 1) {
    wakeUntil = Math.max(wakeUntil, now() + seconds);
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }

  /* highlight */

  function applyHighlight() {
    const mode = options?.highlight ?? "path";
    const lit = new Set<Wire>();
    const linked = new Set<string>();
    if (active && mode !== "none") {
      linked.add(active);
      const walk = (forward: boolean) => {
        let frontier = [active!];
        const seen = new Set(frontier);
        while (frontier.length) {
          const next: string[] = [];
          for (const wire of wires) {
            const [here, there] = forward ? [wire.trace.from, wire.trace.to] : [wire.trace.to, wire.trace.from];
            if (!frontier.includes(here)) continue;
            lit.add(wire);
            linked.add(there);
            if (!seen.has(there) && mode === "path") {
              seen.add(there);
              next.push(there);
            }
          }
          frontier = next;
        }
      };
      walk(true);
      walk(false);
    }
    for (const wire of wires) {
      wire.group.style.opacity = active && mode !== "none" && !lit.has(wire) ? "0.25" : "";
      wire.lit.setAttribute("opacity", lit.has(wire) ? "0.5" : "0");
    }
    nodes.forEach((node, id) => {
      if (!active || mode === "none") node.removeAttribute("data-circuit-state");
      else node.setAttribute("data-circuit-state", id === active ? "active" : linked.has(id) ? "linked" : "dimmed");
    });
  }

  function setActive(node: string | null) {
    window.clearTimeout(clearTimer);
    if (node === null) {
      // A short grace period, so crossing the gap between two cards doesn't flash everything back.
      clearTimer = window.setTimeout(() => {
        active = null;
        applyHighlight();
      }, 90);
      return;
    }
    if (node === active) return;
    active = node;
    applyHighlight();
    if (now() - (lastSent.get(node) ?? -Infinity) > 0.6) send(node);
  }

  function nodeOf(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;
    const element = target.closest<HTMLElement>("[data-circuit]");
    const id = element?.dataset.circuit;
    return id && nodes.get(id) === element ? id : null;
  }

  const onOver = (e: PointerEvent) => {
    if (e.pointerType !== "touch") setActive(nodeOf(e.target));
  };
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType !== "touch") setActive(null);
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    const node = root.contains(e.target as Node) ? nodeOf(e.target) : null;
    if (node && node === active) setActive(null);
    else setActive(node);
  };
  const onFocusIn = (e: FocusEvent) => {
    const node = nodeOf(e.target);
    if (node) setActive(node);
  };
  const onFocusOut = (e: FocusEvent) => {
    if (!nodeOf(e.relatedTarget)) setActive(null);
  };

  /* observers */

  const resize = new ResizeObserver(() => wake());
  const mutations = new MutationObserver((records) => {
    if (records.some((r) => !layer.contains(r.target) && r.target !== layer)) scan();
  });
  mutations.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-circuit"] });
  const sight = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
  });
  sight.observe(root);
  const onAnyChange = () => wake();
  root.addEventListener("transitionrun", onAnyChange);
  root.addEventListener("animationstart", onAnyChange);
  root.addEventListener("pointerover", onOver);
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  document.addEventListener("pointerdown", onDown);
  window.addEventListener("resize", onAnyChange);
  reduced.addEventListener("change", onAnyChange);
  document.fonts?.ready.then(() => wake());

  scan();

  return {
    configure(next) {
      const key = JSON.stringify(next.flow);
      const restyle = !options || options.trace !== next.trace || options.packet !== next.packet;
      const reshape = options && (options.radius !== next.radius || options.pinSpacing !== next.pinSpacing);
      options = next;
      if (key !== flowKey || restyle) {
        flowKey = key;
        traces = parseFlow(next.flow);
        routed = false;
        rebuild();
      } else if (reshape) {
        routed = false;
      }
      if (!next.autoPlay) nextAt.clear();
      applyHighlight();
      wake();
    },
    send,
    destroy() {
      cancelAnimationFrame(raf);
      window.clearTimeout(clearTimer);
      resize.disconnect();
      mutations.disconnect();
      sight.disconnect();
      root.removeEventListener("transitionrun", onAnyChange);
      root.removeEventListener("animationstart", onAnyChange);
      root.removeEventListener("pointerover", onOver);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onAnyChange);
      reduced.removeEventListener("change", onAnyChange);
      nodes.forEach((node) => {
        node.removeAttribute("data-circuit-state");
        node.removeAttribute("data-circuit-pulse");
      });
      layer.replaceChildren();
    },
  };
}
