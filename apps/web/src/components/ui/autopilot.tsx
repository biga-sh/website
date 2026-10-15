"use client";

import * as React from "react";
import {
  AnimatePresence,
  animate,
  motion,
  motionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────
 * AUTOPILOT STORYBOARD
 *
 *  rest     your UI, untouched, with a cursor (or a few) at home.
 *           Each trails a pill in its own color: a name, or what
 *           it's doing right now
 *  move     it glides to the next target on a gentle arc, easing
 *           in and out: about 350ms for a hop, 900ms across the
 *           stage. Long trips overshoot a touch and correct.
 *           Targets it passes over get data-autopilot-hover
 *  click    a beat over the target, then the pointer squashes, a
 *           ring spreads from its tip and the target gets
 *           data-autopilot-press. Pointer, mouse and click events
 *           fire on the element, so the UI's own handlers run
 *  type     it clicks into the field, which shows data-autopilot-
 *           focus instead of taking real focus, eases the pointer
 *           off the line, and types at a person's uneven pace: a
 *           pause after spaces and punctuation, the odd burst
 *  drag     the item lifts with a little scale and shadow, rides
 *           the path, and settles into wherever the drop puts it.
 *           The target shows data-autopilot-drop while it's over
 *  say      the old label slides up and out as the new one comes
 *           in, and the pill's width follows
 *  yield    the visitor's pointer or focus comes in: each cursor
 *           finishes the key or click it's on, glides to the
 *           corner and fades, reading "Your turn". Two seconds
 *           after they leave it glides back and replays the
 *           chapter it was in, from its setup. On touch screens a
 *           tap takes over and Resume hands it back
 *  loop     after the last chapter the finished state holds for
 *           2s, the stage crossfades back to the start and the
 *           cursors glide home
 *  pause    off screen, in a background tab, or with the pause
 *           button. The chapter strip fills like a story timer;
 *           click a chapter to jump to it
 *  reduced  no autoplay: the first state with a Play button. When
 *           played, cursors jump between targets, with no ripple,
 *           overshoot or settle
 *
 *  Cursors move on motion values, outside React. The script is
 *  one async run that a takeover, a pause or a jump aborts; the
 *  next run waits for it to finish the action it's in.
 * ───────────────────────────────────────────────────────── */

const AUTOPILOT = {
  hop: 350, // ms to move 40px
  trip: 900, // ms to move 800px. Moves in between follow Fitts's law
  quickest: 200, // ms, the shortest move
  bow: 0.12, // how far a path bows off the straight line, as a share of its length
  overshootFrom: 240, // px; longer moves overshoot and correct
  overshoot: 0.035, // share of the distance a long move overshoots by
  overshootMax: 14, // px
  correct: 150, // ms the correction takes
  beat: 140, // ms over a target before it presses
  press: 90, // ms a button is held down
  squash: 0.84, // pointer scale while pressed
  ripple: 0.45, // s the click ring takes to spread and fade
  key: 70, // ms between keys, on average
  space: 60, // ms more after a space
  stop: 200, // ms more after punctuation
  burst: 0.15, // chance the next word comes out in a quick burst
  lift: 1.04, // scale of a dragged item
  carry: 1.2, // a drag takes this much longer than a bare move
  settle: { type: "spring", stiffness: 520, damping: 30 },
  yield: 320, // ms to glide aside when the visitor takes over
  resume: 2000, // ms after the visitor leaves before it carries on
  hold: 2000, // ms the finished state holds before the loop starts over
  fade: 0.3, // s the reset crossfade takes
  parked: 0.45, // the pointer's opacity while parked; its label stays readable
  find: 2000, // ms to wait for a target that isn't on screen yet
  label: { type: "spring", visualDuration: 0.3, bounce: 0 },
} as const;

// The pill sits under the arrow's tail, kept inside the stage.
const PILL = { x: 12, y: 20, height: 24, inset: 4 } as const;

/* ── Script ─────────────────────────────────────────────── */

export type AutopilotCursor = {
  /** Steps name their cursor with this. */
  id: string;
  /** The pill's text when the cursor isn't saying anything: a name, or "Agent". */
  label: string;
  /** The pointer's and pill's color. The pill's text is white. */
  color: string;
  /** Where it waits at the start and between loops, as fractions of the stage. Defaults to the corner it parks in. */
  home?: [number, number];
};

type StepBase = {
  /** The cursor that takes this step. Defaults to the first one. */
  cursor?: string;
  /** Changes the cursor's label as the step starts, and keeps it. `null` goes back to its name. */
  say?: string | null;
};

/** Where on the target to point, as fractions of its width and height. Defaults to near the middle. */
type Aim = { at?: [number, number] };

export type AutopilotStep = StepBase &
  (
    | ({ move: string } & Aim)
    | ({ click: string } & Aim)
    | ({ type: string; into: string } & Aim)
    | ({ drag: string; to: string; drop?: () => void } & Aim)
    | { wait: number }
    | { do: () => void | Promise<void> }
  );

export type AutopilotChapter = {
  title: string;
  /** Puts the UI in the state this chapter starts from. Runs every time the chapter starts. */
  setup?: () => void;
  steps: AutopilotStep[];
};

/* ── Motion helpers ─────────────────────────────────────── */

type Point = { x: number; y: number };
type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type Flag = "hover" | "press" | "focus" | "drag" | "drop";
type Field = HTMLInputElement | HTMLTextAreaElement;

type Rig = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  opacity: MotionValue<number>;
  rest: MotionValue<number>; // 0 → 1 as it parks
  squash: MotionValue<number>;
  ring: MotionValue<number>; // 0 → 1 as a click ring spreads
  /** Ends the glide in progress where it is. */
  stop: () => void;
  hover: Element | null;
  focus: Element | null;
  /** Where it rests, so it can follow the stage when it resizes. */
  placed: "home" | "park" | null;
};

const noop = () => {};
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const vary = (value: number, spread: number) => value * (1 - spread + Math.random() * spread * 2);

// Minimum jerk: the bell-shaped speed of a hand reaching for something.
const reach = (t: number) => t * t * t * (10 - 15 * t + 6 * t * t);
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// Move time grows with the log of the distance, through `hop` at 40px and `trip` at 800px.
const FITTS = (AUTOPILOT.trip - AUTOPILOT.hop) / Math.log2(41 / 3);
const travel = (distance: number) =>
  Math.max(AUTOPILOT.quickest, AUTOPILOT.hop + FITTS * Math.log2((1 + distance / 20) / 3));

const tip = (rig: Rig): Point => ({ x: rig.x.get(), y: rig.y.get() });
const inside = (box: Box, p: Point, inset = 2) =>
  p.x >= box.left + inset && p.x <= box.right - inset && p.y >= box.top + inset && p.y <= box.bottom - inset;

/** The control point of a path that bows toward the top left, the way a wrist swings, now and then the other way. */
function bend(from: Point, to: Point, bow: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  if (!length || !bow) return mid;
  let nx = -dy / length;
  let ny = dx / length;
  if (nx + ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const side = Math.random() < 0.2 ? -1 : 1;
  const amount = length * vary(bow, 0.35) * side * (length < 80 ? 0.5 : 1);
  return { x: mid.x + nx * amount, y: mid.y + ny * amount };
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const cancel = () => {
      window.clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", cancel);
      resolve();
    }, ms);
    signal?.addEventListener("abort", cancel, { once: true });
  });
}

function nextFrame(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const cancel = () => {
      cancelAnimationFrame(id);
      reject(signal?.reason);
    };
    const id = requestAnimationFrame(() => {
      signal?.removeEventListener("abort", cancel);
      resolve();
    });
    signal?.addEventListener("abort", cancel, { once: true });
  });
}

/**
 * Moves a cursor along a quadratic curve. Resolves when it arrives, or when
 * another glide takes over; rejects if the signal aborts first.
 */
function glide(
  rig: Rig,
  to: Point,
  ms: number,
  {
    signal,
    bow = 0,
    ease = reach,
    onFrame,
  }: {
    signal?: AbortSignal;
    bow?: number;
    ease?: ((t: number) => number) | typeof EASE_OUT;
    onFrame?: (p: Point) => void;
  } = {},
) {
  rig.stop();
  const from = tip(rig);
  const via = bend(from, to, bow);
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const settle = () => {
      signal?.removeEventListener("abort", cancel);
      rig.stop = noop;
    };
    const cancel = () => {
      controls.stop();
      settle();
      reject(signal?.reason);
    };
    const done = () => {
      settle();
      resolve();
    };
    const controls = animate(0, 1, {
      duration: Math.max(ms, 1) / 1000,
      ease,
      onUpdate: (t) => {
        const u = 1 - t;
        const p = {
          x: u * u * from.x + 2 * u * t * via.x + t * t * to.x,
          y: u * u * from.y + 2 * u * t * via.y + t * t * to.y,
        };
        rig.x.set(p.x);
        rig.y.set(p.y);
        onFrame?.(p);
      },
      onComplete: done,
    });
    rig.stop = () => {
      controls.stop();
      done();
    };
    signal?.addEventListener("abort", cancel, { once: true });
  });
}

/** Mouse and pointer events with real coordinates, so handlers that read them work. */
function fire(target: Element, type: string, at: Point) {
  const down = type.endsWith("down");
  const init = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    clientX: at.x,
    clientY: at.y,
    screenX: at.x + window.screenX,
    screenY: at.y + window.screenY,
    button: 0,
    buttons: down ? 1 : 0,
    detail: 1,
  };
  target.dispatchEvent(
    type.startsWith("pointer")
      ? new PointerEvent(type, {
          ...init,
          pointerId: 41, // not a real pointer, so it never collides with the visitor's
          pointerType: "mouse",
          isPrimary: true,
          width: 1,
          height: 1,
          pressure: down ? 0.5 : 0,
        })
      : new MouseEvent(type, init),
  );
}

const fieldIn = (element: Element): Field | null =>
  element.matches("input, textarea")
    ? (element as Field)
    : element.querySelector<Field>("input, textarea");

// React tracks an input's last value; setting it through the prototype lets onChange see the change.
function setValue(field: Field, value: string, inputType: string, data: string | null) {
  const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set?.call(field, value);
  field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType, data }));
}

function press(field: Field, key: string) {
  const init = { key, bubbles: true, cancelable: true, composed: true };
  if (field.dispatchEvent(new KeyboardEvent("keydown", init))) {
    if (key === "Backspace") setValue(field, field.value.slice(0, -1), "deleteContentBackward", null);
    else if (key !== "Enter") setValue(field, field.value + key, "insertText", key);
  }
  field.dispatchEvent(new KeyboardEvent("keyup", init));
}

const KEYS = /\{(?:Enter|Backspace)\}|[\s\S]/gu;
const keysOf = (text: string) => (text.match(KEYS) ?? []).map((key) => key.replace(/^\{(.+)\}$/, "$1"));

/** Holds a dragged item up: lifted on its own layer, out of the way of hit tests. */
function lift(element: HTMLElement) {
  const props = ["translate", "scale", "box-shadow", "z-index", "position", "pointer-events", "transition"];
  const saved = props.map((prop) => [prop, element.style.getPropertyValue(prop)] as const);
  const computed = getComputedStyle(element);
  const own = computed.boxShadow === "none" ? "" : `, ${computed.boxShadow}`;
  element.style.transition = "none";
  element.style.pointerEvents = "none";
  element.style.zIndex = "50";
  if (computed.position === "static") element.style.position = "relative";
  let offset: Point = { x: 0, y: 0 };
  let raised = 0;
  const paint = () => {
    const p = Math.max(raised, 0);
    element.style.translate = `${offset.x}px ${offset.y}px`;
    element.style.scale = `${1 + (AUTOPILOT.lift - 1) * raised}`;
    element.style.boxShadow = `0 ${16 * p}px ${32 * p}px -12px rgb(0 0 0 / ${0.3 * p}), 0 ${5 * p}px ${12 * p}px -6px rgb(0 0 0 / ${0.16 * p})${own}`;
  };
  return {
    element,
    move(x: number, y: number) {
      offset = { x, y };
      paint();
    },
    raise(p: number) {
      raised = p;
      paint();
    },
    restore() {
      for (const [prop, value] of saved) {
        if (value) element.style.setProperty(prop, value);
        else element.style.removeProperty(prop);
      }
    },
  };
}

/** A still copy of the stage laid over it, to crossfade from while the live UI resets underneath. */
function snapshot(content: HTMLElement, host: HTMLElement) {
  const copy = content.cloneNode(true) as HTMLElement; // inputs keep their values
  for (const element of [copy, ...copy.querySelectorAll("[id]")]) element.removeAttribute("id");
  copy.inert = true;
  Object.assign(copy.style, {
    position: "absolute",
    left: `${content.offsetLeft}px`,
    top: `${content.offsetTop}px`,
    width: `${content.offsetWidth}px`,
    height: `${content.offsetHeight}px`,
    margin: "0",
  });
  host.append(copy);
  return copy;
}

const warn = (message: string) => console.warn(`Autopilot: ${message}`);

/* ── The pilot ──────────────────────────────────────────── */

export type AutopilotCorner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

type PilotConfig = {
  cursors: AutopilotCursor[];
  chapters: AutopilotChapter[];
  reduced: boolean;
  loop: boolean;
  park: AutopilotCorner;
  /** Whether stopping now means the visitor took over, so the cursors step aside. */
  yielding: boolean;
  onChapterChange?: (index: number) => void;
};

/** How the pilot tells React what to show. */
type PilotUI = {
  onChapter: (index: number) => void;
  onSay: (id: string, text: string | null) => void;
  onQuiet: () => void;
  onParked: (parked: boolean) => void;
  onFinish: () => void;
};

/**
 * Everything that moves lives here, outside React: the cursors' motion
 * values, the attributes on the targets, and the run through the script.
 */
function createPilot() {
  const rigs = new Map<string, Rig>();
  const flags = new Map<Element, Map<Flag, number>>();
  const progress = motionValue(0);
  const width = motionValue(0);
  const height = motionValue(0);
  const measured: number[] = []; // how long each chapter took last time, for the strip's timer

  let config: PilotConfig = {
    cursors: [],
    chapters: [],
    reduced: false,
    loop: true,
    park: "bottom-right",
    yielding: false,
  };
  let ui: PilotUI = { onChapter: noop, onSay: noop, onQuiet: noop, onParked: noop, onFinish: noop };
  let stage: HTMLElement | null = null;
  let content: HTMLElement | null = null;
  let host: HTMLElement | null = null;
  let chapter = 0; // where the next run starts
  let pending: number | null = null; // a chapter picked from the strip
  let ended = false; // the last chapter finished, so the next run starts the loop over
  let dirty = false; // the UI may have moved on from the chapter's setup
  let parked = false;
  let actingUntil = 0;
  let fill: { stop: () => void } | null = null;
  let queue = Promise.resolve();

  const rig = (id: string) => {
    let found = rigs.get(id);
    if (!found) {
      found = {
        x: motionValue(0),
        y: motionValue(0),
        opacity: motionValue(0),
        rest: motionValue(0),
        squash: motionValue(1),
        ring: motionValue(1),
        stop: noop,
        hover: null,
        focus: null,
        placed: null,
      };
      rigs.set(id, found);
    }
    return found;
  };
  const crew = () => config.cursors.map((cursor) => rig(cursor.id));

  /* Geometry, in the stage's own px. */
  const frame = () => {
    if (!stage) return { left: 0, top: 0, k: 1 };
    const r = stage.getBoundingClientRect();
    const k = stage.offsetWidth ? r.width / stage.offsetWidth : 1;
    return { left: r.left + stage.clientLeft * k, top: r.top + stage.clientTop * k, k };
  };
  const toClient = (p: Point) => {
    const f = frame();
    return { x: f.left + p.x * f.k, y: f.top + p.y * f.k };
  };
  const boxOf = (element: Element): Box => {
    const f = frame();
    const r = element.getBoundingClientRect();
    const left = (r.left - f.left) / f.k;
    const top = (r.top - f.top) / f.k;
    const w = r.width / f.k;
    const h = r.height / f.k;
    return { left, top, right: left + w, bottom: top + h, width: w, height: h };
  };
  // Parked cursors line up from the corner inward; the first one, with the label, sits innermost on the right
  // and outermost on the left, clear of the pause button.
  const spot = (index: number): Point => {
    const [edge, side] = config.park.split("-");
    const x = side === "right" ? width.get() - 112 - index * 22 : 64 - index * 20;
    const y = edge === "top" ? 16 : height.get() - (side === "left" ? 64 : 52);
    return { x: clamp(x, 8, Math.max(8, width.get() - 8)), y: clamp(y, 8, Math.max(8, height.get() - 8)) };
  };
  const home = (index: number): Point => {
    const at = config.cursors[index]?.home;
    return at ? { x: width.get() * at[0], y: height.get() * at[1] } : spot(index);
  };

  /** Points at a target the way a hand would: near the middle, never dead center. Fields get clicked toward their start. */
  const aim = (element: Element, at?: [number, number]): Point => {
    const box = boxOf(element);
    const [fx, fy] = at ?? (element.matches("input, textarea") ? [0.22, 0.5] : [0.5, 0.52]);
    const jitter = at ? 0 : 1;
    const x = box.left + box.width * fx + jitter * (Math.random() - 0.5) * Math.min(box.width * 0.3, 12);
    const y = box.top + box.height * fy + jitter * (Math.random() - 0.5) * Math.min(box.height * 0.3, 6);
    return { x: clamp(x, box.left + 2, box.right - 2), y: clamp(y, box.top + 2, box.bottom - 2) };
  };

  /* Attributes on targets, counted so cursors sharing a target don't clear each other. */
  const flag = (element: Element | null, name: Flag, on: boolean) => {
    if (!element) return;
    const counts = flags.get(element) ?? new Map<Flag, number>();
    const n = (counts.get(name) ?? 0) + (on ? 1 : -1);
    if (n > 0) counts.set(name, n);
    else counts.delete(name);
    if (counts.size) flags.set(element, counts);
    else flags.delete(element);
    element.toggleAttribute(`data-autopilot-${name}`, n > 0);
  };
  const unflagAll = () => {
    for (const [element, counts] of flags) {
      for (const name of counts.keys()) element.removeAttribute(`data-autopilot-${name}`);
    }
    flags.clear();
    for (const r of rigs.values()) {
      r.hover = null;
      r.focus = null;
    }
  };
  const hoverOn = (r: Rig, element: Element | null) => {
    if (r.hover === element) return;
    flag(r.hover, "hover", false);
    r.hover = element;
    flag(element, "hover", true);
  };
  const focusOn = (r: Rig, element: Element | null) => {
    if (r.focus === element) return;
    flag(r.focus, "focus", false);
    r.focus = element;
    flag(element, "focus", true);
  };

  /** The UI under a cursor's tip. The cursors and anything dragged don't take hits. */
  const hit = (p: Point) => {
    if (!content) return null;
    const c = toClient(p);
    const element = document.elementFromPoint(c.x, c.y);
    return element && content.contains(element) ? element : null;
  };
  const hoverAt = (r: Rig, p: Point) => {
    const target = hit(p)?.closest("[data-autopilot]") ?? null;
    hoverOn(r, target && content?.contains(target) ? target : null);
  };

  // A click can make the UI move focus itself, like a menu focusing its first item. That isn't the visitor.
  const acted = () => {
    actingUntil = performance.now() + 120;
  };

  const find = async (name: string, signal: AbortSignal) => {
    const until = performance.now() + AUTOPILOT.find;
    for (;;) {
      const element = content?.querySelector(`[data-autopilot="${CSS.escape(name)}"]`);
      if (element && element.getClientRects().length) return element;
      if (performance.now() > until) {
        warn(`nothing marked data-autopilot="${name}" showed up.`);
        return null;
      }
      await nextFrame(signal);
    }
  };

  /* Moves. */
  const moveTo = async (
    r: Rig,
    to: Point,
    signal: AbortSignal,
    { carry = false, onFrame }: { carry?: boolean; onFrame?: (p: Point) => void } = {},
  ) => {
    r.placed = null;
    const step = (p: Point) => {
      hoverAt(r, p);
      onFrame?.(p);
    };
    if (config.reduced) {
      r.stop();
      r.x.jump(to.x);
      r.y.jump(to.y);
      step(to);
      await sleep(AUTOPILOT.beat * 2, signal);
      return;
    }
    const from = tip(r);
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    if (distance < 1) return;
    const ms = vary(travel(distance), 0.08) * (carry ? AUTOPILOT.carry : 1);
    if (carry || distance < AUTOPILOT.overshootFrom) {
      await glide(r, to, ms, { signal, bow: AUTOPILOT.bow, onFrame: step });
      return;
    }
    // Long trips land a little past the target, then correct.
    const by = Math.min(distance * AUTOPILOT.overshoot, AUTOPILOT.overshootMax);
    const ux = (to.x - from.x) / distance;
    const uy = (to.y - from.y) / distance;
    const drift = (Math.random() - 0.5) * by * 0.8;
    const past = { x: to.x + ux * by - uy * drift, y: to.y + uy * by + ux * drift };
    await glide(r, past, ms - AUTOPILOT.correct / 2, { signal, bow: AUTOPILOT.bow, onFrame: step });
    await glide(r, to, AUTOPILOT.correct, { signal, ease: EASE_OUT, onFrame: step });
  };

  /** Goes to a target, unless the tip is already on it. Catches up if it moved on the way. */
  const approach = async (r: Rig, element: Element, at: [number, number] | undefined, signal: AbortSignal) => {
    if (!at && inside(boxOf(element), tip(r))) return;
    await moveTo(r, aim(element, at), signal);
    if (!inside(boxOf(element), tip(r), 0)) await moveTo(r, aim(element, at), signal);
  };

  const squash = (r: Rig, down: boolean) => {
    if (down) {
      animate(r.squash, AUTOPILOT.squash, { duration: 0.07, ease: "easeOut" });
      if (!config.reduced) {
        r.ring.jump(0);
        animate(r.ring, 1, { duration: AUTOPILOT.ripple, ease: EASE_OUT });
      }
    } else {
      animate(
        r.squash,
        1,
        config.reduced ? { duration: 0.1 } : { type: "spring", stiffness: 600, damping: 18 },
      );
    }
  };

  /** Presses and releases where the tip is. Once started it always finishes. */
  const click = async (r: Rig, target: Element) => {
    const p = tip(r);
    const at = toClient(p);
    const under = hit(p);
    const on = under && target.contains(under) ? under : target;
    acted();
    flag(target, "press", true);
    squash(r, true);
    fire(on, "pointerdown", at);
    fire(on, "mousedown", at);
    await sleep(AUTOPILOT.press);
    flag(target, "press", false);
    squash(r, false);
    acted();
    fire(on, "pointerup", at);
    fire(on, "mouseup", at);
    fire(on, "click", at);
    // A click on a field shows it focused; anywhere else clears it.
    focusOn(r, on.closest("input, textarea"));
  };

  const typeInto = async (r: Rig, step: { type: string; into: string; at?: [number, number] }, signal: AbortSignal) => {
    const target = await find(step.into, signal);
    if (!target) return;
    const field = fieldIn(target);
    if (!field) return warn(`"${step.into}" has no input or textarea to type into.`);
    if (r.focus !== field) {
      const box = field.getClientRects().length ? field : target;
      await approach(r, box, step.at, signal);
      await sleep(vary(AUTOPILOT.beat, 0.3), signal);
      await click(r, box);
    }
    focusOn(r, field);
    if (!config.reduced) {
      // Ease the pointer off the line, so the words show as they're typed.
      const p = tip(r);
      const below = boxOf(field).bottom + 4;
      glide(
        r,
        { x: p.x + 10, y: clamp(Math.max(p.y + 6, below), 0, height.get() - 40) },
        280,
        { ease: EASE_OUT },
      ).catch(noop);
    }
    await sleep(AUTOPILOT.key * 2, signal);
    const keys = keysOf(step.type);
    let burst = Math.random() < AUTOPILOT.burst ? 3 : 0;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      press(field, key);
      if (i === keys.length - 1) break;
      let gap = vary(AUTOPILOT.key, 0.45);
      if (burst > 0) {
        burst--;
        gap *= 0.4;
      }
      if (key === " ") {
        gap += vary(AUTOPILOT.space, 0.5);
        if (Math.random() < AUTOPILOT.burst) burst = 2 + Math.floor(Math.random() * 3);
      } else if (/[.,!?;:…]/.test(key)) {
        gap += vary(AUTOPILOT.stop, 0.4);
      }
      await sleep(gap, signal);
    }
  };

  const drag = async (
    r: Rig,
    step: { drag: string; to: string; drop?: () => void; at?: [number, number] },
    signal: AbortSignal,
  ) => {
    const item = await find(step.drag, signal);
    const zone = item && (await find(step.to, signal));
    if (!(item instanceof HTMLElement) || !zone) return;
    await approach(r, item, step.at, signal);
    await sleep(AUTOPILOT.beat, signal);

    // Carry the grab point so the item's middle lands on the drop target's.
    const grab = tip(r);
    const from = boxOf(item);
    const onto = boxOf(zone);
    const end = {
      x: onto.left + onto.width / 2 + (grab.x - (from.left + from.width / 2)),
      y: onto.top + onto.height / 2 + (grab.y - (from.top + from.height / 2)),
    };

    const held = lift(item);
    flag(item, "drag", true);
    squash(r, true);
    if (!config.reduced) await animate(0, 1, { duration: 0.14, ease: "easeOut", onUpdate: held.raise });
    // The drop target shows data-autopilot-drop while the item is over it.
    let over = false;
    const hovering = (p: Point) => {
      const under = hit(p);
      const now = !!under && zone.contains(under);
      if (now !== over) flag(zone, "drop", (over = now));
    };
    try {
      await moveTo(r, end, signal, {
        carry: true,
        onFrame: (p) => {
          held.move(p.x - grab.x, p.y - grab.y);
          hovering(p);
        },
      });
      hovering(tip(r));
      await sleep(AUTOPILOT.beat, signal);
    } catch (error) {
      // Taken over mid-drag: put it back.
      if (over) flag(zone, "drop", false);
      squash(r, false);
      const p = tip(r);
      const back = { x: p.x - grab.x, y: p.y - grab.y };
      animate(1, 0, {
        ...AUTOPILOT.settle,
        onUpdate: (v) => {
          held.move(back.x * v, back.y * v);
          held.raise(v);
        },
        onComplete: () => {
          held.restore();
          flag(item, "drag", false);
        },
      });
      throw error;
    }

    // Set it down: let the UI move it, then settle it from where it was dropped into its new place.
    if (over) flag(zone, "drop", false);
    squash(r, false);
    const dropped = item.getBoundingClientRect();
    step.drop?.();
    await nextFrame();
    await nextFrame();
    const placed = content?.querySelector<HTMLElement>(`[data-autopilot="${CSS.escape(step.drag)}"]`);
    let settling = held;
    if (placed && placed !== item) {
      held.restore();
      flag(item, "drag", false);
      flag(placed, "drag", true);
      settling = lift(placed);
      settling.raise(1);
    }
    const target = settling.element;
    settling.move(0, 0);
    const now = target.getBoundingClientRect();
    const f = frame();
    const offset = {
      x: (dropped.left + dropped.width / 2 - (now.left + now.width / 2)) / f.k,
      y: (dropped.top + dropped.height / 2 - (now.top + now.height / 2)) / f.k,
    };
    const finish = () => {
      settling.restore();
      flag(target, "drag", false);
    };
    if (config.reduced) return finish();
    settling.move(offset.x, offset.y);
    animate(1, 0, {
      ...AUTOPILOT.settle,
      onUpdate: (v) => {
        settling.move(offset.x * v, offset.y * v);
        settling.raise(v);
      },
      onComplete: finish,
    });
  };

  /** One cursor's steps in a chapter, in order. */
  const walk = async (id: string, steps: AutopilotStep[], signal: AbortSignal) => {
    const r = rig(id);
    for (const step of steps) {
      if (signal.aborted) throw signal.reason;
      if (step.say !== undefined) ui.onSay(id, step.say);
      if ("move" in step) {
        const target = await find(step.move, signal);
        if (target) await approach(r, target, step.at, signal);
      } else if ("click" in step) {
        const target = await find(step.click, signal);
        if (!target) continue;
        await approach(r, target, step.at, signal);
        await sleep(vary(AUTOPILOT.beat, 0.3), signal);
        await click(r, target);
      } else if ("type" in step) {
        await typeInto(r, step, signal);
      } else if ("drag" in step) {
        await drag(r, step, signal);
      } else if ("wait" in step) {
        await sleep(step.wait, signal);
      } else if ("do" in step) {
        await step.do();
      }
    }
  };

  const estimate = (tracks: AutopilotStep[][]) =>
    Math.max(
      1000,
      ...tracks.map((steps) =>
        steps.reduce(
          (ms, step) =>
            ms +
            ("wait" in step
              ? step.wait
              : "type" in step
                ? 900 + step.type.length * 95
                : "drag" in step
                  ? 2000
                  : "click" in step
                    ? 1000
                    : "move" in step
                      ? 700
                      : 0),
          0,
        ),
      ),
    );

  /** Plays a chapter: every cursor's steps at once, each cursor's in order. */
  const play = async (index: number, signal: AbortSignal) => {
    const lead = config.cursors[0]?.id;
    const tracks = new Map<string, AutopilotStep[]>();
    for (const step of config.chapters[index]?.steps ?? []) {
      const id = step.cursor ?? lead;
      if (!id) continue;
      if (!config.cursors.some((cursor) => cursor.id === id)) {
        warn(`no cursor with id "${id}".`);
        continue;
      }
      tracks.set(id, [...(tracks.get(id) ?? []), step]);
    }
    fill?.stop();
    progress.jump(0);
    const expected = measured[index] ?? estimate([...tracks.values()]);
    fill = animate(progress, 0.96, { duration: expected / 1000, ease: "linear" });
    const began = performance.now();
    const results = await Promise.allSettled(
      [...tracks].map(([id, steps]) => walk(id, steps, signal)),
    );
    if (signal.aborted) throw signal.reason;
    for (const result of results) if (result.status === "rejected") throw result.reason;
    measured[index] = performance.now() - began;
    fill.stop();
    fill = animate(progress, 1, { duration: 0.2, ease: "easeOut" });
  };

  /** Crossfades from the stage as it is to the chapter's setup. */
  const reset = async (index: number, signal: AbortSignal) => {
    const copy = content && host ? snapshot(content, host) : null;
    try {
      unflagAll();
      config.chapters[index]?.setup?.();
      await nextFrame(signal);
      if (copy) await animate(copy, { opacity: [1, 0] }, { duration: AUTOPILOT.fade, ease: "easeOut" });
    } finally {
      copy?.remove();
    }
  };

  const goHome = (signal: AbortSignal) =>
    Promise.all(
      crew().map(async (r, i) => {
        await moveTo(r, home(i), signal);
        r.placed = "home";
      }),
    );

  const park = async () => {
    parked = true;
    ui.onParked(true);
    unflagAll();
    await Promise.all(
      crew().map(async (r, i) => {
        r.placed = "park";
        animate(r.rest, 1, { duration: 0.3 });
        if (!config.reduced) return glide(r, spot(i), AUTOPILOT.yield, { bow: AUTOPILOT.bow, ease: EASE_OUT });
        r.stop();
        r.x.jump(spot(i).x);
        r.y.jump(spot(i).y);
      }),
    );
  };

  const unpark = () => {
    parked = false;
    ui.onParked(false);
    for (const r of crew()) animate(r.rest, 0, { duration: 0.25 });
  };

  const run = async (signal: AbortSignal) => {
    if (signal.aborted || !stage) return;
    try {
      if (parked) unpark();
      if (pending !== null) {
        chapter = pending;
        pending = null;
        ended = false;
      }
      for (;;) {
        const count = config.chapters.length;
        if (!count) return;
        if (ended || chapter >= count) {
          ended = false;
          chapter = 0;
          ui.onQuiet();
          await Promise.all([reset(0, signal), goHome(signal)]);
        } else if (dirty) {
          await reset(chapter, signal);
        } else {
          config.chapters[chapter]?.setup?.();
          await nextFrame(signal);
        }
        dirty = true;
        const index = chapter;
        ui.onChapter(index);
        config.onChapterChange?.(index);
        ui.onQuiet();
        await play(index, signal);
        chapter = index + 1;
        if (chapter >= config.chapters.length) {
          ended = true;
          if (!config.loop || config.reduced) return ui.onFinish();
          await sleep(AUTOPILOT.hold, signal);
        }
      }
    } catch (error) {
      if (!signal.aborted) throw error;
      fill?.stop();
      if (signal.reason === "yield") await park();
    }
  };

  /** Puts cursors that haven't been seen yet at home and fades them in. */
  const show = () => {
    if (!stage) return;
    config.cursors.forEach((cursor, i) => {
      const r = rig(cursor.id);
      if (r.placed || r.opacity.get() > 0) return;
      r.x.jump(home(i).x);
      r.y.jump(home(i).y);
      r.placed = "home";
      if (config.reduced) r.opacity.jump(1);
      else animate(r.opacity, 1, { duration: 0.4, ease: "easeOut" });
    });
  };

  return {
    progress,
    width,
    height,
    rig,
    configure(next: PilotConfig) {
      config = next;
      show();
    },
    listen(next: PilotUI) {
      ui = next;
      return () => {
        ui = { onChapter: noop, onSay: noop, onQuiet: noop, onParked: noop, onFinish: noop };
      };
    },
    connect(nextStage: HTMLElement | null, nextContent: HTMLElement | null, nextHost: HTMLElement | null) {
      if (!nextStage || !nextContent || !nextHost) return;
      stage = nextStage;
      content = nextContent;
      host = nextHost;
      const measure = () => {
        width.set(nextStage.clientWidth);
        height.set(nextStage.clientHeight);
        config.cursors.forEach((cursor, i) => {
          const r = rig(cursor.id);
          const at = r.placed === "home" ? home(i) : r.placed === "park" ? spot(i) : null;
          if (!at) return;
          r.stop();
          r.x.jump(at.x);
          r.y.jump(at.y);
        });
      };
      measure();
      show();
      const observer = new ResizeObserver(measure);
      observer.observe(nextStage);
      return () => {
        observer.disconnect();
        unflagAll();
        stage = content = host = null;
      };
    },
    /** Starts a run once the one before it has finished the action it was in. */
    start(signal: AbortSignal) {
      queue = queue
        .then(() => run(signal))
        .catch((error) => {
          if (!signal.aborted) console.error(error);
        });
    },
    /** Why a run is being stopped: the visitor taking over, or anything else. */
    halt: () => (config.yielding ? "yield" : "stop"),
    seek(index: number) {
      pending = index;
      dirty = true;
      fill?.stop();
      progress.jump(0);
    },
    /** Whether the UI is reacting to something a cursor just did, like a menu focusing itself. */
    acting: () => performance.now() < actingUntil,
  };
}

type Pilot = ReturnType<typeof createPilot>;

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** Reduced motion, read so the server and the first client render agree. */
function useReduced() {
  return React.useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

/* ── Autopilot ──────────────────────────────────────────── */

export interface AutopilotProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The cursors on the stage. Steps without a `cursor` belong to the first. */
  cursors: AutopilotCursor[];
  /** The script, in chapters. Each starts from its `setup`, so a takeover can replay it. */
  chapters: AutopilotChapter[];
  /** The UI the cursors use. Mark targets with `data-autopilot="<name>"`. */
  children: React.ReactNode;
  /** Show the chapters under the stage, filling like a story timer. Click one to jump to it. */
  chapterStrip?: boolean;
  /** Start over after the last chapter. Otherwise it stops on the finished state. */
  loop?: boolean;
  /** The parked cursor's label while the visitor has control. */
  yieldLabel?: string;
  /** The corner the cursors step aside to. Pick one your UI keeps clear. */
  park?: AutopilotCorner;
  /** Called when a chapter starts. */
  onChapterChange?: (index: number) => void;
  /** Classes for the stage, the box the cursors move in. */
  stageClassName?: string;
}

/**
 * A cursor that uses your UI on its own: it moves, clicks, types and drags
 * across real markup on a script, and steps aside when a visitor wants to try it.
 */
export function Autopilot({
  cursors,
  chapters,
  children,
  chapterStrip = false,
  loop = true,
  yieldLabel = "Your turn",
  park = "bottom-right",
  onChapterChange,
  stageClassName,
  className,
  ...props
}: AutopilotProps) {
  const reduced = useReduced();
  const [pilot] = React.useState(createPilot);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const hostRef = React.useRef<HTMLDivElement>(null);

  const [chapter, setChapter] = React.useState(0);
  const [says, setSays] = React.useState<Record<string, string | null>>({});
  const [parked, setParked] = React.useState(false);
  const [intent, setIntent] = React.useState<boolean | null>(null); // the visitor's play or pause, once pressed
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [seen, setSeen] = React.useState(false);
  const [jump, setJump] = React.useState(0);

  const playing = intent ?? !reduced;
  const yielded = hovered || focused || touched || !playing;
  const running = seen && !yielded;

  React.useLayoutEffect(() => {
    pilot.configure({ cursors, chapters, reduced, loop, park, yielding: yielded, onChapterChange });
  });

  React.useLayoutEffect(
    () =>
      pilot.listen({
        onChapter: setChapter,
        onSay: (id, text) => setSays((current) => ({ ...current, [id]: text })),
        onQuiet: () => setSays({}),
        onParked: setParked,
        onFinish: () => setIntent(false),
      }),
    [pilot],
  );

  React.useLayoutEffect(
    () => pilot.connect(stageRef.current, contentRef.current, hostRef.current),
    [pilot],
  );

  React.useEffect(() => {
    if (!running) return;
    const run = new AbortController();
    pilot.start(run.signal);
    return () => run.abort(pilot.halt());
  }, [pilot, running, jump]);

  // Off screen or in a background tab, it stops, and replays the chapter when it's back.
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let inView = false;
    const update = () => setSeen(inView && document.visibilityState === "visible");
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting);
        update();
      },
      { threshold: 0.2 },
    );
    observer.observe(stage);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  /* The visitor: a mouse inside or focus inside holds it until two seconds after they leave; a tap holds it until Resume. */
  const timers = React.useRef({ hover: 0, focus: 0, pointer: "mouse" });
  React.useEffect(() => {
    const t = timers.current;
    return () => {
      window.clearTimeout(t.hover);
      window.clearTimeout(t.focus);
    };
  }, []);

  const holdHover = () => {
    window.clearTimeout(timers.current.hover);
    setHovered(true);
  };
  const letGo = (kind: "hover" | "focus") => {
    const t = timers.current;
    window.clearTimeout(t[kind]);
    t[kind] = window.setTimeout(
      () => (kind === "hover" ? setHovered(false) : setFocused(false)),
      AUTOPILOT.resume,
    );
  };

  const resume = () => {
    const t = timers.current;
    window.clearTimeout(t.hover);
    window.clearTimeout(t.focus);
    setHovered(false);
    setFocused(false);
    setTouched(false);
    setIntent(true);
    const active = document.activeElement;
    if (active instanceof HTMLElement && stageRef.current?.contains(active)) active.blur();
  };

  const seek = (index: number) => {
    pilot.seek(index);
    setChapter(index);
    resume();
    setJump((n) => n + 1);
  };

  const control: ControlState = touched ? "resume" : playing ? "pause" : "play";
  const onControl = () => (control === "pause" ? setIntent(false) : resume());

  return (
    <div {...props} className={cn("relative", className)}>
      <div className="relative">
        <div
          ref={stageRef}
          className={cn("relative", stageClassName)}
          onPointerEnter={(event) => {
            if (event.nativeEvent.isTrusted && event.pointerType === "mouse") holdHover();
          }}
          onPointerMove={(event) => {
            if (event.nativeEvent.isTrusted && event.pointerType === "mouse" && !hovered) holdHover();
          }}
          onPointerLeave={(event) => {
            if (event.nativeEvent.isTrusted && event.pointerType === "mouse") letGo("hover");
          }}
          onPointerDown={(event) => {
            if (event.nativeEvent.isTrusted) timers.current.pointer = event.pointerType;
          }}
          onClickCapture={(event) => {
            if (event.nativeEvent.isTrusted && timers.current.pointer !== "mouse") setTouched(true);
          }}
          onFocus={() => {
            if (pilot.acting()) return;
            window.clearTimeout(timers.current.focus);
            setFocused(true);
          }}
          onBlur={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
            letGo("focus");
          }}
        >
          <div ref={contentRef} className="relative isolate h-full">
            {children}
          </div>
          <div ref={hostRef} aria-hidden className="pointer-events-none absolute inset-0 z-10" />
          <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
            {cursors.map((cursor, i) => {
              const said = says[cursor.id];
              const text = parked ? (i === 0 ? yieldLabel : null) : said === undefined ? cursor.label : (said ?? cursor.label);
              return (
                <Pointer
                  key={cursor.id}
                  id={cursor.id}
                  rig={pilot.rig(cursor.id)}
                  pilot={pilot}
                  color={cursor.color}
                  text={text || null}
                  reduced={reduced}
                />
              );
            })}
          </div>
        </div>
        {!chapterStrip && (
          <Control
            state={control}
            onClick={onControl}
            className="absolute bottom-3 left-3 z-30 bg-zinc-950/80 text-white shadow-sm ring-1 ring-white/10 backdrop-blur-sm hover:bg-zinc-950 dark:bg-white/85 dark:text-zinc-900 dark:ring-black/5 dark:hover:bg-white"
          />
        )}
      </div>
      {chapterStrip && (
        <div className="mt-4 flex items-start gap-3" role="group" aria-label="Chapters">
          <Control
            state={control}
            onClick={onControl}
            className="mt-0.5 shrink-0 ring-1 ring-current/15 hover:bg-current/5"
          />
          <ol
            className="grid min-w-0 flex-1 gap-2 sm:gap-3"
            style={{ gridTemplateColumns: `repeat(${chapters.length}, minmax(0, 1fr))` }}
          >
            {chapters.map((item, i) => (
              <li key={i} className="min-w-0">
                <button
                  type="button"
                  onClick={() => seek(i)}
                  aria-current={i === chapter ? "step" : undefined}
                  className="group/chapter block w-full rounded-sm py-1.5 text-left outline-current focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="block h-[3px] overflow-hidden rounded-full bg-current/15">
                    <motion.span
                      className="block h-full origin-left rounded-full bg-current"
                      style={{ scaleX: i < chapter ? 1 : i === chapter ? pilot.progress : 0 }}
                    />
                  </span>
                  <span
                    className={cn(
                      "mt-2 flex items-baseline gap-1.5 text-xs transition-opacity duration-200",
                      i === chapter ? "opacity-100" : "opacity-50 group-hover/chapter:opacity-80",
                    )}
                  >
                    <span className="font-mono tabular-nums opacity-60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate font-medium">{item.title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ── Parts ──────────────────────────────────────────────── */

function Pointer({
  id,
  rig,
  pilot,
  color,
  text,
  reduced,
}: {
  id: string;
  rig: Rig;
  pilot: Pilot;
  color: string;
  text: string | null;
  reduced: boolean;
}) {
  // Keep the last words while the pill fades out, so it doesn't empty first.
  const [kept, setKept] = React.useState(text);
  if (text !== null && text !== kept) setKept(text);
  const shown = text ?? kept;

  const measureRef = React.useRef<HTMLSpanElement>(null);
  const pill = useMotionValue(0);
  React.useEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    let first = true;
    const observer = new ResizeObserver(() => {
      const w = element.offsetWidth;
      if (!w) return;
      if (first || reduced) pill.jump(w);
      else animate(pill, w, AUTOPILOT.label);
      first = false;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [pill, reduced]);

  // Slides along the stage's edge instead of hanging off it, and moves above the tip near the bottom.
  const left = useTransform(() => {
    const x = rig.x.get();
    const max = pilot.width.get() - pill.get() - PILL.inset;
    return Math.max(PILL.inset, Math.min(x + PILL.x, max)) - x;
  });
  const flip = useTransform((): number =>
    rig.y.get() + PILL.y + PILL.height + PILL.inset > pilot.height.get() ? 1 : 0,
  );
  const flipped = useSpring(flip, { stiffness: 500, damping: 40 });
  const top = useTransform(() => {
    const f = reduced ? flip.get() : flipped.get();
    return PILL.y + f * (-PILL.height - 8 - PILL.y);
  });

  const arrowOpacity = useTransform(rig.rest, [0, 1], [1, AUTOPILOT.parked]);
  const ringScale = useTransform(rig.ring, [0, 1], [0.25, 1]);
  const ringOpacity = useTransform(rig.ring, [0, 0.15, 1], [0, 0.6, 0]);

  return (
    <motion.div
      data-autopilot-cursor={id}
      className="absolute top-0 left-0 will-change-transform"
      style={{ x: rig.x, y: rig.y, opacity: rig.opacity }}
    >
      <motion.span
        className="absolute -top-4 -left-4 size-8 rounded-full border-2"
        style={{ borderColor: color, scale: ringScale, opacity: ringOpacity }}
      />
      <motion.span
        className="absolute -top-[2px] -left-[2px] block origin-[2px_2px]"
        style={{
          scale: rig.squash,
          opacity: arrowOpacity,
          filter: "drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.3)) drop-shadow(0 4px 8px rgb(0 0 0 / 0.12))",
        }}
      >
        <svg width="24" height="26" viewBox="0 0 24 26" fill="none" className="block overflow-visible">
          <path
            d="M2 2 L2 21.8 L7.6 16.9 L16.6 16.5 Z"
            fill={color}
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </motion.span>
      <motion.div
        className="absolute top-0 left-0 h-6 origin-top-left overflow-hidden rounded-full shadow-sm"
        style={{ x: left, y: top, width: pill, backgroundColor: color }}
        initial={false}
        animate={{ opacity: text ? 1 : 0, scale: text ? 1 : 0.85 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <AnimatePresence initial={false}>
          <motion.span
            key={shown}
            className="absolute inset-y-0 left-0 flex items-center px-2.5 text-xs font-medium whitespace-nowrap text-white"
            initial={reduced ? { opacity: 0 } : { y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
            transition={reduced ? { duration: 0.15 } : AUTOPILOT.label}
          >
            {shown}
          </motion.span>
        </AnimatePresence>
      </motion.div>
      <span
        ref={measureRef}
        className="invisible absolute top-0 left-0 px-2.5 text-xs font-medium whitespace-nowrap"
      >
        {shown}
      </span>
    </motion.div>
  );
}

type ControlState = "pause" | "play" | "resume";

function Control({
  state,
  onClick,
  className,
}: {
  state: ControlState;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors outline-current focus-visible:outline-2 focus-visible:outline-offset-2",
        state === "pause" ? "px-0" : "pr-3 pl-2.5",
        className,
      )}
    >
      {state === "pause" ? (
        <svg viewBox="0 0 12 12" className="size-3" fill="currentColor" aria-hidden>
          <rect x="2.5" y="2" width="2.5" height="8" rx="0.75" />
          <rect x="7" y="2" width="2.5" height="8" rx="0.75" />
        </svg>
      ) : (
        <svg viewBox="0 0 12 12" className="size-3" fill="currentColor" aria-hidden>
          <path d="M3.5 2.2v7.6a.6.6 0 0 0 .9.5l6-3.8a.6.6 0 0 0 0-1L4.4 1.7a.6.6 0 0 0-.9.5Z" />
        </svg>
      )}
      <span className={state === "pause" ? "sr-only" : undefined}>
        {state === "pause" ? "Pause" : state === "resume" ? "Resume" : "Play"}
      </span>
    </button>
  );
}
