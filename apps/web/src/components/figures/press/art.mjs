// The checkpoint press: an isometric figure of how biga turns saves into
// checkpoints. Pure ESM so it runs in Node (for checks) and in the Next
// server build alike. Everything static is built once here as SVG markup;
// the live component moves the parts marked `data-part`.
//
// World units are about one screen px, x/y on the floor, z up. The camera
// sits at azimuth 55°, so +y is the front face and +x the right end.

import * as k from "../../iso/iso-kit.mjs";
import { DIAL_MAX_MS, IDLE_MS, STACK_MAX } from "./model.mjs";

export const WIDTH = 640;
export const HEIGHT = 390;
const AZIMUTH = 55;

/* ── Layout ───────────────────────────────────────────── */

const PLATE = { x: -150, y: -60, w: 238, d: 116, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const KEY_BASE = { x: -132, y: 4, w: 40, d: 40, r: 4 };
const KEY_BASE_H = 9;
const KEY_CAP = { x: -128, y: 8, w: 32, d: 32, r: 6 };
const KEY_CAP_H = 9;
export const KEY_TRAVEL = 4;

export const DIAL = [-62, -24];
const DIAL_R = 22;
const DIAL_Z = 44;
const DIAL_H = 10;
export const DIAL_TOP = DIAL_Z + DIAL_H;
// The scale runs 270° clockwise from lower left, 0 to DIAL_MAX_MS.
export const DIAL_FROM = (-135 * Math.PI) / 180;
export const DIAL_SPAN = (270 * Math.PI) / 180;

const PED = { x: -10, y: -22, w: 66, d: 56, r: 4 };
export const PED_H = 16;
// One column at the back right; an arm carries the head out over the stack.
const POSTS = [[46, -31]];
const POST_TOP = 74;
const CROSS = { x: 9, y: -36, w: 43, d: 10, r: 2 };
const CROSS_H = 10;
const HEAD = { x: 9, y: -26, w: 28, d: 40, r: 3 };
const HEAD_Z = 62;
const HEAD_H = 22;
export const ROD = [23, 3];
const ROD_R = 2.2;
const RAM = { x: 9, y: -7, w: 28, d: 20, r: 2 };
const RAM_H = 9;
export const RAM_REST = 34; // underside of the ram's pad at rest
const TICKET = { x: 4, y: -10, w: 38, d: 26, r: 1.5 };
export const TICKET_H = 1.2;
const PIN_R = 1.5;
const PIN_TOP = PED_H + 10;
const PINS = [
  [TICKET.x - 2.2, TICKET.y - 2.2],
  [TICKET.x + TICKET.w + 2.2, TICKET.y - 2.2],
  [TICKET.x - 2.2, TICKET.y + TICKET.d + 2.2],
  [TICKET.x + TICKET.w + 2.2, TICKET.y + TICKET.d + 2.2],
];
const LAMP = [48, 26];
const LAMP_R = 3.2;

/** The ram's underside sits on the stack when it holds `count` tickets. */
export const stackTop = (count) => PED_H + count * TICKET_H;

/* ── Camera ───────────────────────────────────────────── */

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...k.boxCorners(HEAD, HEAD_Z, HEAD_Z + HEAD_H),
    ...k.boxCorners(CROSS, 0, POST_TOP + CROSS_H),
    [DIAL[0] - DIAL_R, DIAL[1], DIAL_TOP],
    [DIAL[0], DIAL[1] - DIAL_R, DIAL_TOP],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: AZIMUTH }
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth = ([x, y, z = 0]) => k.depthOf([x, y, z], P);
const byDepth = (points) => [...points].sort((a, b) => depth(a) - depth(b));

/* ── Base ─────────────────────────────────────────────── */

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  // Ruler strip along the front edge, millimetre-style ticks rooted on its back edge.
  const strip = { x: -80, y: PLATE.y + PLATE.d - 14, w: 152, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  return out.join("");
}

/* ── Timer dial ───────────────────────────────────────── */

const angleOfMs = (ms) => DIAL_FROM + (Math.min(ms, DIAL_MAX_MS) / DIAL_MAX_MS) * DIAL_SPAN;

/** The needle as a path, for a reading in ms. Exported for the live loop. */
export function needleAt(ms) {
  const angle = angleOfMs(ms);
  const [x, y] = DIAL;
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return k.lineOnTop([x - sx * 4, y - sy * 4], [x + sx * (DIAL_R - 5), y + sy * (DIAL_R - 5)], DIAL_TOP + 0.2, P);
}

function dial() {
  const out = [];
  const [x, y] = DIAL;
  out.push(S(k.cylinder(x, y, 7.5, 0, 2, P, 28), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 5, 2, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 3, 5, DIAL_Z - 9, P, 20), { tone: "mid", crease: "none" }));
  out.push(L([16, 28].map((z) => k.sideArc(x, y, 3, z, P, 12)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 5, DIAL_Z - 4, 4, P, 24), { tone: "mid" }));
  // Puck and knurled bezel.
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3.4, DIAL_TOP, 88, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3.4, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }));
  // Scale: a tick every 10 ms, a long one every 50 ms.
  const ticks = k.radialTicks(x, y, DIAL_R - 2.2, DIAL_MAX_MS / 10, 5, DIAL_TOP, [1.4, 3], P, DIAL_FROM, DIAL_SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // The quiet window, 0 to 120 ms, as an arc just inside the ticks; the
  // fire mark at 120 ms is a green tick from that arc to the bezel ring.
  const arc = [];
  for (let i = 0; i <= 24; i++) {
    const angle = angleOfMs((IDLE_MS * i) / 24);
    // On the inner ends of the long ticks, so it starts on the zero tick.
    arc.push([x + Math.sin(angle) * (DIAL_R - 5.2), y - Math.cos(angle) * (DIAL_R - 5.2)]);
  }
  out.push(L(k.onTop(arc, DIAL_TOP, P), { tone: "faint" }));
  const fire = angleOfMs(IDLE_MS);
  out.push(
    `<path class="iso-line" data-tone="green" style="stroke-width:1.4" d="${k.lineOnTop(
      [x + Math.sin(fire) * (DIAL_R - 5.2), y - Math.cos(fire) * (DIAL_R - 5.2)],
      [x + Math.sin(fire) * (DIAL_R - 2.2), y - Math.cos(fire) * (DIAL_R - 2.2)],
      DIAL_TOP,
      P
    )}"/>`
  );
  out.push(k.faceTextSvg(k.topMatrix([x - 6, y + 10], DIAL_TOP, P, "x"), "ms", { size: 2.6, tone: "lo" }));
  // Crown on the right, where a real gauge has its zero-set.
  out.push(S(k.slabOf({ x: x + DIAL_R - 1, y: y - 2.4, w: 4.5, d: 4.8, r: 1.2 }, DIAL_Z + 2.5, 5, P, 3), { tone: "mid" }));
  out.push(S(k.cylinder(x + DIAL_R + 5, y, 2.8, DIAL_Z + 1.8, 6.4, P, 18), { tone: "mid" }));
  out.push(L(k.knurl(x + DIAL_R + 5, y, 2.8, DIAL_Z + 1.8, DIAL_Z + 8.2, 16, P), { tone: "lo" }));
  return out.join("");
}

function needle() {
  return [
    `<path data-part="needle" class="iso-line" data-tone="hi" data-free="" style="stroke-width:1.2" d="${needleAt(0)}"/>`,
    L(k.ring(DIAL[0], DIAL[1], 1.8, DIAL_TOP + 0.2, P, 16), { tone: "mid" }),
    D([at([DIAL[0], DIAL[1], DIAL_TOP + 0.2])], { size: 0.9, tone: "hi" }),
  ].join("");
}

/* ── Save key ─────────────────────────────────────────── */

function keyBase() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(KEY_BASE, 0, KEY_BASE_H, P)}" style="filter:blur(5px)"/>`);
  out.push(S(k.slabOf(KEY_BASE, 0, KEY_BASE_H, P, 5, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(KEY_BASE, 2), KEY_BASE_H, P, 5), { tone: "faint" }));
  const screws = k.corners(KEY_BASE, 3.2);
  out.push(D(screws.map(([x, y]) => at([x, y, KEY_BASE_H])), { size: 0.45 }));
  // Cable boss on the right face.
  out.push(S(k.slabOf({ x: KEY_BASE.x + KEY_BASE.w, y: 21, w: 3, d: 6, r: 1 }, 2, 4, P, 2), { tone: "mid" }));
  return out.join("");
}

function keyCap() {
  const out = [];
  out.push(S(k.slabOf(KEY_CAP, KEY_BASE_H, KEY_CAP_H, P, 8, 1), { tone: "hi", crease: "lo" }));
  // A shallow dish on top, and the one engraved word in the drawing.
  out.push(L(k.planOutline(k.insetPlan(KEY_CAP, 4), KEY_BASE_H + KEY_CAP_H, P, 8), { tone: "faint" }));
  out.push(
    k.faceTextSvg(k.topMatrix([KEY_CAP.x + KEY_CAP.w / 2, KEY_CAP.y + KEY_CAP.d / 2 + 2], KEY_BASE_H + KEY_CAP_H, P, "x"), "save", {
      size: 6,
      tone: "mid",
      anchor: "middle",
    })
  );
  return out.join("");
}

/* ── Press ────────────────────────────────────────────── */

function frameBack() {
  const out = [];
  for (const [x, y] of POSTS) {
    out.push(S(k.cylinder(x, y, 5.2, 0, 4, P, 24, 0.5), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 3.2, 4, POST_TOP - 4, P, 24), { tone: "mid", crease: "none" }));
    out.push(L([24, 48].map((z) => k.sideArc(x, y, 3.2, z, P, 12)).join(""), { tone: "faint" }));
  }
  out.push(S(k.slabOf(CROSS, POST_TOP, CROSS_H, P, 3, 0.6), { tone: "mid" }));
  out.push(D(POSTS.map(([x, y]) => at([x, y, POST_TOP + CROSS_H])), { size: 0.55 }));
  return out.join("");
}

function pedestal() {
  const out = [];
  out.push(S(k.slabOf(PED, 0, PED_H, P, 6, 1), { tone: "mid", inner: L(k.sideSeam(PED, 5, P, 6), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(TICKET, -4), PED_H, P, 3), { tone: "faint" }));
  const screws = k.corners(PED, 4);
  out.push(D(screws.map(([x, y]) => at([x, y, PED_H])), { size: 0.5 }));

  return out.join("");
}

function pin([x, y]) {
  return [
    S(k.cylinder(x, y, PIN_R + 1, PED_H, 1, P, 16), { tone: "mid" }),
    S(k.cylinder(x, y, PIN_R, PED_H + 1, PIN_TOP - PED_H - 1, P, 16), { tone: "mid", crease: "none" }),
  ].join("");
}

/** One ticket at slot `index` in the stack; slots at or past `shown` start hidden. */
function ticket(index, shown) {
  const z = PED_H + index * TICKET_H;
  const top = z + TICKET_H;
  const rules = [
    [TICKET.x + 5, TICKET.x + 26],
    [TICKET.x + 5, TICKET.x + 31],
    [TICKET.x + 5, TICKET.x + 18],
  ]
    .map(([x0, x1], i) => k.lineOnTop([x0, TICKET.y + 6 + i * 4.4], [x1, TICKET.y + 6 + i * 4.4], top, P))
    .join("");
  const hash = k.lineOnTop([TICKET.x + TICKET.w - 11, TICKET.y + TICKET.d - 6], [TICKET.x + TICKET.w - 5, TICKET.y + TICKET.d - 6], top, P);
  return `<g data-part="ticket" data-slot="${index}"${index < shown ? "" : ' style="display:none"'}>${S(k.slabOf(TICKET, z, TICKET_H, P, 3), {
    tone: "mid",
    lit: index === shown - 1,
    crease: "none",
    inner: L(rules, { tone: "lo", free: true }) + L(hash, { tone: "mid", free: true }),
  })}</g>`;
}

function ram() {
  const out = [];
  const [x, y] = ROD;
  // The rod is built long enough to stay inside the head at full stroke;
  // the head and gland are painted after it, so its top never shows.
  out.push(S(k.cylinder(x, y, ROD_R, RAM_REST + 1 + RAM_H, HEAD_Z + HEAD_H - (RAM_REST + 1 + RAM_H), P, 18), { tone: "mid", crease: "none", lit: true }));
  out.push(S(k.slabOf(k.insetPlan(RAM, 1), RAM_REST, 1, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf(RAM, RAM_REST + 1, RAM_H, P, 4, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(RAM, 3), RAM_REST + 1 + RAM_H, P, 3), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 4, RAM_REST + 1 + RAM_H, 2, P, 20), { tone: "mid" }));
  return out.join("");
}

function head() {
  const out = [];
  const [x, y] = ROD;
  out.push(S(k.cylinder(x, y, 4.6, HEAD_Z - 5, 5, P, 24, 0.4), { tone: "mid" }));
  // Vent slots on the front face: closed outlines, so nothing ends in mid-air.
  const front = HEAD.y + HEAD.d;
  const vents = [0, 1, 2, 3, 4]
    .map((i) => {
      const x0 = HEAD.x + 7 + i * 3.4;
      const corners = [
        [x0, front, HEAD_Z + 9],
        [x0 + 1.6, front, HEAD_Z + 9],
        [x0 + 1.6, front, HEAD_Z + 18],
        [x0, front, HEAD_Z + 18],
      ];
      return k.pathOf(corners.map(at), true);
    })
    .join("");
  out.push(
    S(k.slabOf(HEAD, HEAD_Z, HEAD_H, P, 4, 0.8), {
      tone: "mid",
      inner: L(k.sideSeam(HEAD, HEAD_Z + 6, P, 4), { tone: "faint" }) + L(vents, { tone: "lo" }),
    })
  );
  out.push(L(k.planOutline(k.insetPlan(HEAD, 3), HEAD_Z + HEAD_H, P, 4), { tone: "faint" }));
  out.push(D(k.corners(HEAD, 4).map(([px, py]) => at([px, py, HEAD_Z + HEAD_H])), { size: 0.5 }));
  return out.join("");
}

function lamp() {
  const [x, y] = LAMP;
  return [
    S(k.cylinder(x, y, LAMP_R + 1.2, PED_H, 1.2, P, 20), { tone: "mid" }),
    `<g data-part="lamp">${S(k.cylinder(x, y, LAMP_R, PED_H + 1.2, 2, P, 20), { tone: "mid", className: "press-lamp" })}</g>`,
  ].join("");
}

/* ── Wires ────────────────────────────────────────────── */

function wires() {
  return [
    k.wireSvg(at([KEY_BASE.x + KEY_BASE.w + 3, 24, 4]), at([PED.x, 24, 4]), { tone: "mid", size: 1.1 }),
    k.wireSvg(at([DIAL[0] + 5, DIAL[1] + 2, 3.5]), at([PED.x, -12, 4]), {
      via: [at([-34, -12, 3.5])],
      tone: "lo",
      size: 1.1,
    }),
  ].join("");
}

/* ── Assembly ─────────────────────────────────────────── */

/** The figure's markup at rest, with `shown` checkpoints already on the stack. */
export function buildPress({ shown = 0 } = {}) {
  const [back, front] = [PINS.filter((p) => depth(p) < depth(ROD)), PINS.filter((p) => depth(p) >= depth(ROD))];
  const tickets = Array.from({ length: STACK_MAX }, (_, i) => ticket(i, shown)).join("");
  const body = [
    base(),
    dial(),
    needle(),
    wires(),
    keyBase(),
    `<g data-part="key">${keyCap()}</g>`,
    frameBack(),
    pedestal(),
    back.map(pin).join(""),
    `<g data-part="stack">${tickets}</g>`,
    `<g data-part="ram">${ram()}</g>`,
    front.map(pin).join(""),
    head(),
    lamp(),
  ].join("");
  return body;
}
