import { CheckpointExplorer } from "@/components/landing/checkpoint-explorer";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import { CONTAINER } from "@/components/landing/site-chrome";
import { cn } from "@/lib/utils";

export function Checkpoints() {
  return (
    <section id="checkpoints" className={cn(CONTAINER, "py-16 md:py-24")}>
      <SectionHeading
        title="Every save becomes a checkpoint."
        lead="Spire hashes each file with SHA-256. A save that changes nothing produces no checkpoint entry. Step through this repository's own history below."
      />

      <Reveal delay={60} className="mt-10 md:mt-12">
        <CheckpointExplorer />
      </Reveal>
    </section>
  );
}
