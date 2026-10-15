// The truth the figure moves by, taken from the biga CLI's defaults:
//   BIGA_IDLE_MS      120   quiet time after the last change before a checkpoint is sent
//   BIGA_MAX_WAIT_MS  1000  longest a burst of changes can delay a checkpoint
// A save whose bytes hash (SHA-256) the same as what was last sent changes
// nothing, so it sends nothing. Time in the figure runs at 1/SLOW speed.

export const IDLE_MS = 120;
export const MAX_WAIT_MS = 1000;
export const DIAL_MAX_MS = 200;
export const SLOW = 10;
export const STACK_MAX = 8;

/** A fresh model: nothing pending, no checkpoints yet. */
export function createModel() {
  return {
    pending: 0, // saves waiting in the current batch
    changed: false, // whether any of them changed bytes
    quiet: 0, // ms since the last save, in real (not slowed) time
    waited: 0, // ms since the first save of the batch
    checkpoints: 0,
    lastBatch: 0,
    result: "idle", // "idle" | "waiting" | "sent" | "unchanged"
  };
}

/** A save arrives. `changed` is false when its bytes match what was last sent. */
export function save(model, changed) {
  if (model.pending === 0) model.waited = 0;
  model.pending += 1;
  model.changed = model.changed || changed;
  model.quiet = 0;
  model.result = "waiting";
}

/**
 * Advance by `dt` seconds of figure time. Returns "send" when a batch with
 * changes is ready (the press should fire), "skip" when the batch hashed
 * the same as last time, or null.
 */
export function step(model, dt) {
  if (model.pending === 0) return null;
  const ms = (dt * 1000) / SLOW;
  model.quiet += ms;
  model.waited += ms;
  if (model.quiet < IDLE_MS && model.waited < MAX_WAIT_MS) return null;
  const outcome = model.changed ? "send" : "skip";
  model.lastBatch = model.pending;
  model.pending = 0;
  model.changed = false;
  if (outcome === "send") {
    model.checkpoints += 1;
    model.result = "sent";
  } else {
    model.result = "unchanged";
  }
  return outcome;
}

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

/** The card's readout for the current state. */
export function readoutOf(model) {
  if (model.result === "waiting") {
    return `${plural(model.pending, "save", "saves")} · quiet ${Math.min(model.quiet, IDLE_MS).toFixed(0)} ms`;
  }
  if (model.result === "sent") {
    return `checkpoint #${model.checkpoints} · ${plural(model.lastBatch, "save", "saves")}`;
  }
  if (model.result === "unchanged") return "same hash · nothing sent";
  return "waiting for a save";
}
