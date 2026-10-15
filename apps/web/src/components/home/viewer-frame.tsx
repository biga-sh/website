"use client";

import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The real viewer in an iframe, mounted only as it nears the viewport (it
 * pulls Monaco and a session's files, which the top of the page doesn't
 * need). A skeleton holds the space so nothing shifts when it loads.
 */
export function ViewerFrame({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative h-[30rem] w-full sm:h-[34rem] lg:h-[40rem]">
      {!loaded && <Skeleton className="absolute inset-0 size-full rounded-none" />}
      {mounted && (
        <iframe src={src} title={title} loading="lazy" onLoad={() => setLoaded(true)} className="size-full border-0" />
      )}
    </div>
  );
}
