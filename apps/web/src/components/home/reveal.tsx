"use client";

import { type ComponentProps, useEffect, useRef } from "react";

/**
 * Sets `data-revealed="true"` once the element scrolls into view, and then
 * never again. CSS does the rest: a `Mark draw` inside sweeps its
 * highlighter on (`.biga-mark-draw` in globals.css).
 */
export function Reveal({ className, ...props }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      element.dataset.revealed = "true";
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          element.dataset.revealed = "true";
          observer.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={className} {...props} />;
}
