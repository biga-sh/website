import { Reveal } from "@/components/home/reveal";
import { Section } from "@/components/site/frame";
import { Mark, Typography } from "@/components/ui/typography";

/** The one-line pitch, set large, with the highlighter drawing across the payoff. */
export function Statement() {
  return (
    <Section columnClassName="py-14 sm:py-20 lg:py-24">
      <Reveal>
        <Typography variant="statement" className="max-w-[30ch]">
          A screen share sends pixels. biga sends{" "}
          <Mark draw>the files themselves</Mark>, so viewers can select, search and scroll at their own pace.
        </Typography>
      </Reveal>
    </Section>
  );
}
