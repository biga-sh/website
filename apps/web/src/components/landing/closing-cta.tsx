import type { CSSProperties } from "react";

import { InstallCommand } from "@/components/landing/copy-command";
import { Diagram } from "@/components/landing/diagram/canvas";
import { PlateStack, Signal, ViewerNodeMark, Wire } from "@/components/landing/diagram/primitives";
import { JoinForm } from "@/components/landing/join-form";
import { Reveal } from "@/components/landing/reveal";
import { CONTAINER } from "@/components/landing/site-chrome";
import { cn } from "@/lib/utils";

const VB_W = 700;
const VB_H = 160;
const STACK_CX = 350;
const STACK_BASE_Y = 140;
const VIEWERS: { x: number; y: number }[] = [
  { x: 110, y: 78 },
  { x: 260, y: 36 },
  { x: 440, y: 36 },
  { x: 590, y: 78 },
];

function PayoffDiagram() {
  return (
    <Diagram viewBox={`0 0 ${VB_W} ${VB_H}`} paper={false} className="aspect-[700/160]">
      {VIEWERS.map((v, i) => {
        const d = `M ${STACK_CX} ${STACK_BASE_Y - 70} C ${STACK_CX} ${v.y}, ${v.x + (v.x > STACK_CX ? -40 : 40)} ${v.y}, ${v.x} ${v.y + 16}`;
        return (
          <g key={i}>
            <Wire d={d} delay={i * 50} />
            <Signal d={d} delay={500 + i * 60} />
          </g>
        );
      })}
      {VIEWERS.map((v, i) => (
        <g key={i} className="spire-stagger" style={{ "--i": i } as CSSProperties}>
          <ViewerNodeMark x={v.x} y={v.y} size={26} />
        </g>
      ))}
      <PlateStack cx={STACK_CX} baseY={STACK_BASE_Y} count={5} gap={12} scale={1} startDelay={200} />
    </Diagram>
  );
}

export function ClosingCta({ siteUrl }: { siteUrl: string }) {
  return (
    <section id="start" className={cn(CONTAINER, "py-16 md:py-24")}>
      <Reveal>
        <div className="bg-terminal relative isolate overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-14">
          <div className="relative mx-auto mb-10 max-w-lg md:mb-14">
            <PayoffDiagram />
          </div>

          <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-center lg:gap-16">
            <div>
              <h2 className="text-terminal-foreground text-title text-balance">Share your next save.</h2>
              <p className="text-terminal-foreground/70 mt-3 max-w-[44ch] text-sm leading-relaxed sm:text-[15px]">
                Run a workshop, mentor across timezones, or let people watch you
                build.
              </p>
              <div className="mt-7">
                <InstallCommand siteUrl={siteUrl} tone="terminal" size="lg" />
              </div>
            </div>

            <div className="border-terminal-foreground/15 bg-terminal-foreground/[0.04] rounded-2xl border p-5 sm:p-6">
              <h3 className="text-terminal-foreground mb-4 text-[15px] font-semibold tracking-tight">
                Already have a link?
              </h3>
              <JoinForm />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
