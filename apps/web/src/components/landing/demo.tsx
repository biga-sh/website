import Link from "next/link";

import { DemoTerminal } from "@/components/landing/demo-terminal";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import { CONTAINER } from "@/components/landing/site-chrome";
import { ViewerFrame } from "@/components/landing/viewer-frame";
import { cn } from "@/lib/utils";

export function Demo({
  siteUrl,
  sessionPath,
  shareUrl,
}: {
  siteUrl: string;
  sessionPath: string;
  shareUrl: string;
}) {
  return (
    <section id="viewer" className={cn(CONTAINER, "py-16 md:py-24")}>
      <SectionHeading
        title="See what your viewers see."
        lead="On the left, a run of spire start against this repository. On the right, the actual viewer it opens."
      />

      <Reveal delay={60} className="mt-10 grid grid-cols-1 gap-4 md:mt-12 lg:grid-cols-2">
        <div className="h-72 sm:h-80 lg:h-[26rem] xl:h-[32rem]">
          <DemoTerminal siteUrl={siteUrl} shareUrl={shareUrl} />
        </div>
        <div className="border-border/70 bg-muted/50 overflow-hidden rounded-2xl border p-1.5 shadow-[0_1px_1px_oklch(0_0_0_/_0.03),0_28px_70px_-48px_oklch(0_0_0_/_0.28)] dark:shadow-[0_1px_1px_oklch(0_0_0_/_0.2),0_28px_70px_-48px_oklch(0_0_0_/_0.75)]">
          <div className="border-border/50 h-72 overflow-hidden rounded-lg border shadow-[inset_0_1px_0_oklch(1_0_0_/_0.7)] sm:h-80 lg:h-[26rem] xl:h-[32rem] dark:shadow-[inset_0_1px_0_oklch(1_0_0_/_0.05)]">
            <ViewerFrame
              src={`${sessionPath}?embed=1`}
              title="Spire session viewer, showing a recorded broadcast of the Spire repository"
            />
          </div>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <p className="text-muted-foreground mt-4 text-xs">
          The terminal is a labelled re-enactment. The viewer is a finished broadcast of this repository.{" "}
          <Link
            href={sessionPath}
            className="hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Open it full screen
          </Link>
          .
        </p>
      </Reveal>
    </section>
  );
}
