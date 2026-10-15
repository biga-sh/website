"use client";

import { type KeyboardEvent, useRef, useState } from "react";

import { CHECKPOINTS } from "@/lib/landing-demo";
import { cn } from "@/lib/utils";

const KIND_TONE = {
  added: "text-success",
  modified: "text-muted-foreground",
  deleted: "text-destructive",
} as const;

/**
 * The checkpoint stack as a real listbox: arrow keys move through it, the
 * selected plate's detail panel shows exactly what that save changed, and
 * how much it didn't.
 */
export function CheckpointExplorer() {
  const [index, setIndex] = useState(0);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // `index` is always kept in range by `moveTo`, so this index access is safe.
  const selected = CHECKPOINTS[index]!;

  function moveTo(next: number) {
    const clamped = Math.min(CHECKPOINTS.length - 1, Math.max(0, next));
    setIndex(clamped);
    optionRefs.current[clamped]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        moveTo(index + 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        moveTo(index - 1);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(CHECKPOINTS.length - 1);
        break;
    }
  }

  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
      <div
        role="listbox"
        aria-label="This repository's checkpoints"
        aria-activedescendant={`checkpoint-${selected.seq}`}
        onKeyDown={onKeyDown}
        className="flex flex-col items-center gap-3 py-4"
      >
        {CHECKPOINTS.map((cp, i) => {
          const isSelected = i === index;
          return (
            <button
              key={cp.seq}
              id={`checkpoint-${cp.seq}`}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              role="option"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => moveTo(i)}
              style={{
                transform: `rotate(${i % 2 === 0 ? 3 : -3}deg)`,
                width: `${100 - i * 7}%`,
              }}
              className={cn(
                "flex h-11 max-w-70 min-w-48 items-center gap-2.5 rounded-full border px-5 text-left font-mono text-xs outline-none transition-[background-color,border-color,color] duration-200 ease-out",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                cp.live
                  ? "bg-spire-solid text-spire-foreground border-transparent"
                  : isSelected
                    ? "bg-muted border-border text-foreground"
                    : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="shrink-0 tabular-nums">#{cp.seq}</span>
              <span className="truncate">{cp.live ? "live" : cp.createdAgo}</span>
            </button>
          );
        })}
      </div>

      <div
        aria-live="polite"
        className="border-border/70 bg-card rounded-2xl border p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-mono text-sm font-medium">Checkpoint #{selected.seq}</h3>
          {selected.live && (
            <span className="text-spire font-mono text-[11px] tracking-wide uppercase">live</span>
          )}
        </div>
        <ul className="mt-4 space-y-2.5">
          {selected.changes.map((change) => (
            <li key={change.path} className="flex items-center gap-3 font-mono text-[12px]">
              <span className={cn("w-16 shrink-0 text-[10px] tracking-wide uppercase", KIND_TONE[change.kind])}>
                {change.kind}
              </span>
              <span className="min-w-0 flex-1 truncate">{change.path}</span>
              <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                +{change.additions} -{change.deletions}
              </span>
              <span className="text-muted-foreground hidden shrink-0 text-[11px] sm:inline">{change.hash}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground border-border/60 mt-4 border-t pt-3 text-xs">
          {selected.unchanged} unchanged files: not sent.
        </p>
      </div>
    </div>
  );
}
