"use client";

import { useEffect, useRef, useState } from "react";

import { PauseButton } from "@/components/home/pause-button";
import { translateAlong } from "@/components/iso/iso-kit.mjs";
import { Button } from "@/components/ui/button";

import { KEY_TRAVEL, needleAt, P, RAM_REST, stackTop } from "./art.mjs";
import { createModel, DIAL_MAX_MS, save, STACK_MAX, step } from "./model.mjs";

/*
 * Moves the press. One frame loop reads the model and writes attributes on
 * the parts the server drew (`data-part`); nothing re-renders per frame.
 *
 *   key      dips KEY_TRAVEL on every save
 *   needle   reads the model's quiet time; snaps back to 0 on a save
 *   ram      descends to the stack when a batch with changes is ready;
 *            the new ticket appears under it at contact, so it never pops
 *   lamp     glows while a checkpoint goes out
 *
 * An idle tour plays a burst of three saves, then one save that changes
 * nothing. Any input pauses the tour; it resumes after a quiet spell.
 * Offscreen it stops; under reduced motion nothing animates and a save
 * resolves at once.
 */

type Event = { at: number; changed: boolean };
const TOUR: Event[] = [
  { at: 0.8, changed: true },
  { at: 1.4, changed: true },
  { at: 1.9, changed: true },
  { at: 6.2, changed: false },
];
const TOUR_LENGTH = 10.5;
const RESUME_AFTER = 6;

type Spring = { at: number; rate: number };
function spring(state: Spring, target: number, dt: number, stiffness: number, damping: number) {
  const steps = Math.max(1, Math.ceil(dt * 240));
  const slice = dt / steps;
  for (let i = 0; i < steps; i++) {
    state.rate += ((target - state.at) * stiffness - state.rate * damping) * slice;
    state.at += state.rate * slice;
  }
  if (Math.abs(target - state.at) < 1e-3 && Math.abs(state.rate) < 1e-3) {
    state.at = target;
    state.rate = 0;
  }
}
const follow = (current: number, target: number, dt: number, seconds: number) =>
  Math.abs(target - current) < 0.05 ? target : current + (target - current) * (1 - Math.exp(-dt / seconds));

export function PressLive({ svg, initial }: { svg: string; initial: number }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLSpanElement>(null);
  const api = useRef<{ press: (changed: boolean) => void; hold: (paused: boolean) => void } | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const part = <T extends Element>(name: string) => stage.querySelector<T>(`[data-part="${name}"]`);
    const key = part<SVGGElement>("key");
    const needle = part<SVGPathElement>("needle");
    const ram = part<SVGGElement>("ram");
    const lamp = part<SVGGElement>("lamp");
    const tickets = [...stage.querySelectorAll<SVGGElement>('[data-part="ticket"]')];
    if (!key || !needle || !ram || !lamp) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const model = createModel();
    model.checkpoints = initial;
    let shown = Math.min(initial, STACK_MAX);

    const keyZ: Spring = { at: 0, rate: 0 };
    const ramZ: Spring = { at: 0, rate: 0 };
    let keyHold = 0;
    let needleMs = 0;
    let ramPhase: "rest" | "down" | "up" = "rest";
    let lampFor = 0;
    let clock = 0;
    let touring = !still.matches;
    let held = false; // the visitor paused the tour
    let idle = 0;
    let visible = false;
    let frame = 0;
    let last = 0;
    let announce = false;

    const showStack = () => {
      tickets.forEach((ticket, i) => {
        ticket.style.display = i < shown ? "" : "none";
        const solid = ticket.firstElementChild;
        if (i === shown - 1) solid?.setAttribute("data-lit", "");
        else solid?.removeAttribute("data-lit");
      });
    };

    const land = () => {
      shown = Math.min(shown + 1, STACK_MAX);
      showStack();
      lampFor = 0.9;
      lamp.setAttribute("data-on", "");
    };

    const contactOffset = () => -(RAM_REST - stackTop(Math.min(shown + 1, STACK_MAX)));

    const draw = () => {
      key.setAttribute("transform", translateAlong(P, [0, 0, -keyZ.at]));
      ram.setAttribute("transform", translateAlong(P, [0, 0, ramZ.at]));
      needle.setAttribute("d", needleAt(Math.min(needleMs, DIAL_MAX_MS)));
    };

    const resolve = (outcome: "send" | "skip" | null) => {
      if (!outcome) return;
      if (outcome === "send") ramPhase = "down";
      if (announce && announceRef.current) {
        announceRef.current.textContent =
          outcome === "send" ? `Checkpoint ${model.checkpoints} sent.` : "Same hash, nothing sent.";
        announce = false;
      }
    };

    const doSave = (changed: boolean) => {
      save(model, changed);
      keyHold = 0.12;
      if (still.matches) {
        // No motion: settle the batch now and show the result.
        resolve(step(model, 60));
        if (ramPhase === "down") {
          land();
          ramPhase = "rest";
          lamp.removeAttribute("data-on");
        }
        needleMs = 0;
        draw();
      }
    };

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;

      if (touring) {
        const before = clock;
        clock += dt;
        for (const event of TOUR) {
          if (before < event.at && clock >= event.at) doSave(event.changed);
        }
        if (clock >= TOUR_LENGTH) clock = 0;
      } else {
        idle += dt;
        if (!held && idle > RESUME_AFTER && model.pending === 0 && ramPhase === "rest") {
          touring = true;
          clock = 0;
        }
      }

      resolve(step(model, dt));

      // Needle: tracks quiet time while a batch waits, then eases home.
      needleMs = model.pending > 0 ? model.quiet : follow(needleMs, 0, dt, 0.18);

      keyHold = Math.max(0, keyHold - dt);
      spring(keyZ, keyHold > 0 ? KEY_TRAVEL : 0, dt, 900, 42);

      if (ramPhase === "down") {
        const target = contactOffset();
        spring(ramZ, target, dt, 260, 30);
        if (ramZ.at <= target + 0.25) {
          land();
          ramPhase = "up";
        }
      } else {
        spring(ramZ, 0, dt, 120, 22);
        if (ramPhase === "up" && ramZ.at === 0) ramPhase = "rest";
      }

      if (lampFor > 0) {
        lampFor -= dt;
        if (lampFor <= 0) lamp.removeAttribute("data-on");
      }

      draw();
      frame = visible ? requestAnimationFrame(tick) : 0;
    };

    const run = () => {
      if (!frame && visible && !still.matches) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    api.current = {
      hold: (value) => {
        held = value;
        touring = !value && !still.matches;
        idle = 0;
        clock = 0;
        run();
      },
      press: (changed) => {
        touring = false;
        idle = 0;
        announce = true;
        doSave(changed);
        run();
      },
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visible = Boolean(entries.at(-1)?.isIntersecting);
        if (visible) run();
      },
      { rootMargin: "80px 0px" }
    );
    observer.observe(stage);

    const onStill = () => {
      touring = !still.matches && !held;
      if (still.matches) {
        cancelAnimationFrame(frame);
        frame = 0;
        ramZ.at = 0;
        keyZ.at = 0;
        needleMs = 0;
        draw();
      } else run();
    };
    still.addEventListener("change", onStill);

    showStack();
    draw();

    return () => {
      observer.disconnect();
      still.removeEventListener("change", onStill);
      cancelAnimationFrame(frame);
      api.current = null;
    };
  }, [initial]);

  return (
    <>
      <div className="iso-plate">
        <div
          ref={stageRef}
          className="iso-stage press cursor-pointer"
          onClick={() => api.current?.press(true)}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <span ref={announceRef} aria-live="polite" className="sr-only" />
      <div className="press-controls">
        <Button type="button" className="rounded-full" onClick={() => api.current?.press(true)}>
          Save an edit
        </Button>
        <Button type="button" variant="outline" className="rounded-full" onClick={() => api.current?.press(false)}>
          Save, no changes
        </Button>
        <PauseButton
          paused={paused}
          pauseLabel="Pause tour"
          playLabel="Play tour"
          className="ml-auto"
          onToggle={() => {
            api.current?.hold(!paused);
            setPaused(!paused);
          }}
        />
      </div>
    </>
  );
}

