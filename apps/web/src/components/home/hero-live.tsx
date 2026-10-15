"use client";

import { LaptopIcon, PauseIcon, PlayIcon, ProjectorIcon, SmartphoneIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ComponentType,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Circuit } from "@/components/ui/circuit";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

/*
 * The hero moves on its own (the rotating pill, the circuit's signals), so it
 * carries one Pause control for both, per WCAG 2.2.2.
 */
const MotionContext = createContext<{ paused: boolean; toggle: () => void }>({
  paused: false,
  toggle: () => {},
});

export function HeroMotion({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const toggle = useCallback(() => setPaused((value) => !value), []);
  const value = useMemo(() => ({ paused, toggle }), [paused, toggle]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

const PHRASES = [
  "Running a workshop",
  "Pairing across timezones",
  "Building in public",
  "Reviewing a pull request",
];

/** "On air" sign with the situations biga is for, one at a time. */
export function OnAirPill() {
  const { paused } = useContext(MotionContext);
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % PHRASES.length), 2600);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div className="border-rail bg-background/70 inline-flex items-center gap-2.5 rounded-full border py-1 pr-4 pl-1">
      <span
        aria-hidden
        className="border-brand/50 bg-brand/10 text-brand-text font-pixel rounded-full border px-2 py-1 text-[0.6875rem] leading-none tracking-[0.1em]"
      >
        LIVE
      </span>
      <span className="font-body grid text-sm font-medium">
        {/* Every phrase sits in the same cell, invisible, so the pill is
            always as wide as the longest one and never jumps. */}
        {PHRASES.map((phrase) => (
          <span key={phrase} aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap">
            {phrase}
          </span>
        ))}
        <span className="relative col-start-1 row-start-1 overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={PHRASES[index]}
              className="block whitespace-nowrap"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={
                reduce
                  ? { opacity: 0, transition: { duration: 0.15 } }
                  : { opacity: 0, y: -12, filter: "blur(4px)", transition: { duration: 0.15, ease: "easeOut" } }
              }
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {PHRASES[index]}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </div>
  );
}

const VIEWERS: { id: string; label: string; Icon: ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { id: "laptop", label: "Laptop", Icon: LaptopIcon },
  { id: "projector", label: "Projector", Icon: ProjectorIcon },
  { id: "phone", label: "Phone", Icon: SmartphoneIcon },
];

const START = 41;

const CARD =
  "bg-card border-rail relative rounded-xl border transition-[border-color,opacity] duration-300 ease-out data-[circuit-pulse]:border-brand/70 data-[circuit-state=dimmed]:opacity-45";

/**
 * The whole product in one picture: a save leaves the editor, the CLI
 * batches it into a checkpoint, the server fans it out, and every open tab
 * catches up. Counts come from the signals themselves (`onArrive`), so the
 * number a viewer shows is the checkpoint that actually reached it.
 */
export function HeroCircuit({ host }: { host: string }) {
  const { paused, toggle } = useContext(MotionContext);
  const [checkpoint, setCheckpoint] = useState(START);
  const latest = useRef(START);
  const [seen, setSeen] = useState<Record<string, number>>({ laptop: START, projector: START, phone: START });

  const onArrive = useCallback((node: string) => {
    if (node === "cli") {
      latest.current += 1;
      setCheckpoint(latest.current);
      return;
    }
    if (node in { laptop: 1, projector: 1, phone: 1 }) {
      setSeen((current) => ({ ...current, [node]: latest.current }));
    }
  }, []);

  return (
    <div className="flex flex-col">
      <Circuit
        flow="save -> cli -> server -> laptop, projector, phone"
        autoPlay={!paused}
        interval={3}
        speed={220}
        radius={10}
        pinSpacing={10}
        onArrive={onArrive}
        traceClassName="text-foreground/20 dark:text-foreground/20"
        packetClassName="text-brand dark:text-brand"
        className="grid grid-cols-3 gap-x-3 gap-y-10 sm:gap-x-4 sm:gap-y-12"
      >
        <div data-circuit="save" className={cn(CARD, "col-span-3 mx-auto w-full max-w-[19rem] p-3.5")}>
          <div className="flex items-center justify-between gap-3">
            <Typography variant="label" tone="muted">
              Your editor
            </Typography>
            <kbd className="border-rail bg-muted text-muted-foreground rounded-md border px-1.5 py-0.5 font-mono text-[11px] leading-none">
              ⌘S
            </kbd>
          </div>
          <p translate="no" className="mt-2.5 truncate font-mono text-[13px]">
            src/client.ts
          </p>
          <div translate="no" className="mt-2 grid gap-0.5 font-mono text-[12px] leading-relaxed">
            <span className="bg-destructive/10 text-destructive -mx-1.5 rounded px-1.5">- const retries = 3;</span>
            <span className="bg-success/10 text-success -mx-1.5 rounded px-1.5">+ const retries = 5;</span>
          </div>
        </div>

        <div
          data-circuit="cli"
          className={cn(CARD, "bg-terminal text-terminal-foreground col-span-3 mx-auto w-full max-w-[19rem] border-white/10 p-3.5")}
        >
          <p translate="no" className="font-mono text-[13px]">
            <span className="text-brand-mark">$</span> biga start
          </p>
          <p className="mt-2 flex items-center justify-between gap-3 font-mono text-[12px] text-white/70">
            <span>checkpoint</span>
            <span className="text-brand-mark tabular-nums">#{checkpoint}</span>
          </p>
        </div>

        <div data-circuit="server" className={cn(CARD, "col-span-3 mx-auto w-full max-w-[19rem] px-3.5 py-3")}>
          <div className="flex items-center justify-between gap-3">
            <p translate="no" className="truncate font-mono text-[13px]">
              {host}
            </p>
            <Typography variant="label" tone="muted" className="shrink-0">
              SSE
            </Typography>
          </div>
        </div>

        {VIEWERS.map(({ id, label, Icon }) => (
          <div key={id} data-circuit={id} className={cn(CARD, "flex flex-col items-center gap-1.5 px-2 py-3 text-center")}>
            <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
            <span className="font-body text-[13px] font-medium">{label}</span>
            <span className="text-brand-text font-mono text-[12px] tabular-nums">#{seen[id]}</span>
          </div>
        ))}
      </Circuit>

      <button
        type="button"
        onClick={toggle}
        aria-pressed={paused}
        className="border-rail bg-background text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 font-body mt-5 ml-auto flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-[3px]"
      >
        {paused ? <PlayIcon className="size-3" strokeWidth={2} /> : <PauseIcon className="size-3" strokeWidth={2} />}
        {paused ? "Play" : "Pause"}
      </button>
    </div>
  );
}
