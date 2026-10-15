"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  delay?: number;
  className?: string;
  children: ReactNode;
  /** Element to render. Sections use this to be the revealed node directly,
      instead of nesting an extra wrapping div inside full-width layouts. */
  as?: "div" | "section";
};

export function Reveal({ delay = 0, className, children, as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      element.dataset.revealed = "true";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          (entry.target as HTMLElement).dataset.revealed = "true";
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const style = { "--reveal-delay": `${delay}ms` } as CSSProperties;
  const cls = cn("spire-reveal", className);

  if (as === "section") {
    return (
      <section ref={ref as never} className={cls} style={style}>
        {children}
      </section>
    );
  }

  return (
    <div ref={ref as never} className={cls} style={style}>
      {children}
    </div>
  );
}
