"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { type ChangeEvent, useId, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
] as const;

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

const subscribe = () => () => {};

/**
 * Turns every CSS transition off until the returned function is called.
 *
 * next-themes does this itself (`disableTransitionOnChange`), but it lifts the
 * block one tick after the class flips, which is before a view transition has
 * painted its new snapshot. Every `transition-colors` element then fades from
 * the old palette under the circular wipe, each at its own pace: the flicker.
 * Holding the block until the transition has finished keeps the swap atomic.
 */
function suppressTransitions() {
  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  return () => {
    // Flush styles so the new theme is committed before transitions return.
    void window.getComputedStyle(document.body).opacity;
    style.remove();
  };
}

/**
 * The embedded demo viewer is its own document with its own next-themes,
 * which only learns of a change through a `storage` event a moment later.
 * Flipping it inside the same transition keeps it from lagging behind.
 */
function syncFrames(resolved: string) {
  for (const frame of document.querySelectorAll("iframe")) {
    try {
      const root = frame.contentDocument?.documentElement;
      if (!root) continue;
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
      root.style.colorScheme = resolved;
    } catch {
      // Cross-origin frame: nothing to sync.
    }
  }
}

/**
 * Light, dark or follow the system, as three radios in one pill. Native
 * radios give arrow-key movement and a single tab stop for free. The theme
 * is unknown until hydration, so nothing is checked on the server.
 *
 * Where the View Transitions API exists, the new theme wipes in as a circle
 * from the chosen segment; reduced motion swaps instantly.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const name = useId();

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    const doc = document as ViewTransitionDocument;
    const nextResolved =
      next === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : next;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const release = suppressTransitions();

    if (!doc.startViewTransition || still || nextResolved === resolvedTheme) {
      setTheme(next);
      syncFrames(nextResolved);
      requestAnimationFrame(() => requestAnimationFrame(release));
      return;
    }

    const box = event.target.parentElement?.getBoundingClientRect();
    const x = box ? box.left + box.width / 2 : window.innerWidth;
    const y = box ? box.top + box.height / 2 : 0;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = doc.startViewTransition(() => {
      flushSync(() => setTheme(next));
      syncFrames(nextResolved);
    });
    void transition.finished.then(release, release);
    void transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 480, easing: "cubic-bezier(0.32, 0.72, 0, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    });
  }

  return (
    <fieldset
      className={cn(
        "border-rail bg-background flex h-9 items-center gap-0.5 rounded-full border p-0.5",
        className
      )}
    >
      <legend className="sr-only">Theme</legend>
      {OPTIONS.map(({ value, label, Icon }) => (
        <label
          key={value}
          className={cn(
            "relative grid size-7 cursor-pointer place-items-center rounded-full transition-colors duration-150",
            "text-muted-foreground hover:text-foreground has-checked:bg-muted has-checked:text-foreground",
            "has-focus-visible:ring-ring/50 has-focus-visible:ring-[3px]"
          )}
        >
          <input
            type="radio"
            name={name}
            value={value}
            checked={mounted ? theme === value : false}
            onChange={onChange}
            className="sr-only"
          />
          <Icon aria-hidden className="size-3.5" strokeWidth={1.75} />
          <span className="sr-only">{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
