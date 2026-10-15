/* eslint-disable @typescript-eslint/ban-ts-comment -- see the note below */
// @ts-nocheck: vendored from the @keyframeui registry, which is written
// without `noUncheckedIndexedAccess`; all the errors it raises under this
// project's tsconfig come from that setting (unchecked array indexing).
// Update with `npx shadcn@latest add @keyframeui/<name>`, not by hand.
"use client";

import * as React from "react";
import {
  animate,
  cancelFrame,
  cubicBezier,
  frame,
  motionValue,
  useScroll,
  useSpring,
  type MotionValue,
} from "motion/react";

import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────
 * EXPLODED UI STORYBOARD   (driven by scroll progress, not time)
 *
 *     0%   the section sticks with the screenshot centered.
 *          It's plain, flat HTML: no 3D, pin-sharp
 *  15→35%  the plane tilts back and turns, still one piece,
 *          and shrinks to make room for the stack. A faint
 *          grid floor fades in under it
 *  32→55%  the layers lift off top first, each gap opening
 *          before the one beneath it has finished, so the
 *          stack peels apart in one motion. Each layer casts
 *          a shadow that softens as its gap widens. Leaders
 *          draw out from the layers, then the labels fade in
 *  56→85%  walkthrough: one layer at a time lifts a little
 *          further while the rest fade back, and its label
 *          opens to show its description. Layers above it
 *          fade out to their outlines, so it's never covered
 *  85→97%  the gaps close bottom first, the plane tilts flat
 *          and lands exactly where it started
 *    100%  the section unsticks and the page carries on
 *
 *  Scrolling up plays it backwards. end="exploded" gives the
 *  walkthrough the rest of the scroll and leaves the stack
 *  open. While it's open, hovering a layer or its label does
 *  what the walkthrough does, and the pointer turns the stack
 *  a few degrees.
 *
 *  Every frame is one pose: the plane's angle, scale and
 *  offset, and each layer's height. The layers are drawn
 *  from it in 3D, and the labels from the same pose projected
 *  flat, so they stay on their layers and never skew or blur.
 * ───────────────────────────────────────────────────────── */

const EXPLODE = {
  back: 50, // degrees the plane tilts away, by default
  turn: -30, // degrees it turns on the page before it tilts, by default
  spread: 0.12, // gap between layers, as a share of the plane's width
  scale: 0.85, // the largest the tilted plane gets, as a share of its size
  overlap: 0.55, // share of each gap's opening that overlaps the next one's
  lift: 0.35, // how much higher the active layer rises, in gaps
  // How much the other layers fade while one is active. Those above it are
  // in the way, so they fade out entirely and leave their outline.
  fade: { below: 0.65, above: 1 },
  pointer: 4, // degrees the pointer turns the open stack, either way
  perspective: 3, // perspective distance, in plane widths
  floor: 0.6, // how far the grid floor sits under the base, in gaps
  narrow: 640, // px: narrower stages get numbered labels and a gentler tilt
  gentle: 0.8, // share of the tilt kept on narrow stages
  ease: cubicBezier(0.65, 0, 0.35, 1), // each beat's pace
};

// Where each beat sits, as shares of the time the section is stuck.
const BEATS = {
  tilt: [0.15, 0.35],
  explode: [0.32, 0.55],
  tour: [0.56, 0.85],
  collapse: [0.85, 0.93],
  flatten: [0.9, 0.97],
} as const;

// With end="exploded", the walkthrough takes the rest of the scroll.
const OPEN_TOUR = [0.56, 0.95] as const;

const SCROLL_SPRING = { stiffness: 120, damping: 30, mass: 0.4 };
const POINTER_SPRING = { stiffness: 70, damping: 18, mass: 1 };
const LIFT_SPRING = { type: "spring", visualDuration: 0.45, bounce: 0.2 } as const;
const DIM_SPRING = { type: "spring", visualDuration: 0.35, bounce: 0 } as const;

const LABEL = {
  leader: 40, // px from the furthest anchor to the label column
  knee: 16, // px before the column where a leader bends toward its label
  gap: 10, // px kept between labels
  dim: 0.6, // how much the other labels fade while one is active
  pad: 20, // px the stack and labels keep from the stage's edges
};

// A layer fills the plane unless its classes place or size it.
const PLACED = /(?:^|\s|:)-?(?:inset|top|right|bottom|left|start|end|w|h|size)-/;

export interface ExplodedUILayerProps {
  /** Shown beside the layer once the stack is open. Layers without one aren't labeled or visited by the walkthrough. */
  label?: React.ReactNode;
  /** One line about the layer, shown while it's active. */
  description?: React.ReactNode;
  /** Places and sizes the layer on the plane, like `left-0 top-0 h-full w-[22%]`. Without any, it fills the plane. */
  className?: string;
  /** Drops the sheet: no clipping, edges or shadow. For floating pieces like a cursor. */
  bare?: boolean;
  children?: React.ReactNode;
}

/** One layer of the stack. Its place among its siblings sets its depth: the first is the bottom. */
export function ExplodedUILayer(props: ExplodedUILayerProps): React.ReactElement | null {
  void props; // ExplodedUI reads the props and draws the layer itself.
  return null;
}

export interface ExplodedUIProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** The layers, as `ExplodedUI.Layer`s. The first child is the bottom of the stack. */
  children: React.ReactNode;
  /** Step through the labeled layers one at a time once the stack is open. */
  walkthrough?: boolean;
  /** The viewing angle once tilted, in degrees. `back` tilts the plane away; `turn` turns it on the page first. */
  tilt?: { back?: number; turn?: number };
  /** Gap between layers once open, as a share of the plane's width. */
  spread?: number;
  /** How long the section stays stuck, in stage heights. Defaults to 3, or 4 with a walkthrough. */
  scrollLength?: number;
  /** Land back as the flat screenshot, or stay open as the section scrolls away. */
  end?: "assembled" | "exploded";
  /** Labels beside the stack, numbered markers with a list below it, or none. Side labels become numbered on narrow stages. */
  labels?: "side" | "numbered" | false;
  /** Hover or focus to highlight a layer, and let the pointer turn the open stack. */
  interactive?: boolean;
  /** Called with a layer's index as the walkthrough reaches it, and with null as it leaves the layers. */
  onLayerChange?: (index: number | null) => void;
  /**
   * Scroll container to track. Defaults to the window. The container must be
   * positioned (e.g. `relative`), or scroll progress is measured from the page.
   */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Classes for the stuck stage. Set its height and background here. */
  stageClassName?: string;
  /** Classes for the plane: the screenshot's box. Size it here. */
  className?: string;
}

type Box = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };
type Pose = {
  back: number;
  turn: number;
  /** The pointer's turn, in degrees. */
  px: number;
  py: number;
  scale: number;
  /** Screen offset, in px. */
  tx: number;
  ty: number;
  /** How far the stack sinks so it stays centered on its middle, in px. */
  sink: number;
};

/** Everything measured: redone on resize, read every frame. */
type Geometry = {
  stage: { w: number; h: number };
  plane: Box;
  boxes: Box[];
  gap: number;
  depth: number;
  back: number;
  turn: number;
  /** The tilted plane's scale and offset, so the open stack and its labels fit the stage. */
  fit: { scale: number; tx: number; ty: number };
  /** Where each label's leader or marker attaches, on its layer. */
  anchors: Point[];
  /** Labeled layers, top to bottom on screen. */
  order: number[];
  /** Where the numbered list starts, under the open stack. */
  listTop: number;
  labels: { title: number; desc: number }[];
  /** The numbered markers' size, in px. */
  marker: number;
  shadows: { on: number; from: number; contact: HTMLElement; soft: HTMLElement }[];
};

/** What the pointer needs from the last frame. */
type Live = { pose: Pose; heights: number[]; open: boolean };

function ExplodedUIRoot({
  children,
  walkthrough = false,
  tilt,
  spread = EXPLODE.spread,
  scrollLength = walkthrough ? 4 : 3,
  end = "assembled",
  labels = "side",
  interactive = true,
  onLayerChange,
  containerRef,
  stageClassName,
  className,
  ...props
}: ExplodedUIProps) {
  const still = usePrefersReducedMotion();
  const layers = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<ExplodedUILayerProps> => React.isValidElement(child),
  );
  const count = layers.length;
  const labeled = layers.flatMap((layer, i) => (layer.props.label ? [i] : []));
  const labeledKey = labeled.join(",");
  const bareKey = layers.map((layer) => (layer.props.bare ? 1 : 0)).join("");
  const back = tilt?.back ?? EXPLODE.back;
  const turn = tilt?.turn ?? EXPLODE.turn;

  const sectionRef = React.useRef<HTMLElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const planeRef = React.useRef<HTMLDivElement>(null);
  const rigRef = React.useRef<HTMLDivElement>(null);
  const floorRef = React.useRef<HTMLDivElement>(null);
  const floorShadowRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const layerEls = React.useRef<(HTMLDivElement | null)[]>([]);
  const edgeEls = React.useRef<(HTMLSpanElement | null)[]>([]);
  const outlineEls = React.useRef<(HTMLSpanElement | null)[]>([]);
  const shadowEls = React.useRef(new Map<string, HTMLSpanElement>());
  const labelEls = React.useRef<(HTMLElement | null)[]>([]);
  const titleEls = React.useRef<(HTMLElement | null)[]>([]);
  const descEls = React.useRef<(HTMLElement | null)[]>([]);
  const lineEls = React.useRef<(SVGPolylineElement | null)[]>([]);
  const dotEls = React.useRef<(SVGCircleElement | null)[]>([]);
  const markerEls = React.useRef<(HTMLElement | null)[]>([]);
  const geoRef = React.useRef<Geometry | null>(null);
  const liveRef = React.useRef<Live | null>(null);
  const onLayerChangeRef = React.useRef(onLayerChange);
  const tourRef = React.useRef<number | null>(null);

  const [narrow, setNarrow] = React.useState(false);
  const [stageHeight, setStageHeight] = React.useState(0);
  const [tour, setTour] = React.useState<number | null>(null);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const [pointed, setPointed] = React.useState<number | null>(null);
  const [pinned, setPinned] = React.useState<number | null>(null);
  const active = interactive ? (pointed ?? hovered ?? pinned ?? tour) : tour;
  const mode = labels === "side" && narrow ? "numbered" : labels;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    container: containerRef,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, SCROLL_SPRING);
  const turnX = useSpring(0, POINTER_SPRING);
  const turnY = useSpring(0, POINTER_SPRING);
  // Per layer: how far it has risen as the active one, how much it has faded,
  // and how far it has turned into its outline above the active one.
  const focus = React.useMemo(
    () =>
      Array.from({ length: count }, () => ({
        lift: motionValue(0),
        dim: motionValue(0),
        ghost: motionValue(0),
      })),
    [count],
  );

  React.useEffect(() => {
    onLayerChangeRef.current = onLayerChange;
  });

  React.useEffect(() => {
    focus.forEach(({ lift, dim, ghost }, i) => {
      const above = active !== null && i > active;
      animate(lift, !still && active === i ? 1 : 0, LIFT_SPRING);
      animate(dim, active === null || active === i ? 0 : above ? EXPLODE.fade.above : EXPLODE.fade.below, DIM_SPRING);
      animate(ghost, above ? 1 : 0, DIM_SPRING);
    });
  }, [active, focus, still]);

  React.useLayoutEffect(() => {
    const stage = stageRef.current;
    const plane = planeRef.current;
    const rig = rigRef.current;
    if (!stage || !plane || !rig || !count) return;

    const marked = labeledKey ? labeledKey.split(",").map(Number) : [];
    const tourRange = end === "assembled" ? BEATS.tour : OPEN_TOUR;
    const gaps = new Array<number>(count).fill(0);
    const heights = new Array<number>(count).fill(0);
    let wasOpen = false;

    const measure = () => {
      const stageBox = stage.getBoundingClientRect();
      const planeBox = plane.getBoundingClientRect();
      const w = plane.offsetWidth;
      const h = plane.offsetHeight;
      if (!w || !h) return;

      const isNarrow = stageBox.width < EXPLODE.narrow;
      setNarrow(isNarrow);
      setStageHeight(stage.offsetHeight);
      // The other kind of labels renders first, then this runs again.
      if ((labels === "side" && isNarrow ? "numbered" : labels) !== mode) return;

      const gentle = isNarrow ? EXPLODE.gentle : 1;
      const boxes = Array.from({ length: count }, (_, i) => {
        const el = layerEls.current[i];
        return el
          ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
          : { x: 0, y: 0, w, h };
      });
      const sizes = Array.from({ length: count }, (_, i) => ({
        title: titleEls.current[i]?.offsetHeight ?? 0,
        desc: descEls.current[i]?.offsetHeight ?? 0,
        w: Math.max(titleEls.current[i]?.offsetWidth ?? 0, descEls.current[i]?.offsetWidth ?? 0),
      }));
      const widest = Math.max(0, ...marked.map((i) => sizes[i].w));

      const geo: Geometry = {
        stage: { w: stage.offsetWidth, h: stage.offsetHeight },
        plane: { x: planeBox.left - stageBox.left, y: planeBox.top - stageBox.top, w, h },
        boxes,
        gap: spread * w,
        depth: EXPLODE.perspective * Math.max(w, h),
        back: back * gentle,
        turn: turn * gentle,
        fit: { scale: 1, tx: 0, ty: 0 },
        anchors: [],
        order: [],
        listTop: 0,
        labels: sizes,
        marker: markerEls.current[marked[0]]?.offsetWidth ?? 0,
        shadows: [],
      };
      fitStack(geo, {
        kind: mode === "numbered" ? "numbered" : "side",
        side: mode === "side" ? LABEL.leader + widest : 0,
        below: mode === "numbered" ? (listRef.current?.offsetHeight ?? 0) : 0,
        marked,
      });
      if (listRef.current) listRef.current.style.top = `${geo.listTop}px`;

      // Each layer's shadow falls on every sheet under it, clipped to that sheet.
      for (const [key, el] of shadowEls.current) {
        const [on, from, kind] = key.split(":");
        const a = boxes[Number(on)];
        const b = boxes[Number(from)];
        const overlaps = b.x < a.x + a.w && a.x < b.x + b.w && b.y < a.y + a.h && a.y < b.y + b.h;
        el.style.display = overlaps ? "" : "none";
        if (!overlaps) continue;
        el.style.left = `${b.x - a.x}px`;
        el.style.top = `${b.y - a.y}px`;
        el.style.width = `${b.w}px`;
        el.style.height = `${b.h}px`;
        el.style.filter = `blur(${(kind === "contact" ? 0.004 : 0.02) * w}px)`;
        if (kind === "soft") {
          const contact = shadowEls.current.get(`${on}:${from}:contact`);
          if (contact) geo.shadows.push({ on: Number(on), from: Number(from), contact, soft: el });
        }
      }
      if (floorShadowRef.current) floorShadowRef.current.style.filter = `blur(${0.04 * w}px)`;

      // Outlines sit beside their layers, not in them, so they stay when the
      // layer and anything styled on it fade out.
      boxes.forEach((box, i) => {
        const outline = outlineEls.current[i];
        const layer = layerEls.current[i];
        if (!outline || !layer) return;
        outline.style.left = `${box.x}px`;
        outline.style.top = `${box.y}px`;
        outline.style.width = `${box.w}px`;
        outline.style.height = `${box.h}px`;
        outline.style.borderRadius = getComputedStyle(layer).borderRadius;
      });

      geoRef.current = geo;
      schedule();
    };

    const update = () => {
      const g = geoRef.current;
      if (!g) return;
      const p = progress.get();

      // How tilted the plane is, and how open each gap is.
      let tilted = 1;
      if (still) {
        gaps.fill(1);
        gaps[0] = 0;
      } else {
        tilted = EXPLODE.ease(segment(p, BEATS.tilt));
        if (end === "assembled") tilted *= 1 - EXPLODE.ease(segment(p, BEATS.flatten));
        openGaps(p, end, gaps);
      }
      let rise = 0;
      for (let i = 0; i < count; i++) {
        rise += gaps[i] * g.gap;
        heights[i] = rise;
      }
      // Open is the last gap to open and the first to close.
      const open = count > 1 ? gaps[1] : tilted;
      const pose: Pose = {
        back: g.back * tilted,
        turn: g.turn * tilted,
        px: turnX.get() * open,
        py: turnY.get() * open,
        scale: 1 + (g.fit.scale - 1) * tilted,
        tx: g.fit.tx * tilted,
        ty: g.fit.ty * tilted,
        sink: heights[count - 1] / 2,
      };
      const isOpen = still || (tilted > 0.98 && open > 0.98);
      liveRef.current = { pose, heights: heights.slice(), open: isOpen };

      // The walkthrough's layer.
      let nextTour: number | null = null;
      if (walkthrough && !still && marked.length) {
        const u = (p - tourRange[0]) / (tourRange[1] - tourRange[0]);
        if (u >= 0 && u < 1) nextTour = marked[Math.floor(u * marked.length)];
      }
      if (nextTour !== tourRef.current) {
        tourRef.current = nextTour;
        setTour(nextTour);
        // Scrolling takes over from the pointer.
        setHovered(null);
        setPinned(null);
        onLayerChangeRef.current?.(nextTour);
      }
      // Closing the stack lets go of anything the pointer picked.
      if (wasOpen && !isOpen) {
        setHovered(null);
        setPinned(null);
        setPointed(null);
      }
      wasOpen = isOpen;

      // Flat and still, nothing is 3D, so the text renders pin-sharp.
      const z = heights.map((rest, i) => rest + focus[i].lift.get() * EXPLODE.lift * g.gap);
      const flat = tilted === 0 && z.every((v) => v === 0);
      rig.style.transform = flat ? "none" : rigTransform(pose);
      plane.style.perspective = flat ? "" : `${g.depth}px`;

      for (let i = 0; i < count; i++) {
        const el = layerEls.current[i];
        if (!el) continue;
        el.style.transform = flat ? "none" : `translateZ(${z[i]}px)`;
        const fade = 1 - focus[i].dim.get();
        el.style.opacity = fade < 1 ? String(fade) : "";
        const outline = outlineEls.current[i];
        if (outline) {
          outline.style.transform = flat ? "none" : `translateZ(${z[i]}px)`;
          outline.style.opacity = String(focus[i].ghost.get());
        }
        const edge = edgeEls.current[i];
        if (edge) edge.style.opacity = String(i === 0 ? tilted : Math.min(1, gaps[i] * 2));
      }

      // A shadow starts crisp and dark, then spreads and fades as its gap
      // widens. A layer fading back casts a fainter one.
      for (const { on, from, contact, soft } of g.shadows) {
        const lift = (z[from] - z[on]) / g.gap;
        const cast = 1 - focus[from].dim.get();
        contact.style.opacity = String(cast * 0.22 * smooth(0, 0.15, lift) * (1 - smooth(0.2, 1, lift)));
        soft.style.opacity = String((cast * 0.13 * smooth(0.05, 0.8, lift)) / (1 + 0.5 * Math.max(0, lift - 1)));
        soft.style.transform = `translate(${0.04 * lift * g.gap}px, ${0.16 * lift * g.gap}px) scale(${1 + 0.02 * lift})`;
      }

      const floor = floorRef.current;
      if (floor) {
        floor.style.opacity = String(tilted);
        floor.style.visibility = tilted > 0 ? "visible" : "hidden";
        floor.style.transform = `translateZ(${-EXPLODE.floor * g.gap}px)`;
      }
      if (floorShadowRef.current) {
        floorShadowRef.current.style.opacity = String(open * (1 - focus[0].dim.get()));
      }

      if (mode) drawLabels(g, pose, z, gaps, tilted);
    };

    const drawLabels = (g: Geometry, pose: Pose, z: number[], gaps: number[], tilted: number) => {
      const project = projector(pose, g);
      const at = (i: number) => {
        const a = project(g.anchors[i].x, g.anchors[i].y, z[i]);
        return { x: a.x + g.plane.x, y: a.y + g.plane.y };
      };
      // A label shows up as its layer lifts off; the base's, as the last gap opens.
      const reveal = (i: number) =>
        still ? 1 : count > 1 ? smooth(i === 0 ? 0.6 : 0.3, 1, gaps[Math.max(1, i)]) : tilted;

      if (mode === "numbered") {
        for (const i of g.order) {
          const marker = markerEls.current[i];
          if (!marker) continue;
          const a = at(i);
          const r = reveal(i);
          const size = g.marker;
          marker.style.visibility = r > 0 ? "visible" : "hidden";
          marker.style.opacity = String(r * (1 - LABEL.dim * dimmed(focus[i].dim.get())));
          marker.style.transform = `translate3d(${Math.round(a.x - size / 2)}px, ${Math.round(a.y - size / 2)}px, 0) scale(${0.6 + 0.4 * r + 0.15 * clamp01(focus[i].lift.get())})`;
          const chip = labelEls.current[i];
          if (chip) {
            chip.style.visibility = r > 0 ? "visible" : "hidden";
            chip.style.opacity = String(r);
          }
        }
        return;
      }

      const anchors = g.order.map(at);
      const column = Math.max(...anchors.map((a) => a.x)) + LABEL.leader;
      const items = g.order.map((i, k) => {
        const open = still ? 1 : clamp01(focus[i].lift.get());
        return {
          i,
          anchor: anchors[k],
          open,
          top: anchors[k].y - g.labels[i].title / 2,
          height: g.labels[i].title + (g.labels[i].desc + 4) * open,
          weight: 1 + 4 * open,
        };
      });
      stack(items, LABEL.pad, g.stage.h - LABEL.pad);

      for (const { i, anchor, open, top } of items) {
        const label = labelEls.current[i];
        const line = lineEls.current[i];
        const dot = dotEls.current[i];
        const r = reveal(i);
        const drawn = clamp01(r / 0.6);
        const shown = smooth(0.45, 1, r);
        const fade = 1 - LABEL.dim * dimmed(focus[i].dim.get());
        const y = top + g.labels[i].title / 2;
        if (label) {
          label.style.visibility = shown > 0 ? "visible" : "hidden";
          label.style.opacity = String(shown * fade);
          label.style.transform = `translate3d(${Math.round(column + 8 * (shown - 1))}px, ${Math.round(top)}px, 0)`;
          const desc = descEls.current[i];
          if (desc) {
            desc.style.opacity = String(open);
            desc.style.transform = `translateY(${(open - 1) * 4}px)`;
          }
        }
        if (line) {
          line.style.opacity = String(fade);
          line.setAttribute(
            "points",
            leader(
              [anchor, { x: column - LABEL.knee, y: anchor.y }, { x: column - 6, y }],
              drawn,
            ),
          );
        }
        if (dot) {
          dot.style.opacity = String(fade * Math.min(1, drawn * 3));
          dot.style.transform = `translate(${anchor.x}px, ${anchor.y}px) scale(${Math.min(1, drawn * 3) * (1 + 0.5 * open)})`;
        }
      }
    };

    const schedule = () => frame.render(update);
    measure();

    const unsubscribe = [progress, turnX, turnY, ...focus.flatMap((f) => [f.lift, f.dim, f.ghost])].map(
      (value: MotionValue<number>) => value.on("change", schedule),
    );
    const observer = new ResizeObserver(measure);
    const watched = [
      stage,
      plane,
      listRef.current,
      ...layerEls.current,
      ...titleEls.current,
      ...descEls.current,
    ];
    for (const el of watched) if (el) observer.observe(el);

    return () => {
      unsubscribe.forEach((stop) => stop());
      observer.disconnect();
      cancelFrame(update);
    };
  }, [
    back,
    bareKey,
    count,
    end,
    focus,
    labeledKey,
    labels,
    mode,
    progress,
    spread,
    still,
    turn,
    turnX,
    turnY,
    walkthrough,
  ]);

  // The pointer turns the open stack, and hovering a layer highlights it.
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || event.pointerType !== "mouse") return;
    const stage = stageRef.current;
    const g = geoRef.current;
    const live = liveRef.current;
    if (!stage || !g || !live) return;
    const box = stage.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    if (!still) {
      turnY.set((x / box.width - 0.5) * 2 * EXPLODE.pointer);
      turnX.set((0.5 - y / box.height) * 2 * EXPLODE.pointer);
    }
    if (!live.open) return;
    // Hit-tested where the layers rest, without their hover lift, so a layer
    // rising never slips out from under the pointer and drops back.
    const project = projector(live.pose, g);
    let hit: number | null = null;
    for (let i = count - 1; i >= 0; i--) {
      const b = g.boxes[i];
      const corners = [
        [b.x, b.y],
        [b.x + b.w, b.y],
        [b.x + b.w, b.y + b.h],
        [b.x, b.y + b.h],
      ].map(([cx, cy]) => {
        const p = project(cx, cy, live.heights[i]);
        return { x: p.x + g.plane.x, y: p.y + g.plane.y };
      });
      if (inside({ x, y }, corners)) {
        hit = i;
        break;
      }
    }
    setHovered(hit);
  };

  const onPointerLeave = () => {
    turnX.set(0);
    turnY.set(0);
    setHovered(null);
  };

  /** Scrolls the walkthrough to a layer, or pins it when there's no walkthrough to scroll. */
  const choose = (i: number) => {
    const section = sectionRef.current;
    if (!liveRef.current?.open) return;
    if (!walkthrough || still || !section) {
      setPinned((current) => (current === i ? null : i));
      return;
    }
    const range = end === "assembled" ? BEATS.tour : OPEN_TOUR;
    const slot = labeled.indexOf(i);
    const at = range[0] + ((slot + 0.5) / labeled.length) * (range[1] - range[0]);
    const scroller = containerRef?.current;
    const top = section.getBoundingClientRect().top - (scroller?.getBoundingClientRect().top ?? 0);
    const offset = scroller ? scroller.scrollTop : window.scrollY;
    const view = scroller ? scroller.clientHeight : window.innerHeight;
    const target = offset + top + at * (section.offsetHeight - view);
    (scroller ?? window).scrollTo({ top: target, behavior: "smooth" });
  };

  const labelHandlers = (i: number) =>
    interactive
      ? {
          onPointerEnter: () => {
            if (liveRef.current?.open) setPointed(i);
          },
          onPointerLeave: () => setPointed((current) => (current === i ? null : current)),
          onFocus: () => {
            if (liveRef.current?.open) setPointed(i);
          },
          onBlur: () => setPointed((current) => (current === i ? null : current)),
          onClick: () => choose(i),
        }
      : {};

  return (
    <section ref={sectionRef} className="relative" {...props}>
      <div
        ref={stageRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className={cn(
          "relative flex h-dvh w-full items-center justify-center overflow-hidden px-4 sm:px-6",
          !still && "sticky top-0",
          stageClassName,
        )}
      >
        <div
          ref={planeRef}
          className={cn("@container relative aspect-[16/10] w-full max-w-5xl", className)}
        >
          {/* Nothing in the stack is interactive: it's a picture of the product. */}
          <div ref={rigRef} inert className="absolute inset-0 [transform-style:preserve-3d]">
            <div ref={floorRef} aria-hidden className="pointer-events-none invisible absolute inset-0 opacity-0">
              <div className="absolute -inset-[30%] [--grid:rgb(9_9_11/0.09)] [background-image:linear-gradient(to_right,var(--grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid)_1px,transparent_1px)] [background-position:center] [background-size:5cqw_5cqw] [mask-image:radial-gradient(closest-side,#000_55%,transparent)] dark:[--grid:rgb(255_255_255/0.08)]" />
              <div
                ref={floorShadowRef}
                className="absolute inset-[4%] rounded-[8%] bg-zinc-950/15 opacity-0 dark:bg-black/60"
              />
            </div>

            {layers.map((layer, i) => {
              const { className: placement, bare, children: content } = layer.props;
              return (
                <div
                  key={layer.key ?? i}
                  ref={(el) => {
                    layerEls.current[i] = el;
                  }}
                  className={cn(
                    "absolute",
                    !(placement && PLACED.test(placement)) && "inset-0",
                    !bare && "overflow-hidden rounded-lg",
                    placement,
                  )}
                >
                  {content}
                  {/* Shadows cast on this sheet by the layers above it. */}
                  {!bare
                    ? layers.slice(i + 1).map((above, k) =>
                        above.props.bare
                          ? null
                          : (["contact", "soft"] as const).map((kind) => (
                              <span
                                key={`${i + 1 + k}:${kind}`}
                                ref={(el) => {
                                  const key = `${i}:${i + 1 + k}:${kind}`;
                                  if (el) shadowEls.current.set(key, el);
                                  else shadowEls.current.delete(key);
                                }}
                                aria-hidden
                                className="pointer-events-none absolute rounded-[inherit] bg-zinc-950 opacity-0 will-change-[opacity,transform] dark:bg-black"
                              />
                            )),
                      )
                    : null}
                  {/* The sheet's edge and the light along its top, once it's off the page. */}
                  {!bare ? (
                    <span
                      ref={(el) => {
                        edgeEls.current[i] = el;
                      }}
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 ring-1 ring-zinc-950/10 will-change-[opacity] ring-inset dark:ring-white/15"
                    >
                      <span className="absolute inset-x-[6%] top-0 h-px bg-linear-to-r from-transparent via-white to-transparent dark:via-white/40" />
                    </span>
                  ) : null}
                </div>
              );
            })}

            {/* What's left of a layer above the active one: its edge. */}
            {layers.map((layer, i) =>
              layer.props.bare ? null : (
                <span
                  key={`outline-${layer.key ?? i}`}
                  ref={(el) => {
                    outlineEls.current[i] = el;
                  }}
                  aria-hidden
                  className="pointer-events-none absolute top-0 left-0 border border-zinc-950/25 opacity-0 will-change-[opacity] dark:border-white/25"
                />
              ),
            )}
          </div>
        </div>

        {mode === "side" ? (
          <>
            <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible text-zinc-400 dark:text-zinc-500">
              {labeled.map((i) => (
                <g key={i}>
                  <polyline
                    ref={(el) => {
                      lineEls.current[i] = el;
                    }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="0 4.5"
                  />
                  <circle
                    ref={(el) => {
                      dotEls.current[i] = el;
                    }}
                    r={3}
                    className="fill-zinc-950 opacity-0 [transform-box:fill-box] [transform-origin:center] dark:fill-zinc-50"
                  />
                </g>
              ))}
            </svg>
            <ol className="pointer-events-none absolute inset-0">
              {labeled.map((i) => {
                const { label, description } = layers[i].props;
                const Tag = interactive ? "button" : "div";
                return (
                  <li
                    key={i}
                    ref={(el) => {
                      labelEls.current[i] = el;
                    }}
                    className="invisible absolute top-0 left-0 opacity-0 will-change-[transform,opacity]"
                  >
                    <Tag
                      {...(interactive ? { type: "button" as const } : {})}
                      {...labelHandlers(i)}
                      className={cn(
                        "relative -mx-2 -my-1 block rounded-md px-2 py-1 text-left outline-none",
                        interactive && "pointer-events-auto cursor-pointer focus-visible:ring-2 focus-visible:ring-zinc-950/15 dark:focus-visible:ring-white/20",
                      )}
                    >
                      <span
                        ref={(el) => {
                          titleEls.current[i] = el;
                        }}
                        className="block text-sm font-medium whitespace-nowrap text-zinc-950 dark:text-zinc-50"
                      >
                        {label}
                      </span>
                      {description ? (
                        <span
                          ref={(el) => {
                            descEls.current[i] = el;
                          }}
                          className="absolute top-full left-2 block w-max max-w-[15rem] text-[13px] leading-snug text-pretty text-zinc-500 opacity-0 dark:text-zinc-400"
                        >
                          {description}
                        </span>
                      ) : null}
                    </Tag>
                  </li>
                );
              })}
            </ol>
          </>
        ) : null}

        {mode === "numbered" ? (
          <>
            {labeled.map((i, n) => (
              <span
                key={i}
                ref={(el) => {
                  markerEls.current[i] = el;
                }}
                aria-hidden
                className="pointer-events-none invisible absolute top-0 left-0 grid size-5 place-items-center rounded-full bg-zinc-950 text-[11px] font-semibold text-white tabular-nums opacity-0 shadow-sm will-change-[transform,opacity] dark:bg-white dark:text-zinc-950"
              >
                {n + 1}
              </span>
            ))}
            <div
              ref={listRef}
              className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-2 px-4"
            >
              <ol className="flex flex-wrap justify-center gap-1">
                {labeled.map((i, n) => {
                  const { label } = layers[i].props;
                  const Tag = interactive ? "button" : "div";
                  return (
                    <li
                      key={i}
                      ref={(el) => {
                        labelEls.current[i] = el;
                      }}
                      className="invisible opacity-0"
                    >
                      <Tag
                        {...(interactive ? { type: "button" as const } : {})}
                        {...labelHandlers(i)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-[13px] font-medium whitespace-nowrap text-zinc-500 transition-colors duration-200 dark:text-zinc-400",
                          active === i && "bg-zinc-950/5 text-zinc-950 dark:bg-white/10 dark:text-zinc-50",
                          interactive && "pointer-events-auto cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 dark:focus-visible:ring-white/20",
                        )}
                      >
                        <span className="grid size-4.5 place-items-center rounded-full bg-zinc-950/10 text-[10px] font-semibold tabular-nums dark:bg-white/15">
                          {n + 1}
                        </span>
                        {label}
                      </Tag>
                    </li>
                  );
                })}
              </ol>
              <div aria-live="polite" className="grid min-h-[2lh] max-w-sm text-center text-[13px] leading-snug text-pretty text-zinc-500 dark:text-zinc-400">
                {labeled.map((i) => (
                  <p
                    key={i}
                    className={cn(
                      "col-start-1 row-start-1 transition-opacity duration-200",
                      active === i ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {layers[i].props.description}
                  </p>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
      {/* Scroll runway: the stage stays stuck while this scrolls past. */}
      {!still ? (
        <div
          aria-hidden
          style={{ height: stageHeight ? stageHeight * scrollLength : `${scrollLength * 100}dvh` }}
        />
      ) : null}
    </section>
  );
}

/**
 * A product screenshot that comes apart into its layers as you scroll,
 * explains each one, then clicks back together.
 */
export const ExplodedUI = Object.assign(ExplodedUIRoot, { Layer: ExplodedUILayer });

/** The rig's transform. `projector` below is the same thing, as math. */
function rigTransform(pose: Pose) {
  return (
    `translate3d(${pose.tx}px, ${pose.ty}px, 0) rotateX(${pose.px}deg) rotateY(${pose.py}deg) ` +
    `scale3d(${pose.scale}, ${pose.scale}, ${pose.scale}) rotateX(${pose.back}deg) ` +
    `rotateZ(${pose.turn}deg) translateZ(${-pose.sink}px)`
  );
}

/**
 * Where a point on the plane lands on screen under a pose: the rig's
 * transform, then the plane's perspective. Takes plane coordinates and a
 * layer's height; returns plane coordinates, flat.
 */
function projector(pose: Pose, g: Pick<Geometry, "plane" | "depth">) {
  const rad = Math.PI / 180;
  const sb = Math.sin(pose.back * rad);
  const cb = Math.cos(pose.back * rad);
  const st = Math.sin(pose.turn * rad);
  const ct = Math.cos(pose.turn * rad);
  const sx = Math.sin(pose.px * rad);
  const cx = Math.cos(pose.px * rad);
  const sy = Math.sin(pose.py * rad);
  const cy = Math.cos(pose.py * rad);
  const ox = g.plane.w / 2;
  const oy = g.plane.h / 2;
  return (x: number, y: number, z: number): Point => {
    let X = x - ox;
    let Y = y - oy;
    let Z = z - pose.sink;
    let t = X * ct - Y * st; // rotateZ(turn)
    Y = X * st + Y * ct;
    X = t;
    t = Y * cb - Z * sb; // rotateX(back)
    Z = Y * sb + Z * cb;
    Y = t;
    X *= pose.scale;
    Y *= pose.scale;
    Z *= pose.scale;
    t = X * cy + Z * sy; // rotateY(py)
    Z = -X * sy + Z * cy;
    X = t;
    t = Y * cx - Z * sx; // rotateX(px)
    Z = Y * sx + Z * cx;
    Y = t;
    X += pose.tx;
    Y += pose.ty;
    const k = g.depth / (g.depth - Z);
    return { x: ox + X * k, y: oy + Y * k };
  };
}

/**
 * Scales and centers the open stack so it fits the stage with its labels,
 * and picks where each label attaches. Side labels attach at the corner of
 * the layer nearest them; numbered markers sit on the layer's front edge,
 * the part of each sheet that stays in view.
 */
function fitStack(g: Geometry, room: { kind: "side" | "numbered"; side: number; below: number; marked: number[] }) {
  const n = g.boxes.length;
  const pose: Pose = {
    back: g.back,
    turn: g.turn,
    px: 0,
    py: 0,
    scale: 1,
    tx: 0,
    ty: 0,
    sink: ((n - 1) * g.gap) / 2,
  };
  const lift = EXPLODE.lift * g.gap;
  const below = room.below ? room.below + LABEL.pad : 0;
  const availW = g.stage.w - LABEL.pad * 2;
  const availH = g.stage.h - LABEL.pad * 2 - below;

  const rest = projector(pose, g);
  g.anchors = g.boxes.map((b, i) => {
    const inset = Math.min(10, b.w * 0.08, b.h * 0.08);
    const points =
      room.kind === "side"
        ? [
            [b.x + inset, b.y + inset],
            [b.x + b.w - inset, b.y + inset],
            [b.x + b.w - inset, b.y + b.h - inset],
            [b.x + inset, b.y + b.h - inset],
          ]
        : [
            [b.x + b.w / 2, b.y + inset * 2],
            [b.x + b.w - inset * 2, b.y + b.h / 2],
            [b.x + b.w / 2, b.y + b.h - inset * 2],
            [b.x + inset * 2, b.y + b.h / 2],
          ];
    // Side: the furthest right. Numbered: the lowest on screen, so the front.
    const score = ([x, y]: number[]) => {
      const p = rest(x, y, i * g.gap);
      return room.kind === "side" ? p.x : p.y;
    };
    const [x, y] = points.reduce((best, point) => (score(point) > score(best) ? point : best));
    return { x, y };
  });
  g.order = [...room.marked].sort(
    (a, b) =>
      rest(g.anchors[a].x, g.anchors[a].y, a * g.gap).y - rest(g.anchors[b].x, g.anchors[b].y, b * g.gap).y,
  );

  for (let pass = 0; pass < 3; pass++) {
    const project = projector(pose, g);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    g.boxes.forEach((b, i) => {
      // Where it rests, and raised as the active layer.
      for (const z of [i * g.gap, i * g.gap + lift]) {
        for (const [x, y] of [
          [b.x, b.y],
          [b.x + b.w, b.y],
          [b.x + b.w, b.y + b.h],
          [b.x, b.y + b.h],
        ]) {
          const p = project(x, y, z);
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }
      }
    });
    let reach = -Infinity;
    for (const i of room.marked) {
      reach = Math.max(reach, project(g.anchors[i].x, g.anchors[i].y, i * g.gap).x);
    }
    const right = room.side ? Math.max(maxX, reach + room.side) : maxX;

    if (pass === 0) {
      pose.scale = Math.max(
        0.3,
        Math.min(
          EXPLODE.scale,
          availW / (maxX - minX),
          room.side ? (availW - room.side) / (reach - minX) : Infinity,
          availH / (maxY - minY),
        ),
      );
      continue;
    }
    // Center the stack, with its labels beside it or its list under it.
    const shift = g.stage.h / 2 - g.plane.y - (minY + maxY + below) / 2;
    pose.tx += g.stage.w / 2 - g.plane.x - (minX + right) / 2;
    pose.ty += shift;
    g.listTop = g.plane.y + maxY + shift + LABEL.pad;
  }
  g.fit = { scale: pose.scale, tx: pose.tx, ty: pose.ty };
}

/** How open each gap is, 0 to 1. gaps[i] is the one under layer i, so gaps[0] stays 0. */
function openGaps(p: number, end: "assembled" | "exploded", gaps: number[]) {
  const m = gaps.length - 1;
  if (m < 1) return;
  // Each gap gets `span` of the beat, starting `step` after the one above it.
  const span = 1 / (1 + (m - 1) * (1 - EXPLODE.overlap));
  const step = span * (1 - EXPLODE.overlap);
  const opening = segment(p, BEATS.explode);
  const closing = end === "assembled" ? segment(p, BEATS.collapse) : 0;
  for (let k = 1; k <= m; k++) {
    const opened = EXPLODE.ease(clamp01((opening - (m - k) * step) / span)); // top first
    const closed = EXPLODE.ease(clamp01((closing - (k - 1) * step) / span)); // bottom first
    gaps[k] = opened * (1 - closed);
  }
}

/**
 * Spaces labels so none overlap, moving each as little as it can. An open
 * label weighs more, so its neighbors make room around it.
 */
function stack(items: { top: number; height: number; weight: number }[], min: number, max: number) {
  for (let pass = 0; pass < 6; pass++) {
    for (let k = 1; k < items.length; k++) {
      const a = items[k - 1];
      const b = items[k];
      const overlap = a.top + a.height + LABEL.gap - b.top;
      if (overlap <= 0) continue;
      const share = b.weight / (a.weight + b.weight);
      a.top -= overlap * share;
      b.top += overlap * (1 - share);
    }
  }
  // Then keep them apart, and on the stage.
  for (let k = 0; k < items.length; k++) {
    const floor = k ? items[k - 1].top + items[k - 1].height + LABEL.gap : min;
    items[k].top = Math.max(items[k].top, floor);
  }
  for (let k = items.length - 1; k >= 0; k--) {
    const ceiling = k < items.length - 1 ? items[k + 1].top - LABEL.gap : max;
    items[k].top = Math.max(min, Math.min(items[k].top, ceiling - items[k].height));
  }
}

/** The first `drawn` share of a leader, as SVG points. */
function leader(points: Point[], drawn: number) {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let left = drawn * lengths.reduce((sum, l) => sum + l, 0);
  const out = [points[0]];
  for (let i = 1; i < points.length && left > 0; i++) {
    const l = lengths[i - 1];
    const f = l > 0 ? Math.min(1, left / l) : 1;
    out.push({
      x: points[i - 1].x + (points[i].x - points[i - 1].x) * f,
      y: points[i - 1].y + (points[i].y - points[i - 1].y) * f,
    });
    left -= l;
  }
  return out.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/** Whether a point is inside a convex quad. */
function inside(p: Point, quad: Point[]) {
  let sign = 0;
  for (let i = 0; i < quad.length; i++) {
    const a = quad[i];
    const b = quad[(i + 1) % quad.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cross === 0) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

/** How far a layer has faded back, 0 to 1, whichever side of the active one it's on. */
function dimmed(fade: number) {
  return Math.min(1, fade / EXPLODE.fade.below);
}

function segment(p: number, [a, b]: readonly [number, number]) {
  return clamp01((p - a) / (b - a));
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smooth(a: number, b: number, v: number) {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Reads false on the server and while hydrating, so the markup always matches. */
function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}
