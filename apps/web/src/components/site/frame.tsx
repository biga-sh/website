import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * The page is one column between two hairline rails. On phones the rails sit
 * on the screen edges (where they read as the edge itself); from `sm` up they
 * step in so the column floats with a gutter either side.
 */
const GUTTER = "sm:px-6 lg:px-8";
const COLUMN = "border-rail mx-auto w-full max-w-6xl border-x";

/** Inner padding for content inside the rails. 16px on phones. */
export const INSET = "px-4 sm:px-8 lg:px-12";

/** Full-bleed wrapper + railed column. Use for anything that spans the page. */
export function Frame({
  className,
  columnClassName,
  joints = false,
  children,
  ...props
}: ComponentProps<"div"> & {
  columnClassName?: string;
  /** Diamond joints where the bottom divider crosses the rails. */
  joints?: boolean;
}) {
  return (
    <div className={cn(GUTTER, className)} {...props}>
      <div className={cn(COLUMN, joints && "biga-joints", columnClassName)}>{children}</div>
    </div>
  );
}

/**
 * A chapter of the page: a full-bleed hairline underneath, rails either
 * side, joints where they meet. `bleed` drops the inner padding for content
 * that draws its own edges (a grid of ruled cells, a sticky stage).
 */
export function Section({
  id,
  className,
  columnClassName,
  bleed = false,
  stage = false,
  children,
  ...props
}: ComponentProps<"section"> & {
  columnClassName?: string;
  bleed?: boolean;
  /** A dark, glowing chapter in either theme. See `.biga-stage` in globals.css. */
  stage?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn("border-rail border-b", GUTTER, stage && "dark biga-stage", className)}
      {...props}
    >
      <div
        className={cn(COLUMN, "biga-joints", !bleed && cn(INSET, "py-16 sm:py-20 lg:py-24"), columnClassName)}
      >
        {children}
      </div>
    </section>
  );
}

/** A hatched spacer band between chapters. Purely decorative. */
export function HatchBand({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("border-rail border-b", GUTTER)}>
      <div className={cn(COLUMN, "biga-hatch biga-joints h-6 sm:h-8", className)} />
    </div>
  );
}

/**
 * Section header: title then a lead paragraph stacked under it, never split
 * into two columns. The optional `aside` sits under the lead on phones and
 * beside the title block from `lg` when it carries a real control.
 */
export function SectionHeader({
  title,
  lead,
  aside,
  eyebrow,
  className,
}: {
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
  /** A numbered chapter marker above the title, e.g. "01 / How it works". */
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="flex max-w-2xl flex-col gap-4">
        {eyebrow ? (
          <span className="text-brand-text font-pixel flex items-center gap-2.5 text-xs leading-none tracking-[0.08em] uppercase">
            <span aria-hidden className="bg-brand-mark size-2 shrink-0 rotate-45" />
            {eyebrow}
          </span>
        ) : null}
        {title}
        {lead}
      </div>
      {aside}
    </div>
  );
}
