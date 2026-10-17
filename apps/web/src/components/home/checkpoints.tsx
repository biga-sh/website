import { PressFigure } from "@/components/figures/press/press-figure";
import { IDLE_MS, MAX_WAIT_MS } from "@/components/figures/press/model.mjs";
import { Section } from "@/components/site/frame";
import { Typography } from "@/components/ui/typography";

const FACTS = [
  { value: "SHA-256", label: "per file", body: "Bytes that match the last upload never leave your machine." },
  { value: `${IDLE_MS} ms`, label: "of quiet", body: "A burst of saves waits until the folder settles, then goes as one." },
  { value: `${MAX_WAIT_MS / 1000} s`, label: "at most", body: "A long burst still flushes every second, so nobody waits on you." },
  { value: "All", label: "kept", body: "Every checkpoint stays in the session for viewers to step back through." },
];

export function Checkpoints() {
  return (
    <Section id="checkpoints">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
        <div className="flex flex-col gap-4 lg:pt-6">
          <Typography variant="label" tone="brand" className="flex items-center gap-2.5">
            <span aria-hidden className="bg-brand-mark size-2 shrink-0 rotate-45" />
            02 / Checkpoints
          </Typography>
          <Typography variant="h2">Every save becomes a checkpoint.</Typography>
          <Typography variant="lead" tone="muted">
            biga hashes each file it reads. A burst of saves goes out as one checkpoint, and a save that changes
            nothing sends nothing.
          </Typography>

          <dl className="border-rail mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-[var(--rail)]">
            {FACTS.map((fact) => (
              <div key={fact.value} className="bg-background flex flex-col gap-2 p-4">
                <dt className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                  <span className="font-display text-xl font-bold tracking-[-0.02em] whitespace-nowrap tabular-nums">
                    {fact.value}
                  </span>
                  <Typography variant="label" tone="muted">
                    {fact.label}
                  </Typography>
                </dt>
                <dd>
                  <Typography variant="small" tone="muted">
                    {fact.body}
                  </Typography>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <PressFigure />
      </div>
    </Section>
  );
}
