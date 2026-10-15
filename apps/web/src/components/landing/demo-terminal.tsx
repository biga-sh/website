"use client";

import { RotateCcwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  DEMO_INTRO_LINE,
  DEMO_SHUTDOWN_LINES,
  demoOutputLines,
  demoTypedCommands,
  type TermLine,
} from "@/lib/landing-demo";
import { useInView } from "@/lib/use-in-view";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<TermLine["tone"], string> = {
  rail: "text-terminal-foreground/35",
  accent: "text-terminal-accent",
  muted: "text-terminal-foreground/60",
  foreground: "text-terminal-foreground",
};

const SPINNER_FRAMES = ["◒", "◐", "◓", "◑"];
const TYPE_MS = 26;

function Row({ glyph, tone, text }: TermLine) {
  return (
    <div className="flex gap-2.5">
      <span aria-hidden className={cn("w-2.5 shrink-0", TONE_CLASS[tone])}>
        {glyph}
      </span>
      <span className={cn("min-w-0 [overflow-wrap:anywhere]", TONE_CLASS[tone])}>{text || " "}</span>
    </div>
  );
}

/**
 * A scripted, labelled re-enactment of a real `spire start` run against this
 * repository: typed commands, then verbatim `@clack/prompts` output in its
 * real order. Plays once on arrival; a Replay button re-runs it on demand.
 * `prefers-reduced-motion` skips straight to the finished transcript.
 */
export function DemoTerminal({ siteUrl, shareUrl }: { siteUrl: string; shareUrl: string }) {
  const reducedMotion = useReducedMotion();
  const [containerRef, inView] = useInView<HTMLDivElement>({ threshold: 0.35 });

  const [cmd1, setCmd1] = useState("");
  const [cmd2, setCmd2] = useState("");
  const [typingStage, setTypingStage] = useState<0 | 1 | 2>(0);
  const [spinnerOn, setSpinnerOn] = useState(false);
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const [outputCount, setOutputCount] = useState(0);
  const [ctrlC, setCtrlC] = useState(false);
  const [shutdownCount, setShutdownCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const spinnerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const commands = demoTypedCommands(siteUrl);
  const outputLines = demoOutputLines(shareUrl);

  function clearAll() {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
    if (spinnerInterval.current) {
      clearInterval(spinnerInterval.current);
      spinnerInterval.current = null;
    }
  }

  function after(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms));
  }

  function showFinal() {
    setCmd1(commands[0]);
    setCmd2(commands[1]);
    setTypingStage(2);
    setSpinnerOn(false);
    setOutputCount(outputLines.length);
    setCtrlC(true);
    setShutdownCount(DEMO_SHUTDOWN_LINES.length);
    setFinished(true);
  }

  function run() {
    clearAll();
    setCmd1("");
    setCmd2("");
    setTypingStage(0);
    setSpinnerOn(false);
    setOutputCount(0);
    setCtrlC(false);
    setShutdownCount(0);
    setFinished(false);

    if (reducedMotion) {
      showFinal();
      return;
    }

    let i = 0;
    const typeCmd1 = () => {
      i += 1;
      setCmd1(commands[0].slice(0, i));
      if (i < commands[0].length) after(typeCmd1, TYPE_MS);
      else after(startCmd2, 280);
    };

    let j = 0;
    const typeCmd2 = () => {
      j += 1;
      setCmd2(commands[1].slice(0, j));
      if (j < commands[1].length) after(typeCmd2, TYPE_MS);
      else after(startSpinner, 340);
    };
    function startCmd2() {
      setTypingStage(1);
      typeCmd2();
    }

    function startSpinner() {
      setTypingStage(2);
      setSpinnerOn(true);
      let frame = 0;
      spinnerInterval.current = setInterval(() => {
        frame += 1;
        setSpinnerFrame(frame % SPINNER_FRAMES.length);
      }, 110);
      after(() => {
        if (spinnerInterval.current) {
          clearInterval(spinnerInterval.current);
          spinnerInterval.current = null;
        }
        setSpinnerOn(false);
        revealOutput(0);
      }, 460);
    }

    function revealOutput(index: number) {
      if (index >= outputLines.length) {
        after(() => {
          setCtrlC(true);
          after(() => revealShutdown(0), 480);
        }, 1150);
        return;
      }
      setOutputCount(index + 1);
      const delay = outputLines[index]!.text.startsWith("Synced") ? 420 : 110;
      after(() => revealOutput(index + 1), delay);
    }

    function revealShutdown(index: number) {
      if (index >= DEMO_SHUTDOWN_LINES.length) {
        setFinished(true);
        return;
      }
      setShutdownCount(index + 1);
      after(() => revealShutdown(index + 1), 220);
    }

    typeCmd1();
  }

  useEffect(() => {
    if (!inView) {
      return;
    }
    run();
    return clearAll;
    // Runs once when the terminal first enters view (`useInView`'s default
    // `once: true`); `reducedMotion` is read fresh inside `run` itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  useEffect(() => clearAll, []);

  return (
    <div
      ref={containerRef}
      translate="no"
      className="bg-terminal border-terminal-foreground/10 flex h-full flex-col overflow-hidden rounded-2xl border"
    >
      <div className="border-terminal-foreground/10 flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-terminal-foreground/60 font-mono text-xs">~/spire</span>
        {!reducedMotion && (
          <button
            type="button"
            onClick={run}
            className="text-terminal-foreground/50 hover:text-terminal-foreground focus-visible:ring-terminal-accent/50 flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] outline-none transition-[opacity,color] duration-150 ease-out focus-visible:ring-[3px]"
            style={{ opacity: finished ? 1 : 0, pointerEvents: finished ? "auto" : "none" }}
          >
            <RotateCcwIcon className="size-3" strokeWidth={1.5} />
            Replay
          </button>
        )}
      </div>

      <div
        aria-live="off"
        aria-label="Terminal output: a recorded run of spire start against this repository"
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-3.5 font-mono text-[11px] leading-relaxed sm:text-[12px]"
      >
        <div className="flex gap-2.5">
          <span aria-hidden className="text-terminal-accent shrink-0">
            $
          </span>
          <span className="text-terminal-foreground min-w-0 [overflow-wrap:anywhere]">
            {cmd1}
            {typingStage === 0 && <span className="spire-caret-el" />}
          </span>
        </div>

        {typingStage >= 1 && (
          <div className="flex gap-2.5">
            <span aria-hidden className="text-terminal-accent shrink-0">
              $
            </span>
            <span className="text-terminal-foreground min-w-0 [overflow-wrap:anywhere]">
              {cmd2}
              {typingStage === 1 && <span className="spire-caret-el" />}
            </span>
          </div>
        )}

        {typingStage === 2 && (
          <>
            <Row {...DEMO_INTRO_LINE} />
            {spinnerOn && <Row glyph={SPINNER_FRAMES[spinnerFrame]!} tone="accent" text="Starting spire…" />}
            {outputLines.slice(0, outputCount).map((line, i) => (
              <Row key={i} {...line} />
            ))}
            {ctrlC && (
              <div className="flex gap-2.5">
                <span aria-hidden className="text-terminal-foreground/35 w-2.5 shrink-0">
                  │
                </span>
                <span className="text-terminal-foreground/45">^C</span>
              </div>
            )}
            {DEMO_SHUTDOWN_LINES.slice(0, shutdownCount).map((line, i) => (
              <Row key={i} {...line} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
