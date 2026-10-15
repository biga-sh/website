"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export type TocItem = { id: string; label: string };

/** Tracks which section is under the sticky header as the reader scrolls. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.isIntersecting);
        }
        const first = ids.find((id) => visible.get(id));
        if (first) {
          setActive(first);
        }
      },
      // A band just below the sticky header: a section is "current" once its
      // top reaches it and until the next one does.
      { rootMargin: "-96px 0px -60% 0px" }
    );
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    }
    // A short final section may never reach the band; once the footer is in
    // view, the reader is at the end of the last one.
    const footer = document.querySelector("footer");
    const endObserver = new IntersectionObserver(([entry]) => {
      const last = ids.at(-1);
      if (entry?.isIntersecting && last) {
        setActive(last);
      }
    });
    if (footer) {
      endObserver.observe(footer);
    }
    return () => {
      observer.disconnect();
      endObserver.disconnect();
    };
  }, [ids]);

  return active;
}

/**
 * The docs outline. `chips` is the phone layout, a scrollable row under the
 * title; `rail` is the sticky desktop outline that marks the section in view.
 */
export function DocsToc({ items, variant }: { items: TocItem[]; variant: "chips" | "rail" }) {
  if (variant === "chips") {
    return (
      <nav aria-label="On this page" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="border-border/70 text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 block rounded-full border px-3 py-1.5 text-xs transition-colors outline-none focus-visible:ring-2"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  return <DocsTocRail items={items} />;
}

function DocsTocRail({ items }: { items: TocItem[] }) {
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const active = useActiveSection(ids);

  return (
    <nav aria-label="On this page">
        <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
          On this page
        </p>
        <ul className="border-border/70 space-y-1 border-l">
          {items.map((item) => {
            const current = item.id === active;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={current ? "location" : undefined}
                  className={cn(
                    "focus-visible:ring-ring/50 -ml-px block border-l py-1 pl-3 text-sm transition-colors outline-none focus-visible:ring-2",
                    current
                      ? "border-foreground text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground border-transparent"
                  )}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
    </nav>
  );
}
