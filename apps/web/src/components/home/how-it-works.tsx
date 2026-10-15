import { RunDemo } from "@/components/home/run-demo";
import { Section, SectionHeader } from "@/components/site/frame";
import { Typography } from "@/components/ui/typography";

export function HowItWorks({ siteUrl }: { siteUrl: string }) {
  return (
    <Section id="how" stage>
      <SectionHeader
        eyebrow="01 / How it works"
        title={<Typography variant="h2">Run it, share it, keep coding.</Typography>}
        lead={
          <Typography variant="lead" tone="muted">
            A whole session, start to rejoin, in under a minute. Reach in and it steps aside so you can drive.
          </Typography>
        }
      />
      <div className="mt-10 sm:mt-12">
        <RunDemo host={new URL(siteUrl).host} />
      </div>
    </Section>
  );
}
