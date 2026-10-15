"use client";

import { useState } from "react";

import { Diagram } from "@/components/landing/diagram/canvas";
import { Wire } from "@/components/landing/diagram/primitives";
import { ARCH_EDGES, ARCH_NODES, type ArchNodeId } from "@/lib/landing-demo";
import { cn } from "@/lib/utils";

const VB_W = 600;
const VB_H = 300;

function nodeById(id: ArchNodeId) {
  return ARCH_NODES.find((node) => node.id === id)!;
}

function edgePath(from: ArchNodeId, to: ArchNodeId) {
  const a = nodeById(from);
  const b = nodeById(to);
  const ax = (a.x / 100) * VB_W;
  const ay = (a.y / 100) * VB_H;
  const bx = (b.x / 100) * VB_W;
  const by = (b.y / 100) * VB_H;
  const mx = (ax + bx) / 2;
  return `M ${ax} ${ay} C ${mx} ${ay}, ${mx} ${by}, ${bx} ${by}`;
}

/**
 * The real request path, from the README's own architecture diagram: the
 * CLI posts to the API, which stores to Postgres and optionally bridges
 * through Redis, and the viewer reads from both. Selecting, hovering or
 * focusing a node highlights the wires it actually sits on.
 */
export function ArchitectureDiagram() {
  const [active, setActive] = useState<ArchNodeId>("api");
  const node = nodeById(active);

  function isEdgeActive(from: ArchNodeId, to: ArchNodeId) {
    return from === active || to === active;
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] lg:items-center lg:gap-10">
      <div className="relative">
        <Diagram viewBox={`0 0 ${VB_W} ${VB_H}`} className="aspect-[600/300]">
          {ARCH_EDGES.map(([from, to], i) => (
            <Wire
              key={i}
              d={edgePath(from, to)}
              delay={i * 50}
              className={cn("transition-[stroke] duration-200 ease-out", isEdgeActive(from, to) && "spire-wire-strong")}
            />
          ))}
        </Diagram>

        <div className="pointer-events-none absolute inset-0">
          {ARCH_NODES.map((n) => {
            const selected = n.id === active;
            return (
              <button
                key={n.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActive(n.id)}
                onMouseEnter={() => setActive(n.id)}
                onFocus={() => setActive(n.id)}
                className={cn(
                  "pointer-events-auto absolute flex w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-xl border px-3 py-2.5 text-center outline-none transition-colors duration-150 ease-out",
                  "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  selected
                    ? "bg-card border-spire/50 shadow-sm"
                    : "bg-card/70 border-border/70 hover:border-border"
                )}
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                <span className={cn("text-[13px] font-semibold tracking-tight", selected && "text-spire")}>
                  {n.label}
                </span>
                <span className="text-muted-foreground font-mono text-[10px] whitespace-nowrap">{n.sublabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div aria-live="polite" className="border-border/70 bg-card rounded-2xl border p-5 sm:p-6">
        <h3 className="font-mono text-sm font-medium">{node.label}</h3>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">{node.description}</p>
      </div>
    </div>
  );
}
