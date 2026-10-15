"use client";

import { Diagram, DiagramLabel } from "@/components/landing/diagram/canvas";
import { Plate, Signal, ViewerNodeMark, Wire } from "@/components/landing/diagram/primitives";
import { cn } from "@/lib/utils";

const VB_W = 600;
const VB_H = 220;

const CLI_X = 60;
const CLI_Y = 110;
const STACK_CX = 300;
const STACK_Y = 110;
const VIEWER_X = 540;
const VIEWER_YS = [68, 152];

const RUN_WIRE = `M ${CLI_X + 34} ${CLI_Y} H ${STACK_CX - 34}`;
const SHARE_WIRES = VIEWER_YS.map(
  (vy) => `M ${STACK_CX + 30} ${STACK_Y} C ${STACK_CX + 90} ${STACK_Y}, ${VIEWER_X - 70} ${vy}, ${VIEWER_X - 18} ${vy}`
);

function CliGlyph({ dimmed }: { dimmed?: boolean }) {
  return (
    <g className="transition-opacity duration-200 ease-out" style={{ opacity: dimmed ? 0.35 : 1 }}>
      <rect
        x={CLI_X - 26}
        y={CLI_Y - 18}
        width={52}
        height={36}
        rx={5}
        fill="var(--card)"
        stroke="var(--diagram-wire-strong)"
        strokeWidth={1.25}
      />
      <path d={`M ${CLI_X - 15} ${CLI_Y - 5} l 7 5 l -7 5`} stroke="var(--spire-accent)" strokeWidth={1.75} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/**
 * The run-share-save-resume flow, one persistent diagram whose active stage
 * is emphasized by the current step rather than redrawn from scratch.
 * `step` is 0-3; `pulseKey` changes to replay that stage's signal.
 */
export function FlowDiagram({ step, pulseKey }: { step: number; pulseKey: number }) {
  const viewersDim = step === 3;

  return (
    <Diagram
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="aspect-[600/220]"
      overlay={
        <>
          <DiagramLabel x={(CLI_X / VB_W) * 100} y={((CLI_Y + 32) / VB_H) * 100} align="center">
            spire start
          </DiagramLabel>
          <DiagramLabel x={(VIEWER_X / VB_W) * 100} y={((VIEWER_YS[0]! - 26) / VB_H) * 100} align="center">
            viewers
          </DiagramLabel>
        </>
      }
    >
      <Wire d={RUN_WIRE} className={cn(step === 0 && "spire-wire-strong")} />
      {SHARE_WIRES.map((d, i) => (
        <Wire key={i} d={d} delay={i * 60} className={cn(step === 1 && "spire-wire-strong")} />
      ))}

      <CliGlyph dimmed={false} />

      <Plate x={STACK_CX} y={STACK_Y + 26} dim />
      <Plate x={STACK_CX} y={STACK_Y + 2} rotate={-6} dim />
      <Plate
        key={step === 2 ? pulseKey : "idle"}
        x={STACK_CX}
        y={STACK_Y - 22}
        rotate={6}
        live
        animate={step === 2}
        className="spire-plate-in"
      />

      {VIEWER_YS.map((vy, i) => (
        <g key={i} className="transition-opacity duration-300 ease-out" style={{ opacity: viewersDim ? 0.3 : 1 }}>
          <ViewerNodeMark x={VIEWER_X} y={vy} />
        </g>
      ))}

      {(step === 0 || step === 2 || step === 3) && <Signal key={`run-${pulseKey}`} d={RUN_WIRE} />}
      {(step === 1 || step === 2 || step === 3) &&
        SHARE_WIRES.map((d, i) => <Signal key={`share-${pulseKey}-${i}`} d={d} delay={220 + i * 60} />)}
    </Diagram>
  );
}
