import { Mark } from "@/components/ui/typography";
import { type ShowcaseFile } from "@/lib/showcase";
import { cn } from "@/lib/utils";

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
  lastLine,
  replace,
  wrap = false,
  tabSize = 4,
  className,
}: {
  file: ShowcaseFile;
  /** The line at the top of the pane, 1-based. */
  firstLine?: number;
  /** The last line to draw, 1-based. Defaults to the end of the file. */
  lastLine?: number;
  /**
   * Swap one token's text on a line, to show an edit landing. With `mark`, the
   * new text is drawn under the highlighter, and `target` names it for Autopilot.
   */
  replace?: { line: number; from: string; to: string; mark?: boolean; target?: string };
  /** Soft-wrap long lines, like the viewer's "Wrap long lines", instead of clipping them. */
  wrap?: boolean;
  tabSize?: 2 | 4;
  className?: string;
}) {
  const lines = file.tokens.slice(firstLine - 1, lastLine);
  const gutter = String(file.totalLines).length;

  return (
    <div
      translate="no"
      className={cn("showcase-code bg-background h-full overflow-hidden py-3 font-mono text-[13px] leading-[19px]", className)}
    >
      {lines.map((tokens, index) => {
        const number = firstLine + index;
        const edited = replace && replace.line === number ? replace : undefined;
        return (
          <div key={number} className={cn("flex", !wrap && "whitespace-pre")}>
            <span
              aria-hidden
              className="text-muted-foreground/60 shrink-0 pr-4 pl-4 text-right select-none"
              style={{ width: `${gutter + 4}ch` }}
            >
              {number}
            </span>
            <span
              className={cn(
                tabSize === 2 ? "tab-2" : "tab-4",
                // A wrapped line continues indented under its first line, as an editor wraps.
                wrap && "min-w-0 flex-1 pr-4 [padding-inline-start:4ch] [text-indent:-4ch] break-words whitespace-pre-wrap"
              )}
            >
              {tokens.map(([text, light, dark], i) =>
                edited?.mark && text === edited.from ? (
                  <Mark key={`${i}:${edited.to}`} data-autopilot={edited.target} className="biga-mark-sweep">
                    {edited.to}
                  </Mark>
                ) : (
                  <span
                    key={i}
                    className="showcase-token"
                    style={{ "--l": light, "--d": dark } as React.CSSProperties}
                  >
                    {edited ? text.replace(edited.from, edited.to) : text}
                  </span>
                )
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
