"use client";

import { LinkIcon, RotateCcwIcon, SaveIcon, TerminalIcon } from "lucide-react";
import { type ComponentType, useEffect, useRef, useState } from "react";

import { FlowDiagram } from "@/components/landing/flow-diagram";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import { CONTAINER } from "@/components/landing/site-chrome";
import { cn } from "@/lib/utils";

const STEPS: {
  verb: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  body: string;
}[] = [
  {
    verb: "Run",
    icon: TerminalIcon,
    body: "spire start in a project folder. The CLI watches it and opens a session.",
  },
  {
    verb: "Share",
    icon: LinkIcon,
    body: "Send the link. It opens in a browser, no account and nothing to install.",
  },
  {
    verb: "Save",
    icon: SaveIcon,
    body: "Each save is hashed and batched into a checkpoint, then pushed over SSE.",
  },
  {
    verb: "Resume",
    icon: RotateCcwIcon,
    body: "Ctrl+C ends the broadcast. Run the same command again and the same link wakes back up.",
  },
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          const index = stepRefs.current.indexOf(entry.target as HTMLDivElement);
          if (index !== -1) {
            setActiveStep(index);
            setPulseKey((k) => k + 1);
          }
        }
      },
      { threshold: 0.6, rootMargin: "-20% 0px -20% 0px" }
    );
    for (const el of stepRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how" className={cn(CONTAINER, "py-16 md:py-24")}>
      <SectionHeading
        title="From your terminal to their browser."
        lead="The same flow, every time. Scroll to see which stage is active."
      />

      <div className="mt-10 grid grid-cols-1 gap-10 md:mt-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <FlowDiagram step={activeStep} pulseKey={pulseKey} />
        </Reveal>

        <div className="flex flex-col gap-16 py-2 sm:gap-20">
          {STEPS.map((step, i) => (
            <div
              key={step.verb}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              className="flex min-h-24 flex-col justify-center gap-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full font-mono text-[11px] transition-colors duration-200 ease-out",
                    activeStep === i ? "bg-spire-solid text-spire-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {i + 1}
                </span>
                <step.icon
                  className={cn(
                    "size-4 transition-colors duration-200 ease-out",
                    activeStep === i ? "text-foreground" : "text-muted-foreground"
                  )}
                  strokeWidth={1.5}
                />
                <h3 className="text-base font-semibold tracking-tight sm:text-lg">{step.verb}</h3>
              </div>
              <p className="text-muted-foreground max-w-[46ch] text-sm leading-relaxed text-pretty">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
