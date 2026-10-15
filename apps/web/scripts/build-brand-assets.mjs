#!/usr/bin/env node
/**
 * Writes the downloadable brand files to `public/brand/`:
 *
 *   biga-mark.svg / biga-mark-light.svg   the pixel "b", for light and dark grounds
 *   biga-logo.svg / biga-logo-light.svg   mark + wordmark, the wordmark outlined
 *   biga-icon.svg                          the mark on the app-icon tile
 *
 * The wordmark is Bricolage Grotesque ExtraBold, tracked at -0.04em as the
 * site sets it, converted to paths with opentype.js so the files need no font.
 * The font is fetched from Google Fonts. Run this by hand and commit the output.
 *
 *   node scripts/build-brand-assets.mjs
 */
import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import opentype from "opentype.js";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/brand");
mkdirSync(OUT, { recursive: true });

/** The mark's cells on its 5 x 7 grid, and the one that is lit. Matches `components/site/biga-mark.tsx`. */
const CELLS = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  [1, 2], [2, 2], [3, 2],
  [4, 3], [4, 4], [4, 5],
  [1, 6], [2, 6], [3, 6],
];
const LIT = [4, 0];
const GREEN = "#63e197";
const INK = "#0b0c0e";
const PAPER = "#f4f5f6";

const rect = ([x, y], cell, fill, ox = 0, oy = 0) =>
  `<rect x="${ox + x * cell}" y="${oy + y * cell}" width="${cell}" height="${cell}" fill="${fill}"/>`;

function mark({ cell, fill, ox = 0, oy = 0 }) {
  return [...CELLS.map((c) => rect(c, cell, fill, ox, oy)), rect(LIT, cell, GREEN, ox, oy)].join("");
}

const svg = (width, height, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;

// --- the font ---
const css = await (await fetch("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800", {
  headers: { "user-agent": "Mozilla/4.0" },
})).text();
const url = /src: url\((.+?)\) format\('truetype'\)/.exec(css)?.[1];
if (!url) throw new Error("could not find the Bricolage Grotesque TTF in the Google Fonts response");
const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));

/** "biga" as one path, glyph by glyph (kerning off, tracking -0.04em), at `size` px, left edge at x = 0. */
function wordmark(text, size) {
  const track = -0.04 * size;
  let x = 0;
  const parts = [];
  let top = Infinity;
  let bottom = -Infinity;
  for (const char of text) {
    const glyph = font.charToGlyph(char);
    const path = glyph.getPath(x, 0, size);
    const box = path.getBoundingBox();
    top = Math.min(top, box.y1);
    bottom = Math.max(bottom, box.y2);
    parts.push(path.toPathData(2));
    x += (glyph.advanceWidth * size) / font.unitsPerEm + track;
  }
  return { d: parts.join(""), width: x - track, top, bottom };
}

function logo(fill) {
  const cell = 10;
  const markW = 5 * cell;
  const markH = 7 * cell;
  const gap = 2.6 * cell; // the site's gap-2 (8px) beside a 3px cell
  const word = wordmark("biga", 7.3 * cell);
  const textH = word.bottom - word.top;
  const height = Math.max(markH, textH);
  const markY = (height - markH) / 2;
  // Centre the wordmark's ink on the mark's middle.
  const dy = (height - textH) / 2 - word.top;
  const width = markW + gap + word.width;
  const body =
    mark({ cell, fill, oy: markY }) +
    `<g transform="translate(${markW + gap} ${dy})"><path d="${word.d}" fill="${fill}" shape-rendering="geometricPrecision"/></g>`;
  return svg(Math.round(width), Math.round(height), body, "biga");
}

const markOnly = (fill) => svg(5 * 10, 7 * 10, mark({ cell: 10, fill }), "biga");

const icon = svg(
  240,
  240,
  `<rect width="240" height="240" rx="52" fill="${INK}" shape-rendering="geometricPrecision"/>` +
    mark({ cell: 20, fill: PAPER, ox: 70, oy: 50 }),
  "biga"
);

const files = {
  "biga-mark.svg": markOnly(INK),
  "biga-mark-light.svg": markOnly(PAPER),
  "biga-logo.svg": logo(INK),
  "biga-logo-light.svg": logo(PAPER),
  "biga-icon.svg": icon,
};
for (const [name, content] of Object.entries(files)) {
  writeFileSync(resolve(OUT, name), content);
  console.log(`brand: ${name} (${content.length} bytes)`);
}
