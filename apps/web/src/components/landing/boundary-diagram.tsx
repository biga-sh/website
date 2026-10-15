import { Diagram, DiagramLabel } from "@/components/landing/diagram/canvas";
import { FileNodeMark, Signal, ViewerNodeMark, Wire } from "@/components/landing/diagram/primitives";
import { BOUNDARY_ROWS, type BoundaryState } from "@/lib/landing-demo";
import { cn } from "@/lib/utils";

const VB_W = 560;
const VB_H = 336;

const FILE_X = 26;
const BOUNDARY_X = 300;
const STOP_X = 260;
const LISTED_X = 330;
const LINK_X = 350;
const VIEWER_X = 470;
const VIEWER_Y = 28;
const ROWS_START_Y = 78;
const ROW_H = 38;

function rowY(i: number) {
  return ROWS_START_Y + i * ROW_H;
}

function endX(state: BoundaryState) {
  if (state === "sent") return LINK_X;
  if (state === "listed") return LISTED_X;
  return STOP_X;
}

function toneFor(state: BoundaryState) {
  if (state === "sent") return "text-foreground";
  if (state === "listed") return "text-muted-foreground";
  return "text-muted-foreground";
}

/**
 * What crosses the line between your machine and the link. One wire per
 * file in this repository's own ignore rules: a full crossing for a tracked
 * file, a short stub for a listed-only entry, and a stop before the
 * boundary for anything ignored or over the size limit.
 */
export function BoundaryDiagram() {
  const sentIndex = BOUNDARY_ROWS.findIndex((row) => row.state === "sent");

  return (
    <Diagram
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="aspect-[560/336]"
      overlay={
        <>
          <DiagramLabel x={(10 / VB_W) * 100} y={(20 / VB_H) * 100} align="start">
            your machine
          </DiagramLabel>
          <DiagramLabel x={(BOUNDARY_X / VB_W) * 100} y={(12 / VB_H) * 100} align="center">
            the link
          </DiagramLabel>
          <DiagramLabel
            x={((VIEWER_X - 70) / VB_W) * 100}
            y={((VIEWER_Y + 44) / VB_H) * 100}
            align="start"
            className="text-[10px]"
          >
            no write path
          </DiagramLabel>
          {BOUNDARY_ROWS.map((row, i) => (
            <span key={row.path}>
              <DiagramLabel
                x={((FILE_X + 20) / VB_W) * 100}
                y={(rowY(i) / VB_H) * 100}
                align="start"
                className={toneFor(row.state)}
              >
                {row.path}
              </DiagramLabel>
              <DiagramLabel x={98} y={(rowY(i) / VB_H) * 100} align="end" className="text-[10px]">
                {row.note}
              </DiagramLabel>
            </span>
          ))}
        </>
      }
    >
      {/* the boundary */}
      <line
        x1={BOUNDARY_X}
        y1={12}
        x2={BOUNDARY_X}
        y2={VB_H - 12}
        stroke="var(--diagram-wire-strong)"
        strokeWidth={1.25}
        strokeDasharray="3 4"
      />

      {/* viewer + no-write-path annotation, above the rows */}
      <ViewerNodeMark x={VIEWER_X} y={VIEWER_Y} />
      <g className="text-muted-foreground" stroke="currentColor" strokeWidth={1.25} fill="none">
        <path d={`M ${VIEWER_X - 46} ${VIEWER_Y + 30} h 24 l -6 -5 m 6 5 l -6 5`} strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M ${VIEWER_X - 50} ${VIEWER_Y + 22} l 32 16`} stroke="var(--destructive)" />
      </g>

      {/* the one wire that actually crosses and reaches the viewer */}
      {sentIndex !== -1 && (
        <>
          <Wire
            d={`M ${FILE_X + 14} ${rowY(sentIndex)} C ${LINK_X - 40} ${rowY(sentIndex)}, ${LINK_X} ${VIEWER_Y + 10}, ${VIEWER_X - 18} ${VIEWER_Y + 2}`}
            delay={120}
          />
          <Signal
            d={`M ${FILE_X + 14} ${rowY(sentIndex)} C ${LINK_X - 40} ${rowY(sentIndex)}, ${LINK_X} ${VIEWER_Y + 10}, ${VIEWER_X - 18} ${VIEWER_Y + 2}`}
            delay={700}
          />
        </>
      )}

      {BOUNDARY_ROWS.map((row, i) => {
        const y = rowY(i);
        const end = endX(row.state);
        return (
          <g key={row.path}>
            <Wire d={`M ${FILE_X + 14} ${y} H ${end}`} delay={i * 50} className={cn(row.state !== "sent" && "opacity-70")} />
            <FileNodeMark x={FILE_X} y={y} size={18} />
            {row.state === "listed" && (
              <rect x={end - 4} y={y - 4} width={8} height={8} fill="none" stroke="var(--diagram-wire-strong)" strokeWidth={1.25} />
            )}
            {(row.state === "ignored" || row.state === "oversize") && (
              <circle cx={end} cy={y} r={3} fill="none" stroke="var(--diagram-wire-strong)" strokeWidth={1.25} />
            )}
          </g>
        );
      })}
    </Diagram>
  );
}
