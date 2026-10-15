"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type Options = {
  /** Fraction of the element that must be visible before it counts. */
  threshold?: number;
  rootMargin?: string;
  /** Stop observing after the first time it enters (default true). */
  once?: boolean;
};

/**
 * IntersectionObserver-backed "is this on screen" hook, used to gate
 * scripted sequences (the demo terminal, the how-it-works stepper) so they
 * run once on arrival and pause rather than play off-screen.
 */
export function useInView<T extends HTMLElement>(
  options: Options = {}
): [RefObject<T | null>, boolean] {
  const { threshold = 0.3, rootMargin = "0px", once = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          return;
        }
        if (entry.isIntersecting) {
          setInView(true);
          if (once) {
            observer.unobserve(entry.target);
          }
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView];
}
