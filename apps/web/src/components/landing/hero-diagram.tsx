"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

import { Diagram, DiagramNodeButton } from "@/components/landing/diagram/canvas";
import { FileNodeMark, Plate, Signal, ViewerNodeMark, Wire } from "@/components/landing/diagram/primitives";
import { HERO_FILES } from "@/lib/landing-demo";
import { cn } from "@/lib/utils";

const VB_W = 260;
const VB_H = 420;

const FILE_Y = 34;
const FILE_XS = [50, 130, 210];
const STACK_CX = 130;
const STACK_TOP_Y = 172;
const STACK_MID_Y = 198;
const STACK_BASE_Y = 224;
const FAN_Y = 246;
const VIEWER_Y = 372;
const VIEWER_XS = [66, 194];

function pct(value: number, total: number) {
  return (value / total) * 100;
}

function fileWirePath(fx: number) {
  return `M ${fx} ${FILE_Y + 11} C ${fx} ${FILE_Y + 52}, ${STACK_CX} ${STACK_TOP_Y - 44}, ${STACK_CX} ${STACK_TOP_Y - 11}`;
}

function fanWirePath(vx: number) {
  return `M ${STACK_CX} ${FAN_Y} C ${STACK_CX} ${FAN_Y + 60}, ${vx} ${VIEWER_Y - 60}, ${vx} ${VIEWER_Y - 15}`;
}

/**
 * The hero's visual centerpiece: files feed a spire of checkpoints, which
 * fans out to viewers. Each file node is a real button; click or Enter
 * "saves" it, a signal runs the wire it just drew, a fresh plate lands on
 * the stack, and the save fans back out to every viewer. One save animates
 * at a time, matching the one-focal-point rule the rest of the page follows.
 */
export function HeroDiagram() {
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [broadcast, setBroadcast] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t);
    },
    []
  );

  function save(index: number) {
    if (savingIndex !== null) {
      return;
    }
    const file = HERO_FILES[index];
    setSavingIndex(index);
    setAnnouncement(`Saved ${file}.`);
    const t1 = setTimeout(() => {
      setBroadcast((n) => n + 1);
      setAnnouncement(`Saved ${file}. Viewers received the update.`);
    }, 560);
    const t2 = setTimeout(() => setSavingIndex(null), 1300);
    timers.current.push(t1, t2);
  }

  return (
    <div className="relative">
      <Diagram viewBox={`0 0 ${VB_W} ${VB_H}`} className="mx-auto aspect-[13/21] max-w-[280px] sm:mx-0">
        {/* file -> stack wires */}
        {FILE_XS.map((fx, i) => (
          <Wire key={i} d={fileWirePath(fx)} delay={i * 70} />
        ))}
        {/* stack -> viewer wires */}
        {VIEWER_XS.map((vx, i) => (
          <Wire key={i} d={fanWirePath(vx)} delay={260 + i * 70} />
        ))}

        {/* file glyphs */}
        {FILE_XS.map((fx, i) => (
          <g key={i} className="spire-stagger" style={{ "--i": i } as CSSProperties}>
            <FileNodeMark x={fx} y={FILE_Y} />
          </g>
        ))}

        {/* checkpoint stack: two settled plates, one live plate that
            re-lands (remount) on every save */}
        <g className="spire-stagger" style={{ "--i": 3 } as CSSProperties}>
          <Plate x={STACK_CX} y={STACK_BASE_Y} dim />
          <Plate x={STACK_CX} y={STACK_MID_Y} rotate={-6} dim />
          <Plate key={broadcast} x={STACK_CX} y={STACK_TOP_Y} rotate={6} live animate className="spire-plate-in" />
        </g>

        {/* viewer glyphs */}
        {VIEWER_XS.map((vx, i) => (
          <g key={i} className="spire-stagger" style={{ "--i": 4 + i } as CSSProperties}>
            <ViewerNodeMark x={vx} y={VIEWER_Y} />
          </g>
        ))}

        {/* the active save's signal, file to stack */}
        {savingIndex !== null && (
          <Signal key={`f-${savingIndex}-${broadcast}`} d={fileWirePath(FILE_XS[savingIndex]!)} />
        )}
        {/* the fan-out, stack to every viewer */}
        {broadcast > 0 &&
          VIEWER_XS.map((vx, i) => <Signal key={`b-${broadcast}-${i}`} d={fanWirePath(vx)} delay={i * 60} />)}
      </Diagram>

      <div className="pointer-events-none absolute inset-0 mx-auto max-w-[280px] sm:mx-0">
        {FILE_XS.map((fx, i) => (
          <DiagramNodeButton
            key={HERO_FILES[i]}
            x={pct(fx, VB_W)}
            y={pct(FILE_Y, VB_H)}
            label={HERO_FILES[i]}
            onClick={() => save(i)}
            className={cn("text-foreground", savingIndex === i && "text-spire")}
            aria-label={`Save ${HERO_FILES[i]} and watch it broadcast`}
          />
        ))}
      </div>

      <p className="text-muted-foreground mt-4 text-center font-mono text-[11px] sm:text-left">
        Click a file to save it.
      </p>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
