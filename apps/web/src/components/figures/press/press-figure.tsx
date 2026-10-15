import "@/components/iso/iso.css";

import { figureSvg } from "@/components/iso/iso-kit.mjs";

import { buildPress, HEIGHT, WIDTH } from "./art.mjs";
import { IDLE_MS } from "./model.mjs";
import { PressLive } from "./press-live";

/** Checkpoints already on the stack when the page loads. */
const INITIAL = 3;

const LABEL =
  "An isometric drawing of a checkpoint press on a bench. A save key on the left is wired to a timer dial, " +
  "whose needle measures quiet time since the last save and snaps back to zero on every save. " +
  `After ${IDLE_MS} milliseconds of quiet a press stamps one ticket onto a stack of checkpoints, ` +
  "unless the saves changed nothing, in which case it stays up.";

/** How a burst of saves becomes one checkpoint, and an unchanged save becomes none. */
export function PressFigure() {
  const svg = figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: buildPress({ shown: INITIAL }) });

  return (
    <figure className="iso iso-figure">
      <PressLive svg={svg} initial={INITIAL} />
    </figure>
  );
}
