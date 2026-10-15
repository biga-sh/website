import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The pixel "b" from the site mark on a 5 x 7 grid; the top-right cell is the green "just saved" one. */
const CELLS = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  [1, 2], [2, 2], [3, 2],
  [4, 3], [4, 4], [4, 5],
  [1, 6], [2, 6], [3, 6],
] as const;

const CELL = 18;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0b0c0e" }}>
        <div style={{ position: "relative", display: "flex", width: CELL * 5, height: CELL * 7, margin: "auto" }}>
          {CELLS.map(([x, y]) => (
            <div
              key={`${x}-${y}`}
              style={{ position: "absolute", left: x * CELL, top: y * CELL, width: CELL, height: CELL, background: "#f4f5f6" }}
            />
          ))}
          <div style={{ position: "absolute", left: 4 * CELL, top: 0, width: CELL, height: CELL, background: "#63e197" }} />
        </div>
      </div>
    ),
    size
  );
}
