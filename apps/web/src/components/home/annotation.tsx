import type { ReactNode } from "react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

/**
 * A margin note: a pixel-type remark with a hand-drawn arrow curling toward
 * the thing it points at. Decorative, so the arrow is hidden from assistive
 * tech; the words still read in place.
 */
export function Annotation({
  children,
  direction = "down",
  className,
}: {
  children: ReactNode;
  /** Which way the arrow curls: down toward content below, or up. */
  direction?: "down" | "up";
  className?: string;
}) {
  return (
    <span className={cn("text-brand-text inline-flex items-end gap-1.5", direction === "up" && "items-start", className)}>
      <Typography variant="label" tone="inherit" className="leading-[1.35]">
        {children}
      </Typography>
      <svg
        aria-hidden
        viewBox="0 0 40 30"
        className={cn("h-6 w-8 shrink-0 overflow-visible", direction === "down" ? "translate-y-3" : "-translate-y-3 -scale-y-100")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 6c10-6 24-4 30 6 3 5 3 10 1 15" />
        <path d="M27 22.5l6 5 3.5-7" />
      </svg>
    </span>
  );
}
