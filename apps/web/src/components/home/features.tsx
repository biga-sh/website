import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { FeatureTimeline } from "@/components/home/features-live";
import { WorkspaceDiagram } from "@/components/home/workspace-diagram";
import { INSET, Section, SectionHeader } from "@/components/site/frame";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

/*
 * Five things worth knowing, as ruled cells (the page's rails continue
 * through the grid as 1px gaps). Each cell carries a real artefact rather
 * than an icon: the config file, the command, the shortcut.
 */
function Cell({
  tag,
  title,
  body,
  className,
  filled = false,
  children,
}: {
  tag: string;
  title: string;
  body: ReactNode;
  className?: string;
  /** Painted in the highlighter green: the one cell that gets to shout. */
  filled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group/cell flex flex-col gap-3 p-5 transition-colors duration-200 sm:p-7",
        filled
          ? "bg-brand-mark text-brand-mark-foreground"
          : "bg-background hover:bg-[color-mix(in_oklab,var(--brand-mark)_7%,var(--background))]",
        className
      )}
    >
      <Typography variant="label" tone={filled ? "inherit" : "brand"} className={filled ? "opacity-70" : undefined}>
        {tag}
      </Typography>
      <Typography variant="h3">{title}</Typography>
      <Typography variant="small" tone={filled ? "inherit" : "muted"} className={cn("max-w-[46ch]", filled && "opacity-80")}>
        {body}
      </Typography>
      {children ? <div className="mt-auto pt-4">{children}</div> : null}
    </div>
  );
}

function Rejoin() {
  // One link across a crash: live, a gap, live again. Pure CSS shapes.
  return (
    <div aria-hidden className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="bg-brand-mark-foreground h-1.5 flex-[3] rounded-full" />
        <span className="border-brand-mark-foreground/40 h-1.5 flex-[1.2] rounded-full border border-dashed" />
        <span className="bg-brand-mark-foreground h-1.5 flex-[2] rounded-full" />
      </div>
      <div className="flex justify-between font-mono text-[11px] opacity-80">
        <span>live</span>
        <span>laptop died</span>
        <span>same link</span>
      </div>
    </div>
  );
}

function Shortcuts() {
  return (
    <div aria-hidden className="flex flex-wrap items-center gap-2">
      {[
        ["⌘", "P"],
        ["Follow"],
      ].map((keys) => (
        <span key={keys.join("")} className="flex items-center gap-1">
          {keys.map((key) => (
            <kbd
              key={key}
              className="border-rail bg-muted font-body grid h-8 min-w-8 place-items-center rounded-md border border-b-2 px-2 text-sm font-medium"
            >
              {key}
            </kbd>
          ))}
        </span>
      ))}
    </div>
  );
}

function SelfHost() {
  return (
    <div className="flex flex-col gap-3">
      <pre
        translate="no"
        className="border-rail bg-muted/50 overflow-x-auto rounded-lg border p-4 font-mono text-[12.5px] leading-relaxed"
      >
        <code>
          DATABASE_URL=postgres://…{"\n"}
          <span className="text-muted-foreground">REDIS_URL=     # optional</span>
        </code>
      </pre>
      <Link
        href="/docs#self-hosting"
        className="font-body group text-foreground focus-visible:ring-ring/50 inline-flex w-fit items-center gap-1 rounded-sm text-sm font-medium underline decoration-[var(--rail)] underline-offset-4 outline-none transition-colors hover:decoration-current focus-visible:ring-[3px]"
      >
        Self-hosting guide
        <ArrowUpRightIcon className="size-3.5 transition-transform duration-150 group-hover:translate-x-px group-hover:-translate-y-px" strokeWidth={1.75} />
      </Link>
    </div>
  );
}

export function Features() {
  return (
    <Section id="features" bleed>
      <div className={cn(INSET, "pt-16 pb-10 sm:pt-20 sm:pb-12 lg:pt-24 lg:pb-14")}>
        <SectionHeader
          eyebrow="04 / Details"
          title={<Typography variant="h2">Small tool, sharp edges filed off.</Typography>}
          lead={
            <Typography variant="lead" tone="muted">
              The parts you notice after a week of using it.
            </Typography>
          }
        />
      </div>

      <div className="border-rail grid grid-cols-1 gap-px border-t bg-[var(--rail)] md:grid-cols-6">
        <Cell
          tag="biga.json"
          title="One command, every project."
          body="List folders in a biga.json, or pass several on the command line. Each gets its own session and its own link."
          className="md:col-span-4"
        >
          <WorkspaceDiagram />
        </Cell>
        <Cell
          tag="rejoin"
          title="Same link after a crash."
          body="Run biga start again in the same folder. It rejoins the session and uploads only what changed."
          className="md:col-span-2"
          filled
        >
          <Rejoin />
        </Cell>
        <Cell
          tag="history"
          title="Step back through every save."
          body="Viewers scrub the checkpoint timeline and open the diff for any file."
          className="md:col-span-2"
        >
          <FeatureTimeline />
        </Cell>
        <Cell
          tag="viewer"
          title="Built for reading."
          body="Quick open with ⌘P, syntax highlighting, and Follow, which opens each file as it's saved."
          className="md:col-span-2"
        >
          <Shortcuts />
        </Cell>
        <Cell
          tag="self-host"
          title="Run it yourself."
          body="One Next.js app on Postgres. Redis is optional, for fan-out across instances. MIT licensed."
          className="md:col-span-2"
        >
          <SelfHost />
        </Cell>
      </div>
    </Section>
  );
}
