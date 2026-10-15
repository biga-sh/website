import { BoundaryDiagram } from "@/components/landing/boundary-diagram";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import { CONTAINER } from "@/components/landing/site-chrome";
import { cn } from "@/lib/utils";

export function Privacy() {
  return (
    <section id="features" className={cn(CONTAINER, "py-16 md:py-24")}>
      <SectionHeading
        title="Your .env stays on your machine."
        lead="node_modules, .git and .env files are ignored by default. Binaries are listed by size and hash, but their bytes never leave. Nothing over 2 MB is read, and there is no write path back to your tree."
      />

      <Reveal delay={60} className="mt-10 md:mt-12">
        <BoundaryDiagram />
      </Reveal>
    </section>
  );
}
