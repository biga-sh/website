"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Lays its children out at a fixed design size and scales that to the width of
 * the box it sits in, so real components shrink like a screenshot while staying
 * live, themed HTML. `ResizeObserver` reports layout size, which ignores the
 * 3D transforms an ancestor may have, so it also works inside an exploded stack.
 */
export function Scaled({
  width,
  height,
  maxScale = Infinity,
  autoHeight = false,
  className,
  children,
}: {
  /** The size, in CSS px, the content is designed at. */
  width: number;
  height: number;
  /** Never enlarge past this, e.g. 1 to keep a design from growing on wide screens. */
  maxScale?: number;
  /** Size the box to the scaled content instead of filling its parent's height. */
  autoHeight?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setScale(Math.min(element.offsetWidth / width, maxScale));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width, maxScale]);

  return (
    <div
      ref={ref}
      className={cn("relative w-full overflow-hidden", !autoHeight && "h-full", className)}
      style={autoHeight ? { height: height * scale } : undefined}
    >
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          visibility: scale ? undefined : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
