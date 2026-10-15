import { cn } from "@/lib/utils";
import { type ShowcaseFile } from "@/lib/showcase";

/**
 * The code pane's body for the landing page: the real file, highlighted ahead
 * of time with the viewer's own default themes (GitHub light and dark), laid
 * out like Monaco does it (13px Geist Mono, 12px top padding, a right-aligned
 * gutter). Monaco itself is a few megabytes the landing page doesn't need.
 *
 * Colours come from two CSS variables per token, picked by `.dark` in
 * globals.css, so a theme change repaints it without a render.
 */
export function StaticCode({
  file,
  firstLine = 1,
  replace,
  className,
}: {
  file: ShowcaseFile;
  /** The line at the top of the pane, 1-based. */
  firstLine?: number;
  /** Swap one token's text on a line, to show an edit landing. */
  replace?: { line: number; from: string; to: string };
  className?: string;
}) {
  const lines = file.tokens.slice(firstLine - 1);
  const gutter = String(file.totalLines).length;

  return (
    <div
      translate="no"
      className={cn("showcase-code bg-background h-full overflow-hidden py-3 font-mono text-[13px] leading-[19px]", className)}
    >
      {lines.map((tokens, index) => {
        const number = firstLine + index;
        return (
          <div key={number} className="flex whitespace-pre">
            <span
              aria-hidden
              className="text-muted-foreground/60 shrink-0 pr-4 pl-4 text-right select-none"
              style={{ width: `${gutter + 4}ch` }}
            >
              {number}
            </span>
            <span className="tab-4">
              {tokens.map(([text, light, dark], i) => (
                <span
                  key={i}
                  className="showcase-token"
                  style={{ "--l": light, "--d": dark } as React.CSSProperties}
                >
                  {replace && replace.line === number ? text.replace(replace.from, replace.to) : text}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
