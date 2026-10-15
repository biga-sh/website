import summary from "./summary.json";

/**
 * What the landing page's server-rendered copy needs from the showcase
 * snapshot, kept apart from `fixture.json` so it costs nothing to import.
 */
export const SHOWCASE = summary;

/** The CLI's own size formatter (1024-based, one decimal), so the page prints what it prints. */
export function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}
