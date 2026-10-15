import Link from "next/link";

import { ArchitectureDiagram } from "@/components/landing/architecture-diagram";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import { CONTAINER } from "@/components/landing/site-chrome";
import { SPEC_GROUPS } from "@/lib/landing-demo";
import { cn } from "@/lib/utils";

const SELF_HOST_SNIPPET = `DATABASE_URL=postgres://...
REDIS_URL=              # optional, cross-instance fan-out
CRON_SECRET=            # protects /api/cron/cleanup`;

export function UnderTheHood() {
  return (
    <section id="under-the-hood" className={cn(CONTAINER, "py-16 md:py-24")}>
      <SectionHeading
        title="Run it yourself."
        lead="Spire is one Next.js app backed by Postgres, with Redis as an optional cross-instance bridge. MIT licensed."
      />

      <Reveal delay={60} className="mt-10 md:mt-12">
        <ArchitectureDiagram />
      </Reveal>

      <div className="border-border/70 mt-14 grid grid-cols-1 gap-10 border-t pt-10 sm:grid-cols-3 md:mt-16 md:pt-12">
        {SPEC_GROUPS.map((group, groupIndex) => (
          <Reveal key={group.title} delay={groupIndex * 50}>
            <h3 className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">{group.title}</h3>
            <dl className="mt-4 space-y-3">
              {group.specs.map((spec) => (
                <div key={spec.label}>
                  <dt className="text-foreground text-sm font-medium">{spec.label}</dt>
                  <dd className="text-muted-foreground mt-0.5 text-sm">
                    <span className="font-mono tabular-nums">{spec.value}</span>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono text-xs">{spec.note}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        ))}
      </div>

      <Reveal delay={150} className="border-border/70 mt-12 border-t pt-10 md:mt-16 md:pt-12">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
          <pre className="border-border/70 bg-muted/50 overflow-x-auto rounded-2xl border p-5 font-mono text-xs leading-relaxed">
            {SELF_HOST_SNIPPET}
          </pre>
          <Link
            href="/docs#self-hosting"
            className="text-foreground hover:text-spire focus-visible:ring-ring/50 inline-flex h-fit shrink-0 items-center rounded-full px-1 text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
          >
            Self-hosting docs
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
