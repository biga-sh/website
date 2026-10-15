import { ArrowRightIcon } from "lucide-react";

import { InstallCommand } from "@/components/landing/copy-command";
import { HeroDiagram } from "@/components/landing/hero-diagram";
import { NavAnchor } from "@/components/landing/nav-anchor";
import { Reveal } from "@/components/landing/reveal";
import { CONTAINER } from "@/components/landing/site-chrome";
import { cn } from "@/lib/utils";

export function Hero({ siteUrl }: { siteUrl: string }) {
  return (
    <section className={cn(CONTAINER, "pt-10 pb-20 md:pt-16 md:pb-28")}>
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.75fr)] lg:gap-10">
        <div className="spire-rise">
          <h1 className="max-w-[16ch] text-display text-balance">
            Stream your saves, not your screen.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-[46ch] text-base leading-relaxed text-pretty sm:text-lg">
            One command turns a project folder into a live, read-only link. For
            teaching, pairing, and building in public.
          </p>

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-end">
            <InstallCommand siteUrl={siteUrl} />
            <NavAnchor
              section="viewer"
              className="group text-muted-foreground hover:text-foreground flex h-12 cursor-pointer items-center gap-2 text-sm font-medium transition-colors"
            >
              Watch the demo
              <ArrowRightIcon
                className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                strokeWidth={1.5}
              />
            </NavAnchor>
          </div>
        </div>

        <Reveal delay={120} className="lg:justify-self-end">
          <HeroDiagram />
        </Reveal>
      </div>
    </section>
  );
}
