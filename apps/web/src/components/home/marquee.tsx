import { Fragment } from "react";

const USES = [
  "Workshops",
  "Pair programming",
  "Code review",
  "Livestreams",
  "Teaching",
  "Mentoring",
  "Demo days",
  "Onboarding",
  "Interviews",
];

/** One full set of items, ending in a separator so two sets join seamlessly. */
function Set({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {USES.map((use) => (
        <Fragment key={use}>
          <li className="font-pixel px-5 text-sm leading-none tracking-[0.1em] whitespace-nowrap uppercase sm:px-7 sm:text-base">
            {use}
          </li>
          <li aria-hidden className="bg-brand-mark-foreground size-2 shrink-0 rotate-45" />
        </Fragment>
      ))}
    </ul>
  );
}

/**
 * A full-bleed ticker of what biga gets used for, in the highlighter green.
 * It is decoration that restates the hero's pill, so one copy is hidden from
 * assistive tech; it pauses under the pointer and stops for reduced motion.
 */
export function Marquee() {
  return (
    <div
      role="region"
      aria-label="What biga is for"
      className="biga-marquee bg-brand-mark text-brand-mark-foreground border-rail overflow-hidden border-b py-4"
    >
      <div className="biga-marquee-track flex w-max items-center">
        <Set />
        <Set hidden />
      </div>
    </div>
  );
}
